"""
Analysis engine: orchestrates all detectors and produces a composite analysis.

Flow:
1. Load match data, player stats, events, snapshots.
2. Run feature extraction (lanes, roles, fights).
3. Load the appropriate baseline.
4. Build a DetectorContext.
5. Run all registered detectors.
6. Aggregate findings into a MatchAnalysis with overall score.
"""

import logging
from typing import Type

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analysis.baselines import get_baseline, mmr_to_bracket
from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding
from app.analysis.detectors.deaths import DeathContextDetector
from app.analysis.detectors.draft import DraftAnalysisDetector
from app.analysis.detectors.farming import FarmingDetector
from app.analysis.detectors.items import ItemTimingDetector
from app.analysis.detectors.objectives import ObjectiveConversionDetector
from app.analysis.detectors.team import TeamAnalysisDetector
from app.analysis.detectors.vision import VisionDetector
from app.analysis.features.extractor import extract_player_states
from app.analysis.features.fights import detect_teamfights
from app.analysis.features.lanes import infer_lanes
from app.analysis.features.roles import classify_roles
from app.models.analysis import AnalysisFinding, MatchAnalysis
from app.models.event import ParsedEvent, PlayerStateSnapshot
from app.models.match import Match, MatchPlayer

logger = logging.getLogger(__name__)

# Registry of all available detectors
DETECTOR_CLASSES: list[Type[BaseDetector]] = [
    FarmingDetector,
    DeathContextDetector,
    ItemTimingDetector,
    VisionDetector,
    ObjectiveConversionDetector,
    DraftAnalysisDetector,
    TeamAnalysisDetector,
]


