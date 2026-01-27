"""
Replay download and parse pipeline.

Downloads replay files from Valve's servers, parses them with clarity,
and stores the resulting events in the database.
"""

import asyncio
import bz2
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session_factory
from app.models.event import ParsedEvent
from app.models.match import Match, ReplayFile
from app.parser.clarity_runner import ClarityParseError, parse_replay
from app.parser.event_mapper import map_all_events
from app.services.opendota_api import OpenDotaClient

logger = logging.getLogger(__name__)


async def download_replay(match_id: int, session: AsyncSession) -> str | None:
    """
    Download the replay file for a match.

    Returns the path to the downloaded .dem file, or None if unavailable.
    """
    # Check if already downloaded
    result = await session.execute(
        select(ReplayFile).where(ReplayFile.match_id == match_id)
    )
    existing = result.scalar_one_or_none()
    if existing and Path(existing.file_path).exists():
        logger.info("Replay for match %s already downloaded", match_id)
        return existing.file_path

    # Check if match has a replay URL stored
    match_result = await session.execute(
        select(Match).where(Match.match_id == match_id)
    )
    match = match_result.scalar_one_or_none()
    if match is None:
        logger.error("Match %s not found in database", match_id)
        return None

    replay_url = match.replay_url

    # If no URL stored, try OpenDota
    if not replay_url:
        client = OpenDotaClient()
        replay_url = await client.get_replay_url(match_id)
        if replay_url:
            match.replay_url = replay_url
            await session.flush()

    if not replay_url:
        logger.warning("No replay URL available for match %s", match_id)
        match.replay_state = "failed"
        await session.flush()
        return None

    # Download the replay
    storage_path = Path(settings.replay_storage_path)
    storage_path.mkdir(parents=True, exist_ok=True)

    dem_path = storage_path / f"{match_id}.dem"
    is_compressed = replay_url.endswith(".bz2")
    download_path = storage_path / f"{match_id}.dem.bz2" if is_compressed else dem_path

    logger.info("Downloading replay for match %s from %s", match_id, replay_url)

    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as http:
            resp = await http.get(replay_url)
            if resp.status_code != 200:
                logger.error(
                    "Failed to download replay for match %s: HTTP %s",
                    match_id,
                    resp.status_code,
                )
                match.replay_state = "failed"
                await session.flush()
                return None

            with open(download_path, "wb") as f:
                f.write(resp.content)
    except httpx.HTTPError as e:
        logger.error("HTTP error downloading replay %s: %s", match_id, e)
        match.replay_state = "failed"
        await session.flush()
        return None

    # Decompress if needed
    if is_compressed:
        try:
            with open(download_path, "rb") as compressed:
                with open(dem_path, "wb") as decompressed:
                    decompressed.write(bz2.decompress(compressed.read()))
            os.remove(download_path)
        except Exception as e:
            logger.error("Failed to decompress replay %s: %s", match_id, e)
            match.replay_state = "failed"
            await session.flush()
            return None

    # Record in DB
    file_size = dem_path.stat().st_size
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=settings.replay_retention_days)

    replay_file = ReplayFile(
        match_id=match_id,
        file_path=str(dem_path),
        file_size_bytes=file_size,
        downloaded_at=now,
        expires_at=expires_at,
    )

    # Merge in case it already exists
    await session.merge(replay_file)
    match.replay_state = "downloaded"
    await session.flush()

    logger.info("Downloaded replay for match %s (%d bytes)", match_id, file_size)
    return str(dem_path)


async def parse_and_store_events(match_id: int, replay_path: str, session: AsyncSession) -> int:
    """
    Parse a replay file and store the events in the database.

    Returns the number of events stored.
    """
    # Idempotency: check if events already exist
    result = await session.execute(
        select(ParsedEvent).where(ParsedEvent.match_id == match_id).limit(1)
    )
    if result.scalar_one_or_none() is not None:
        logger.info("Events for match %s already parsed", match_id)
        return 0

    try:
        raw_events = parse_replay(replay_path)
    except ClarityParseError as e:
        logger.error("Failed to parse replay for match %s: %s", match_id, e)
        match_result = await session.execute(
            select(Match).where(Match.match_id == match_id)
        )
        match = match_result.scalar_one_or_none()
        if match:
            match.replay_state = "failed"
            await session.flush()
        return 0

    mapped_events = map_all_events(raw_events)

    # Batch insert events
    event_objects = []
    for evt in mapped_events:
        event_objects.append(
            ParsedEvent(
                match_id=match_id,
                tick=evt["tick"],
                game_time_secs=evt["game_time_secs"],
                event_type=evt["event_type"],
                player_slot=evt["player_slot"],
                data=evt["data"],
            )
        )

    session.add_all(event_objects)

    # Update match state
    match_result = await session.execute(
        select(Match).where(Match.match_id == match_id)
    )
    match = match_result.scalar_one_or_none()
    if match:
        match.replay_state = "parsed"

    await session.flush()
    logger.info("Stored %d events for match %s", len(event_objects), match_id)
    return len(event_objects)


async def download_and_parse(match_id: int) -> dict:
    """Full pipeline: download replay → parse → store events."""
    async with async_session_factory() as session:
        replay_path = await download_replay(match_id, session)
        if replay_path is None:
            await session.commit()
            return {"match_id": match_id, "status": "no_replay", "events": 0}

        event_count = await parse_and_store_events(match_id, replay_path, session)
        await session.commit()
        return {"match_id": match_id, "status": "parsed", "events": event_count}


async def cleanup_replays() -> int:
    """Remove expired replay files from disk and database."""
    now = datetime.now(timezone.utc)
    count = 0

    async with async_session_factory() as session:
        result = await session.execute(
            select(ReplayFile).where(ReplayFile.expires_at < now)
        )
        expired = result.scalars().all()

        for rf in expired:
            path = Path(rf.file_path)
            if path.exists():
                try:
                    path.unlink()
                    logger.info("Deleted expired replay: %s", path)
                except OSError as e:
                    logger.warning("Failed to delete %s: %s", path, e)

            await session.execute(
                delete(ReplayFile).where(ReplayFile.match_id == rf.match_id)
            )
            count += 1

        await session.commit()

    logger.info("Cleaned up %d expired replays", count)
    return count


def run_download_and_parse(match_id: int) -> dict:
    """Synchronous wrapper for Celery."""
    return asyncio.get_event_loop().run_until_complete(download_and_parse(match_id))


def run_cleanup_replays() -> int:
    """Synchronous wrapper for Celery."""
    return asyncio.get_event_loop().run_until_complete(cleanup_replays())
