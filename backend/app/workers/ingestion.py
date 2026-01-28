"""
Match ingestion pipeline.

Fetches match history and details from the Steam Web API,
persists them to the database, and assigns patch versions.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.match import Match, MatchPlayer, Patch
from app.services.opendota_api import OpenDotaClient
from app.services.steam_api import SteamAPIClient, SteamAPIError

logger = logging.getLogger(__name__)

# Known Dota 2 patches with approximate release dates.
# In production, this would be fetched from OpenDota or maintained in DB.
KNOWN_PATCHES = [
    ("7.37", "2024-09-01T00:00:00Z"),
    ("7.37b", "2024-09-15T00:00:00Z"),
    ("7.37c", "2024-10-01T00:00:00Z"),
    ("7.37d", "2024-10-15T00:00:00Z"),
]


async def ensure_patches_exist(
    session: AsyncSession,
) -> dict[str, tuple[int, datetime]]:
    """Ensure all known patches exist in the DB. Returns name → (id, released_at) mapping."""
    result = await session.execute(select(Patch))
    existing: dict[str, tuple[int, datetime]] = {
        p.name: (p.id, p.released_at) for p in result.scalars().all()
    }

    for name, released_str in KNOWN_PATCHES:
        if name not in existing:
            released_at = datetime.fromisoformat(released_str.replace("Z", "+00:00"))
            patch = Patch(name=name, released_at=released_at)
            session.add(patch)
            await session.flush()
            existing[name] = (patch.id, released_at)

    return existing


def determine_patch(
    match_start: datetime, patches: dict[str, tuple[int, datetime]]
) -> int | None:
    """Determine which patch a match was played on based on its start time.

    Finds the latest patch whose released_at is on or before match_start.
    """
    sorted_patches = sorted(
        patches.values(),
        key=lambda x: x[1],  # sort by released_at
        reverse=True,
    )
    for pid, released_at in sorted_patches:
        if released_at <= match_start:
            return pid
    return None


async def fetch_and_store_matches(steam_id64: int) -> list[int]:
    """
    Fetch recent matches for a user and store them.

    Returns a list of newly stored match IDs.
    """
    client = SteamAPIClient()
    account_id = client.steam_id64_to_account_id(steam_id64)

    history = await client.get_match_history(account_id, matches_requested=25)

    matches_data = history.get("matches", [])
    if not matches_data:
        logger.info("No matches found for %s", steam_id64)
        return []

    # Build mapping of match_id → user's player_slot from history data,
    # so we can identify the user even when OpenDota omits their account_id.
    user_slot_by_match: dict[int, int | None] = {}
    for m in matches_data:
        for p in m.get("players", []):
            if p.get("account_id") == account_id:
                user_slot_by_match[m["match_id"]] = p.get("player_slot")
                break

    opendota = OpenDotaClient()
    new_match_ids = []

    async with async_session_factory() as session:
        patches = await ensure_patches_exist(session)

        for m in matches_data:
            match_id = m["match_id"]

            # Idempotency: skip if already exists
            existing = await session.execute(
                select(Match).where(Match.match_id == match_id)
            )
            if existing.scalar_one_or_none() is not None:
                continue

            start_time = SteamAPIClient.parse_start_time(m["start_time"])

            # Fetch full details: try Steam first, fall back to OpenDota
            try:
                details = await client.get_match_details(match_id)
            except SteamAPIError:
                try:
                    details = await opendota.get_match(match_id)
                except Exception as e:
                    logger.warning(
                        "Failed to fetch details for match %s: %s", match_id, e
                    )
                    continue

            patch_id = determine_patch(start_time, patches)

            match = Match(
                match_id=match_id,
                patch_id=patch_id,
                game_mode=details.get("game_mode", 0),
                lobby_type=details.get("lobby_type"),
                duration_secs=details.get("duration", 0),
                start_time=start_time,
                radiant_win=details.get("radiant_win", False),
                avg_mmr=details.get("average_mmr"),
                replay_state="pending",
            )
            session.add(match)

            user_slot = user_slot_by_match.get(match_id)

            # Store players
            for p in details.get("players", []):
                raw_account_id = p.get("account_id")
                player_slot = p.get("player_slot", 0)

                # Resolve steam_id for this player
                if raw_account_id and raw_account_id != 4294967295:
                    player_steam_id = raw_account_id + 76561197960265728
                elif player_slot == user_slot:
                    # Player slot matches the requesting user from match history
                    player_steam_id = steam_id64
                else:
                    player_steam_id = None

                items_dict = {}
                for i in range(6):
                    item_key = f"item_{i}"
                    if p.get(item_key):
                        items_dict[item_key] = p[item_key]

                mp = MatchPlayer(
                    match_id=match_id,
                    steam_id=player_steam_id,
                    player_slot=player_slot,
                    hero_id=p.get("hero_id", 0),
                    kills=p.get("kills"),
                    deaths=p.get("deaths"),
                    assists=p.get("assists"),
                    gpm=p.get("gold_per_min"),
                    xpm=p.get("xp_per_min"),
                    last_hits=p.get("last_hits"),
                    denies=p.get("denies"),
                    hero_damage=p.get("hero_damage"),
                    tower_damage=p.get("tower_damage"),
                    hero_healing=p.get("hero_healing"),
                    level=p.get("level"),
                    items=items_dict if items_dict else None,
                )
                session.add(mp)

            new_match_ids.append(match_id)

        await session.commit()

    logger.info(
        "Stored %d new matches for user %s", len(new_match_ids), steam_id64
    )
    return new_match_ids


def run_fetch_matches(steam_id64: int) -> list[int]:
    """Synchronous wrapper for Celery tasks."""
    return asyncio.get_event_loop().run_until_complete(
        fetch_and_store_matches(steam_id64)
    )
