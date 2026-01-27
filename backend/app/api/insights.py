from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.analysis import AnalysisFinding, MatchAnalysis
from app.models.match import Match, MatchPlayer
from app.models.user import User
from app.schemas.analysis import AggregateInsights, FindingOut, HeroPerformance

router = APIRouter()


@router.get("", response_model=AggregateInsights)
async def get_aggregate_insights(
    hero_id: int | None = Query(None, description="Filter by hero"),
    role: int | None = Query(None, description="Filter by role (1-5)"),
    last_n: int = Query(50, ge=1, le=500, description="Number of recent matches"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get aggregate performance insights across recent matches.

    Emphasizes patterns over single-match analysis.
    """
    steam_id = current_user.steam_id

    # Build base query for this user's match players
    base_q = (
        select(MatchPlayer)
        .where(MatchPlayer.steam_id == steam_id)
        .join(Match, Match.match_id == MatchPlayer.match_id)
        .order_by(Match.start_time.desc())
        .limit(last_n)
    )

    if hero_id is not None:
        base_q = base_q.where(MatchPlayer.hero_id == hero_id)
    if role is not None:
        base_q = base_q.where(MatchPlayer.role == role)

    result = await db.execute(base_q)
    player_rows = result.scalars().all()

    if not player_rows:
        return AggregateInsights(
            total_matches=0,
            total_wins=0,
            total_losses=0,
            win_rate=0.0,
            most_played_heroes=[],
        )

    # Load match data for win/loss
    match_ids = [p.match_id for p in player_rows]
    matches_result = await db.execute(
        select(Match).where(Match.match_id.in_(match_ids))
    )
    matches_by_id = {m.match_id: m for m in matches_result.scalars().all()}

    total_wins = 0
    total_losses = 0

    for p in player_rows:
        match = matches_by_id.get(p.match_id)
        if match is None:
            continue
        is_radiant = p.player_slot < 5
        won = match.radiant_win if is_radiant else not match.radiant_win
        if won:
            total_wins += 1
        else:
            total_losses += 1

    total_matches = total_wins + total_losses
    win_rate = total_wins / max(1, total_matches)

    # Per-hero aggregation
    hero_stats: dict[int, dict] = {}
    for p in player_rows:
        hid = p.hero_id
        if hid not in hero_stats:
            hero_stats[hid] = {
                "matches_played": 0, "wins": 0, "losses": 0,
                "total_kills": 0, "total_deaths": 0, "total_assists": 0,
                "total_gpm": 0, "total_xpm": 0,
            }
        hs = hero_stats[hid]
        hs["matches_played"] += 1

        match = matches_by_id.get(p.match_id)
        if match:
            is_radiant = p.player_slot < 5
            won = match.radiant_win if is_radiant else not match.radiant_win
            if won:
                hs["wins"] += 1
            else:
                hs["losses"] += 1

        hs["total_kills"] += p.kills or 0
        hs["total_deaths"] += p.deaths or 0
        hs["total_assists"] += p.assists or 0
        hs["total_gpm"] += p.gpm or 0
        hs["total_xpm"] += p.xpm or 0

    most_played = sorted(hero_stats.items(), key=lambda x: x[1]["matches_played"], reverse=True)[:10]

    hero_performances = []
    for hid, hs in most_played:
        n = hs["matches_played"]
        hero_performances.append(HeroPerformance(
            hero_id=hid,
            matches_played=n,
            wins=hs["wins"],
            losses=hs["losses"],
            avg_kills=round(hs["total_kills"] / n, 1),
            avg_deaths=round(hs["total_deaths"] / n, 1),
            avg_assists=round(hs["total_assists"] / n, 1),
            avg_gpm=round(hs["total_gpm"] / n, 0),
            avg_xpm=round(hs["total_xpm"] / n, 0),
        ))

    # Average analysis score
    score_result = await db.execute(
        select(func.avg(MatchAnalysis.overall_score))
        .where(
            MatchAnalysis.steam_id == steam_id,
            MatchAnalysis.match_id.in_(match_ids),
        )
    )
    avg_score = score_result.scalar()

    # Top recurring findings (patterns)
    findings_q = (
        select(
            AnalysisFinding.title,
            AnalysisFinding.category,
            AnalysisFinding.severity,
            AnalysisFinding.detector_name,
            func.count().label("occurrence_count"),
            func.avg(AnalysisFinding.confidence).label("avg_confidence"),
        )
        .join(MatchAnalysis, MatchAnalysis.id == AnalysisFinding.analysis_id)
        .where(
            MatchAnalysis.steam_id == steam_id,
            MatchAnalysis.match_id.in_(match_ids),
        )
        .group_by(
            AnalysisFinding.title,
            AnalysisFinding.category,
            AnalysisFinding.severity,
            AnalysisFinding.detector_name,
        )
        .order_by(func.count().desc())
        .limit(10)
    )
    findings_result = await db.execute(findings_q)
    top_findings = []
    for row in findings_result.all():
        top_findings.append(FindingOut(
            detector_name=row.detector_name,
            category=row.category,
            severity=row.severity,
            confidence=round(float(row.avg_confidence or 0), 2),
            title=row.title,
            description=f"Occurred in {row.occurrence_count} matches",
            data={"occurrence_count": row.occurrence_count},
        ))

    return AggregateInsights(
        total_matches=total_matches,
        total_wins=total_wins,
        total_losses=total_losses,
        win_rate=round(win_rate, 3),
        most_played_heroes=hero_performances,
        avg_overall_score=round(avg_score, 1) if avg_score else None,
        top_findings=top_findings,
    )


@router.get("/heroes", response_model=list[HeroPerformance])
async def get_hero_performance(
    last_n: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get per-hero performance stats for the current user."""
    steam_id = current_user.steam_id

    q = (
        select(
            MatchPlayer.hero_id,
            func.count().label("matches_played"),
            func.sum(MatchPlayer.kills).label("total_kills"),
            func.sum(MatchPlayer.deaths).label("total_deaths"),
            func.sum(MatchPlayer.assists).label("total_assists"),
            func.avg(MatchPlayer.gpm).label("avg_gpm"),
            func.avg(MatchPlayer.xpm).label("avg_xpm"),
        )
        .where(MatchPlayer.steam_id == steam_id)
        .group_by(MatchPlayer.hero_id)
        .order_by(func.count().desc())
        .limit(50)
    )
    result = await db.execute(q)
    rows = result.all()

    # We need win/loss counts per hero — build from match data
    hero_match_ids: dict[int, list[int]] = {}
    for row in rows:
        hero_match_ids[row.hero_id] = []

    # Fetch all relevant match_player rows for win/loss
    mp_result = await db.execute(
        select(MatchPlayer.hero_id, MatchPlayer.match_id, MatchPlayer.player_slot)
        .where(MatchPlayer.steam_id == steam_id)
    )
    mp_rows = mp_result.all()
    for mp in mp_rows:
        if mp.hero_id in hero_match_ids:
            hero_match_ids[mp.hero_id].append((mp.match_id, mp.player_slot))

    all_match_ids = set()
    for pairs in hero_match_ids.values():
        for mid, _ in pairs:
            all_match_ids.add(mid)

    matches_result = await db.execute(
        select(Match.match_id, Match.radiant_win)
        .where(Match.match_id.in_(list(all_match_ids)))
    )
    match_outcomes = {m.match_id: m.radiant_win for m in matches_result.all()}

    performances = []
    for row in rows:
        wins = 0
        losses = 0
        for mid, slot in hero_match_ids.get(row.hero_id, []):
            radiant_win = match_outcomes.get(mid)
            if radiant_win is None:
                continue
            is_radiant = slot < 5 if isinstance(slot, int) else slot < 128
            won = radiant_win if is_radiant else not radiant_win
            if won:
                wins += 1
            else:
                losses += 1

        n = row.matches_played or 1
        performances.append(HeroPerformance(
            hero_id=row.hero_id,
            matches_played=n,
            wins=wins,
            losses=losses,
            avg_kills=round((row.total_kills or 0) / n, 1),
            avg_deaths=round((row.total_deaths or 0) / n, 1),
            avg_assists=round((row.total_assists or 0) / n, 1),
            avg_gpm=round(float(row.avg_gpm or 0), 0),
            avg_xpm=round(float(row.avg_xpm or 0), 0),
        ))

    return performances
