import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.database import get_db
from app.models.analysis import AnalysisFinding, MatchAnalysis
from app.models.event import ParsedEvent
from app.models.match import Match, MatchPlayer
from app.models.user import User
from app.schemas.analysis import FindingOut, MatchAnalysisOut
from app.schemas.match import (
    EventOut,
    MatchDetailOut,
    MatchListOut,
    MatchOut,
    MatchPlayerOut,
    TaskStatusOut,
    TimelineOut,
)
from app.workers.tasks import (
    analyze_match_for_user,
    download_and_parse_replay,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=MatchListOut)
async def list_matches(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's matches, newest first."""
    steam_id = current_user.steam_id

    # Count total matches for this user
    count_q = (
        select(func.count())
        .select_from(MatchPlayer)
        .where(MatchPlayer.steam_id == steam_id)
    )
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Fetch match IDs and player info for this user
    match_player_q = (
        select(MatchPlayer.match_id, MatchPlayer.hero_id, MatchPlayer.player_slot)
        .where(MatchPlayer.steam_id == steam_id)
        .join(Match, Match.match_id == MatchPlayer.match_id)
        .order_by(Match.start_time.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    match_player_result = await db.execute(match_player_q)
    player_info = {row[0]: (row[1], row[2]) for row in match_player_result.all()}

    if not player_info:
        return MatchListOut(matches=[], total=total, page=page, per_page=per_page)

    # Load full match data
    matches_q = (
        select(Match)
        .where(Match.match_id.in_(player_info.keys()))
        .order_by(Match.start_time.desc())
    )
    matches_result = await db.execute(matches_q)
    matches = matches_result.scalars().all()

    # Build response with player-specific data
    match_list = []
    for m in matches:
        hero_id, player_slot = player_info[m.match_id]
        is_radiant = player_slot < 128
        player_won = m.radiant_win if is_radiant else not m.radiant_win
        match_data = MatchOut.model_validate(m)
        match_data.player_hero_id = hero_id
        match_data.player_won = player_won
        match_list.append(match_data)

    return MatchListOut(
        matches=match_list,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("/refresh", response_model=TaskStatusOut)
async def refresh_matches(
    current_user: User = Depends(get_current_user),
):
    """Fetch the user's recent matches from Steam."""
    from app.services.steam_api import SteamAPIError
    from app.workers.ingestion import fetch_and_store_matches

    try:
        match_ids = await fetch_and_store_matches(current_user.steam_id)
    except SteamAPIError as exc:
        raise HTTPException(
            status_code=exc.status_code or 502,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch matches from Steam: {exc}",
        )

    return TaskStatusOut(
        task_id=uuid.uuid4().hex,
        status="completed",
        result={"new_matches": len(match_ids), "match_ids": match_ids},
    )


@router.get("/{match_id}", response_model=MatchDetailOut)
async def get_match(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed match info including all players."""
    result = await db.execute(
        select(Match)
        .where(Match.match_id == match_id)
        .options(selectinload(Match.players))
    )
    match = result.scalar_one_or_none()

    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    match_dict = {
        "match_id": match.match_id,
        "patch_id": match.patch_id,
        "game_mode": match.game_mode,
        "lobby_type": match.lobby_type,
        "duration_secs": match.duration_secs,
        "start_time": match.start_time,
        "radiant_win": match.radiant_win,
        "avg_mmr": match.avg_mmr,
        "replay_state": match.replay_state,
        "created_at": match.created_at,
        "players": [MatchPlayerOut.model_validate(p) for p in match.players],
    }

    return MatchDetailOut(**match_dict)


@router.get("/{match_id}/timeline", response_model=TimelineOut)
async def get_timeline(
    match_id: int,
    event_type: str | None = Query(None, description="Filter by event type"),
    limit: int = Query(1000, ge=1, le=10000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the parsed event timeline for a match."""
    query = (
        select(ParsedEvent)
        .where(ParsedEvent.match_id == match_id)
        .order_by(ParsedEvent.game_time_secs)
        .limit(limit)
    )

    if event_type:
        query = query.where(ParsedEvent.event_type == event_type)

    result = await db.execute(query)
    events = result.scalars().all()

    # Get total count
    count_q = select(func.count()).select_from(ParsedEvent).where(
        ParsedEvent.match_id == match_id
    )
    count_result = await db.execute(count_q)
    total = count_result.scalar() or 0

    return TimelineOut(
        match_id=match_id,
        events=[EventOut.model_validate(e) for e in events],
        total_events=total,
    )


@router.get("/{match_id}/analysis", response_model=MatchAnalysisOut | None)
async def get_analysis(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the analysis results for the current user in a match."""
    result = await db.execute(
        select(MatchAnalysis)
        .where(
            MatchAnalysis.match_id == match_id,
            MatchAnalysis.steam_id == current_user.steam_id,
        )
        .options(selectinload(MatchAnalysis.findings))
    )
    analysis = result.scalar_one_or_none()

    if analysis is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis found. Trigger analysis with POST /api/matches/{id}/analyze",
        )

    return MatchAnalysisOut.model_validate(analysis)


@router.post("/{match_id}/analyze", response_model=TaskStatusOut)
async def trigger_analysis(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger the full analysis pipeline for a match.

    This will:
    1. Download the replay (if not cached).
    2. Parse the replay into events.
    3. Run all analysis detectors.
    """
    # Verify the match exists
    result = await db.execute(
        select(Match).where(Match.match_id == match_id)
    )
    match = result.scalar_one_or_none()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")

    try:
        # Chain: download/parse → analyze
        chain = (
            download_and_parse_replay.si(match_id)
            | analyze_match_for_user.si(match_id, current_user.steam_id)
        )
        task = chain.apply_async()
        return TaskStatusOut(task_id=task.id, status="queued")
    except Exception:
        # Celery/Redis unavailable — run analysis inline (skip replay download)
        logger.warning("Celery unavailable, running analysis inline")
        from app.analysis.engine import analyze_match

        try:
            analysis = await analyze_match(match_id, current_user.steam_id, db)
            await db.commit()

            if analysis is None:
                result = {
                    "match_id": match_id,
                    "steam_id": current_user.steam_id,
                    "status": "skipped",
                    "reason": "Analysis not possible (missing data or already exists)",
                }
            else:
                # Query findings count to avoid lazy-load issues in async context
                findings_count_result = await db.execute(
                    select(func.count())
                    .select_from(AnalysisFinding)
                    .where(AnalysisFinding.analysis_id == analysis.id)
                )
                findings_count = findings_count_result.scalar() or 0

                result = {
                    "match_id": match_id,
                    "steam_id": current_user.steam_id,
                    "status": "completed",
                    "analysis_id": analysis.id,
                    "overall_score": analysis.overall_score,
                    "findings_count": findings_count,
                }

            return TaskStatusOut(
                task_id=uuid.uuid4().hex,
                status="completed",
                result=result,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {exc}",
            )
