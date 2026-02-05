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
from app.models.event import ParsedEvent, PlayerStateSnapshot
from app.models.match import Match, ReplayFile
from app.parser.clarity_runner import ClarityParseError, parse_replay
from app.parser.event_mapper import map_all_events, normalize_hero_name
from app.services.opendota_api import OpenDotaClient

logger = logging.getLogger(__name__)

TICK_RATE = 30  # Dota 2 uses 30 ticks per second


def _to_tick(game_time_secs: float) -> int:
    try:
        return int(float(game_time_secs) * TICK_RATE)
    except (TypeError, ValueError):
        return 0


def _to_game_time_secs(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _is_list(value) -> bool:
    return isinstance(value, list)


def _opendota_has_parsed_data(match_data: dict) -> bool:
    """
    Heuristic: OpenDota's /matches/{id} returns more fields once a match has been parsed.
    We consider it "parsed" if we see any time-series or log data on at least one player.
    """
    players = match_data.get("players")
    if not isinstance(players, list) or not players:
        return False

    for p in players:
        if not isinstance(p, dict):
            continue
        for key in ("gold_t", "xp_t", "purchase_log", "kills_log", "obs_log", "sen_log"):
            if _is_list(p.get(key)) and len(p.get(key)) > 0:
                return True

    return False


def _normalize_item_key(key: str) -> str:
    key = str(key)
    return key if key.startswith("item_") else f"item_{key}"


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


async def parse_and_store_events_via_opendota(match_id: int, session: AsyncSession) -> int:
    """
    Fallback parser that uses OpenDota's parsed match endpoint instead of local replay parsing.

    This avoids requiring a runnable `clarity.jar` in dev environments.
    """
    # Idempotency: check if events already exist
    result = await session.execute(
        select(ParsedEvent).where(ParsedEvent.match_id == match_id).limit(1)
    )
    if result.scalar_one_or_none() is not None:
        logger.info("Events for match %s already parsed (skipping OpenDota)", match_id)
        return 0

    client = OpenDotaClient()
    try:
        match_data = await client.get_match(match_id)
    except Exception as exc:
        logger.error("OpenDota parse failed for match %s: %s", match_id, exc)
        match_result = await session.execute(select(Match).where(Match.match_id == match_id))
        match = match_result.scalar_one_or_none()
        if match:
            match.replay_state = "failed"
            await session.flush()
        return 0

    if not _opendota_has_parsed_data(match_data):
        # Ask OpenDota to parse and mark as "parsing".
        try:
            await client.request_parse(match_id)
            logger.info("Requested OpenDota parse for match %s", match_id)
        except Exception as exc:
            logger.warning("Failed to request OpenDota parse for %s: %s", match_id, exc)

        match_result = await session.execute(select(Match).where(Match.match_id == match_id))
        match = match_result.scalar_one_or_none()
        if match:
            match.replay_state = "parsing"
            await session.flush()
        return 0

    players = match_data.get("players", [])
    if not isinstance(players, list):
        players = []

    # Store lane hints if available (helps role inference when we don't have per-tick positions)
    slot_to_lane: dict[int, int] = {}
    for p in players:
        if not isinstance(p, dict):
            continue
        slot = p.get("player_slot")
        lane_role = p.get("lane_role")  # OpenDota uses lane_role (1-4) on parsed matches
        if isinstance(slot, int) and isinstance(lane_role, int) and lane_role in (1, 2, 3, 4):
            slot_to_lane[slot] = lane_role

    if slot_to_lane:
        # Update MatchPlayer rows
        from app.models.match import MatchPlayer

        mps_result = await session.execute(
            select(MatchPlayer).where(MatchPlayer.match_id == match_id)
        )
        for mp in mps_result.scalars().all():
            hint = slot_to_lane.get(mp.player_slot)
            if hint:
                mp.lane = hint

    # Build normalized events
    event_objects: list[ParsedEvent] = []

    for p in players:
        if not isinstance(p, dict):
            continue

        slot = p.get("player_slot")
        if not isinstance(slot, int):
            continue

        hero_id = p.get("hero_id")
        hero_label = f"hero_{hero_id}" if isinstance(hero_id, int) else "unknown"

        # Item purchases
        for purchase in p.get("purchase_log", []) if _is_list(p.get("purchase_log")) else []:
            if not isinstance(purchase, dict):
                continue
            t = purchase.get("time")
            key = purchase.get("key")
            if t is None or key is None:
                continue
            gt = _to_game_time_secs(t)
            if gt is None:
                continue

            item = _normalize_item_key(str(key))
            event_objects.append(
                ParsedEvent(
                    match_id=match_id,
                    tick=_to_tick(gt),
                    game_time_secs=gt,
                    event_type="item_purchase",
                    player_slot=slot,
                    data={
                        "raw_type": "opendota_purchase_log",
                        "item": item,
                        "hero": hero_label,
                        "hero_id": hero_id,
                    },
                )
            )

        # Kills (attacker perspective)
        for kill in p.get("kills_log", []) if _is_list(p.get("kills_log")) else []:
            if not isinstance(kill, dict):
                continue
            t = kill.get("time")
            target = kill.get("key")
            if t is None or target is None:
                continue
            gt = _to_game_time_secs(t)
            if gt is None:
                continue

            target_label = normalize_hero_name(str(target)) or str(target)
            event_objects.append(
                ParsedEvent(
                    match_id=match_id,
                    tick=_to_tick(gt),
                    game_time_secs=gt,
                    event_type="kill",
                    player_slot=slot,
                    data={
                        "raw_type": "opendota_kills_log",
                        "attacker": hero_label,
                        "target": target_label,
                        "attacker_illusion": False,
                        "target_illusion": False,
                    },
                )
            )

        # Ward placement logs (if present)
        for ward_type, key_name in (("observer", "obs_log"), ("sentry", "sen_log")):
            ward_log = p.get(key_name)
            if not _is_list(ward_log):
                continue
            for w in ward_log:
                if not isinstance(w, dict):
                    continue
                t = w.get("time")
                if t is None:
                    continue
                gt = _to_game_time_secs(t)
                if gt is None:
                    continue
                event_objects.append(
                    ParsedEvent(
                        match_id=match_id,
                        tick=_to_tick(gt),
                        game_time_secs=gt,
                        event_type="ward_placed",
                        player_slot=slot,
                        data={
                            "raw_type": f"opendota_{key_name}",
                            "ward_type": ward_type,
                            "x": w.get("x"),
                            "y": w.get("y"),
                            "player": hero_label,
                            "hero_id": hero_id,
                        },
                    )
                )

        # Rune pickups (if present)
        runes_log = p.get("runes_log")
        if _is_list(runes_log):
            for r in runes_log:
                if not isinstance(r, dict):
                    continue
                t = r.get("time")
                rune_key = r.get("key")
                if t is None or rune_key is None:
                    continue
                gt = _to_game_time_secs(t)
                if gt is None:
                    continue
                event_objects.append(
                    ParsedEvent(
                        match_id=match_id,
                        tick=_to_tick(gt),
                        game_time_secs=gt,
                        event_type="rune_pickup",
                        player_slot=slot,
                        data={
                            "raw_type": "opendota_runes_log",
                            "rune_type": rune_key,
                            "player": hero_label,
                            "hero_id": hero_id,
                        },
                    )
                )

    # Objectives (towers/rax/roshan) are recorded at match-level
    objectives = match_data.get("objectives")
    if _is_list(objectives):
        for obj in objectives:
            if not isinstance(obj, dict):
                continue
            t = obj.get("time")
            obj_type = obj.get("type")
            if t is None or obj_type is None:
                continue
            gt = _to_game_time_secs(t)
            if gt is None:
                continue
            obj_type_str = str(obj_type)
            obj_type_lower = obj_type_str.lower()

            if "roshan" in obj_type_lower:
                event_type = "roshan_kill"
            elif any(k in obj_type_lower for k in ("tower", "barracks", "building")):
                event_type = "building_kill"
            else:
                continue

            slot = obj.get("slot")
            event_objects.append(
                ParsedEvent(
                    match_id=match_id,
                    tick=_to_tick(gt),
                    game_time_secs=gt,
                    event_type=event_type,
                    player_slot=int(slot) if isinstance(slot, int) else None,
                    data={
                        "raw_type": obj_type_str,
                        "team": obj.get("team"),
                        "key": obj.get("key"),
                    },
                )
            )

    # Batch insert events
    if event_objects:
        session.add_all(event_objects)

    # Snapshots from time series (if present)
    snap_result = await session.execute(
        select(PlayerStateSnapshot).where(PlayerStateSnapshot.match_id == match_id).limit(1)
    )
    has_snaps = snap_result.scalar_one_or_none() is not None
    if not has_snaps:
        match_result = await session.execute(select(Match).where(Match.match_id == match_id))
        match = match_result.scalar_one_or_none()
        duration = match.duration_secs if match else match_data.get("duration", 0)

        snapshot_objects: list[PlayerStateSnapshot] = []
        max_minute = int(max(0, duration) // 60)

        for p in players:
            if not isinstance(p, dict):
                continue
            slot = p.get("player_slot")
            if not isinstance(slot, int):
                continue
            gold_t = p.get("gold_t")
            xp_t = p.get("xp_t")
            if not _is_list(gold_t) or not _is_list(xp_t):
                continue

            n = min(len(gold_t), len(xp_t), max_minute + 1)
            for minute in range(n):
                t = minute * 60
                snapshot_objects.append(
                    PlayerStateSnapshot(
                        match_id=match_id,
                        player_slot=slot,
                        game_time_secs=float(t),
                        x=None,
                        y=None,
                        gold=int(gold_t[minute]) if gold_t[minute] is not None else None,
                        xp=int(xp_t[minute]) if xp_t[minute] is not None else None,
                        level=None,
                        hp=None,
                        mana=None,
                        items=None,
                    )
                )

        if snapshot_objects:
            session.add_all(snapshot_objects)

    # Update match state
    match_result = await session.execute(
        select(Match).where(Match.match_id == match_id)
    )
    match = match_result.scalar_one_or_none()
    if match:
        match.replay_state = "parsed"

    await session.flush()
    logger.info(
        "Stored %d events for match %s via OpenDota",
        len(event_objects),
        match_id,
    )
    return len(event_objects)


async def download_and_parse(match_id: int) -> dict:
    """Full pipeline: download replay → parse → store events."""
    async with async_session_factory() as session:
        # If no runnable clarity jar is available, fall back to OpenDota's parsed match endpoint.
        if not Path(settings.clarity_jar_path).exists():
            logger.warning(
                "clarity.jar not found at %s; using OpenDota fallback for match %s",
                settings.clarity_jar_path,
                match_id,
            )
            event_count = await parse_and_store_events_via_opendota(match_id, session)
            match_result = await session.execute(select(Match).where(Match.match_id == match_id))
            match = match_result.scalar_one_or_none()
            await session.commit()
            status = match.replay_state if match else "parsed"
            return {"match_id": match_id, "status": status, "events": event_count, "source": "opendota"}

        replay_path = await download_replay(match_id, session)
        if replay_path is None:
            await session.commit()
            return {"match_id": match_id, "status": "no_replay", "events": 0}

        event_count = await parse_and_store_events(match_id, replay_path, session)
        await session.commit()
        return {"match_id": match_id, "status": "parsed", "events": event_count, "source": "clarity"}


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