async def analyze_match(
    match_id: int,
    steam_id: int,
    session: AsyncSession,
) -> MatchAnalysis | None:
    """
    Run the full analysis pipeline for a player in a match.

    Returns the persisted MatchAnalysis, or None if analysis is not possible.
    """
    # Idempotency check
    existing = await session.execute(
        select(MatchAnalysis).where(
            MatchAnalysis.match_id == match_id,
            MatchAnalysis.steam_id == steam_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        logger.info("Analysis already exists for match %s / user %s", match_id, steam_id)
        return existing.scalar_one_or_none()

    # Load match
    match_result = await session.execute(
        select(Match).where(Match.match_id == match_id)
    )
    match = match_result.scalar_one_or_none()
    if match is None:
        logger.error("Match %s not found", match_id)
        return None

    # Load players
    players_result = await session.execute(
        select(MatchPlayer).where(MatchPlayer.match_id == match_id)
    )
    all_players = players_result.scalars().all()
    all_players_dicts = [
        {
            "player_slot": p.player_slot,
            "steam_id": p.steam_id,
            "hero_id": p.hero_id,
            "kills": p.kills,
            "deaths": p.deaths,
            "assists": p.assists,
            "gpm": p.gpm,
            "xpm": p.xpm,
            "last_hits": p.last_hits,
            "denies": p.denies,
            "hero_damage": p.hero_damage,
            "tower_damage": p.tower_damage,
            "hero_healing": p.hero_healing,
            "level": p.level,
            "items": p.items,
            "lane": p.lane,
            "role": p.role,
        }
        for p in all_players
    ]

    # Find the target player
    target_player = None
    for p in all_players:
        if p.steam_id == steam_id:
            target_player = p
            break

    if target_player is None:
        logger.warning("Player %s not found in match %s", steam_id, match_id)
        return None

    # Load parsed events
    events_result = await session.execute(
        select(ParsedEvent)
        .where(ParsedEvent.match_id == match_id)
        .order_by(ParsedEvent.game_time_secs)
    )
    events = [
        {
            "tick": e.tick,
            "game_time_secs": e.game_time_secs,
            "event_type": e.event_type,
            "player_slot": e.player_slot,
            "data": e.data,
        }
        for e in events_result.scalars().all()
    ]

    # Generate or load player state snapshots
    snap_result = await session.execute(
        select(PlayerStateSnapshot)
        .where(PlayerStateSnapshot.match_id == match_id)
        .order_by(PlayerStateSnapshot.game_time_secs)
    )
    snapshots_raw = snap_result.scalars().all()

    if not snapshots_raw and events:
        # Generate snapshots from events
        snapshot_dicts = extract_player_states(match_id, events, match.duration_secs)
        # Store them
        for sd in snapshot_dicts:
            session.add(PlayerStateSnapshot(**sd))
        await session.flush()
    else:
        snapshot_dicts = [
            {
                "match_id": s.match_id,
                "player_slot": s.player_slot,
                "game_time_secs": s.game_time_secs,
                "x": s.x,
                "y": s.y,
                "gold": s.gold,
                "xp": s.xp,
                "level": s.level,
                "hp": s.hp,
                "mana": s.mana,
                "items": s.items,
            }
            for s in snapshots_raw
        ]

    # Feature extraction
    lane_assignments = infer_lanes(snapshot_dicts, all_players_dicts)
    role_assignments = classify_roles(lane_assignments, all_players_dicts, snapshot_dicts)
    teamfights = detect_teamfights(events)
    teamfight_dicts = [f.to_dict() for f in teamfights]

    # Update player lanes and roles in DB
    for p in all_players:
        p.lane = lane_assignments.get(p.player_slot)
        p.role = role_assignments.get(p.player_slot)
    await session.flush()

    # Load baseline
    player_slot = target_player.player_slot
    hero_id = target_player.hero_id
    role = role_assignments.get(player_slot, 5)
    mmr_bracket = mmr_to_bracket(match.avg_mmr)

    baseline = await get_baseline(
        session, hero_id, role, match.patch_id, mmr_bracket
    )

    # Build detector context
    is_radiant = player_slot < 5
    won = match.radiant_win if is_radiant else not match.radiant_win

    target_stats = next(
        (d for d in all_players_dicts if d["player_slot"] == player_slot), {}
    )

    ctx = DetectorContext(
        match_id=match_id,
        steam_id=steam_id,
        player_slot=player_slot,
        hero_id=hero_id,
        role=role,
        lane=lane_assignments.get(player_slot),
        duration_secs=match.duration_secs,
        is_radiant=is_radiant,
        won=won,
        player_stats=target_stats,
        baseline=baseline,
        events=events,
        snapshots=snapshot_dicts,
        all_players=all_players_dicts,
        teamfights=teamfight_dicts,
    )

    # Run all detectors
    all_findings: list[Finding] = []
    for detector_cls in DETECTOR_CLASSES:
        detector = detector_cls()
        try:
            detector_findings = detector.analyze(ctx)
            all_findings.extend(detector_findings)
        except Exception as e:
            logger.error(
                "Detector %s failed for match %s: %s",
                detector.name, match_id, e,
            )

    # Compute overall score (0-100)
    overall_score = _compute_overall_score(all_findings, won)

    # Build summary
    summary = _build_summary(all_findings, won, hero_id, role)

    # Persist analysis
    analysis = MatchAnalysis(
        match_id=match_id,
        steam_id=steam_id,
        overall_score=overall_score,
        summary=summary,
        patch_id=match.patch_id,
    )
    session.add(analysis)
    await session.flush()

    # Persist findings
    for f in all_findings:
        finding = AnalysisFinding(
            analysis_id=analysis.id,
            detector_name=f.detector_name,
            category=f.category,
            severity=f.severity,
            confidence=f.confidence,
            title=f.title,
            description=f.description,
            game_time_secs=f.game_time_secs,
            data=f.data,
        )
        session.add(finding)

    await session.flush()

    logger.info(
        "Analysis complete for match %s / user %s: score=%.1f, findings=%d",
        match_id, steam_id, overall_score, len(all_findings),
    )
    return analysis


def _compute_overall_score(findings: list[Finding], won: bool) -> float:
    """
    Compute a composite 0-100 score based on findings.

    Starts at 50 (neutral), adjusted up/down by findings.
    Win adds a bonus.
    """
    score = 50.0

    for f in findings:
        weight = f.confidence
        if f.severity == "critical":
            score -= 8 * weight
        elif f.severity == "warning":
            score -= 4 * weight
        elif f.severity == "info":
            # Positive findings (above average) increase score
            if any(keyword in f.title.lower() for keyword in ["above", "fast", "strong", "active", "deathless", "good"]):
                score += 5 * weight

    # Win bonus
    if won:
        score += 10

    return max(0.0, min(100.0, score))


def _build_summary(
    findings: list[Finding], won: bool, hero_id: int, role: int | None
) -> str:
    """Build a natural-language summary from findings."""
    outcome = "Victory" if won else "Defeat"
    role_name = {1: "Carry", 2: "Mid", 3: "Offlane", 4: "Soft Support", 5: "Hard Support"}.get(
        role, "Unknown"
    )

    critical = [f for f in findings if f.severity == "critical"]
    warnings = [f for f in findings if f.severity == "warning"]
    positives = [f for f in findings if f.severity == "info"]

    parts = [f"{outcome} as {role_name} (Hero ID {hero_id})."]

    if critical:
        parts.append(f"{len(critical)} critical issue(s) identified.")
    if warnings:
        parts.append(f"{len(warnings)} area(s) for improvement.")
    if positives:
        parts.append(f"{len(positives)} positive observation(s).")

    if not critical and not warnings:
        parts.append("Solid performance overall.")

    return " ".join(parts)
