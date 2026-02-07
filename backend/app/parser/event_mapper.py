"""
Map raw clarity output events to normalized domain events.

clarity outputs a variety of game events with different structures.
This module normalizes them into a consistent format suitable for
storage and analysis.

Expected clarity event format (varies by event type):
{
    "type": "DOTA_COMBATLOG_DEATH",
    "tick": 15000,
    "attackerName": "npc_dota_hero_antimage",
    "targetName": "npc_dota_hero_crystal_maiden",
    ...
}
"""

import logging
from typing import Any

from app.parser.clarity_runner import tick_to_game_time

logger = logging.getLogger(__name__)

# Mapping from clarity event types to our normalized event types
EVENT_TYPE_MAP = {
    "DOTA_COMBATLOG_DEATH": "kill",
    "DOTA_COMBATLOG_PURCHASE": "item_purchase",
    "DOTA_COMBATLOG_GOLD": "gold_change",
    "DOTA_COMBATLOG_XP": "xp_change",
    "DOTA_COMBATLOG_ABILITY": "ability_use",
    "DOTA_COMBATLOG_DAMAGE": "damage",
    "DOTA_COMBATLOG_HEAL": "heal",
    "DOTA_COMBATLOG_MODIFIER_ADD": "buff_applied",
    "DOTA_COMBATLOG_MODIFIER_REMOVE": "buff_removed",
    "DOTA_COMBATLOG_ITEM": "item_use",
    "ward_placed": "ward_placed",
    "ward_killed": "ward_killed",
    "building_kill": "building_kill",
    "roshan_killed": "roshan_kill",
    "rune_pickup": "rune_pickup",
    "player_position": "position",
}

# Hero name prefix to strip
HERO_PREFIX = "npc_dota_hero_"

def normalize_player_slot(slot: int | str | None) -> int | None:
    """
    Normalize player slots across different sources.

    We store slots using Valve/Dota API indexing:
      - Radiant: 0-4
      - Dire:    128-132 (0x80 bit set)

    Some replay parsers emit 0-9 indexing (0-4 Radiant, 5-9 Dire).
    If we detect 0-9, we convert Dire slots to 128-132 so they match DB rows.
    """
    if slot is None:
        return None
    try:
        s = int(slot)
    except (TypeError, ValueError):
        return None

    if 0 <= s <= 9:
        return s if s < 5 else 128 + (s - 5)

    return s


def normalize_hero_name(name: str | None) -> str | None:
    """Strip the npc_dota_hero_ prefix from entity names."""
    if name and name.startswith(HERO_PREFIX):
        return name[len(HERO_PREFIX):]
    return name


def extract_player_slot_from_event(event: dict) -> int | None:
    """Try to extract a player slot (0-9) from a clarity event."""
    # clarity may provide player slot directly
    if "playerSlot" in event:
        return normalize_player_slot(event["playerSlot"])
    if "player_slot" in event:
        return normalize_player_slot(event["player_slot"])
    if "slot" in event:
        return normalize_player_slot(event["slot"])
    return None


def map_event(raw_event: dict) -> dict[str, Any] | None:
    """
    Map a single raw clarity event to a normalized domain event.

    Returns None if the event type is not recognized or not relevant.
    """
    raw_type = raw_event.get("type", raw_event.get("event_type", ""))
    normalized_type = EVENT_TYPE_MAP.get(raw_type)

    if normalized_type is None:
        return None

    tick = raw_event.get("tick", 0)
    game_time = tick_to_game_time(tick)
    player_slot = extract_player_slot_from_event(raw_event)

    # Build normalized data payload based on event type
    data: dict[str, Any] = {"raw_type": raw_type}

    if normalized_type == "kill":
        data["attacker"] = normalize_hero_name(raw_event.get("attackerName"))
        data["target"] = normalize_hero_name(raw_event.get("targetName"))
        data["attacker_illusion"] = raw_event.get("attackerIllusion", False)
        data["target_illusion"] = raw_event.get("targetIllusion", False)

    elif normalized_type == "item_purchase":
        data["item"] = raw_event.get("valueName", raw_event.get("value"))
        data["hero"] = normalize_hero_name(raw_event.get("targetName"))

    elif normalized_type in ("gold_change", "xp_change"):
        data["amount"] = raw_event.get("value", 0)
        data["hero"] = normalize_hero_name(raw_event.get("targetName"))
        data["reason"] = raw_event.get("goldReason", raw_event.get("xpReason"))

    elif normalized_type == "damage":
        data["attacker"] = normalize_hero_name(raw_event.get("attackerName"))
        data["target"] = normalize_hero_name(raw_event.get("targetName"))
        data["damage"] = raw_event.get("value", 0)
        data["inflictor"] = raw_event.get("inflictorName")

    elif normalized_type == "heal":
        data["source"] = normalize_hero_name(raw_event.get("attackerName"))
        data["target"] = normalize_hero_name(raw_event.get("targetName"))
        data["amount"] = raw_event.get("value", 0)

    elif normalized_type == "ward_placed":
        data["ward_type"] = raw_event.get("ward_type", "observer")
        data["x"] = raw_event.get("x")
        data["y"] = raw_event.get("y")
        data["hero"] = normalize_hero_name(raw_event.get("player"))

    elif normalized_type == "ward_killed":
        data["ward_type"] = raw_event.get("ward_type", "observer")
        data["killer"] = normalize_hero_name(raw_event.get("killer"))

    elif normalized_type == "building_kill":
        data["building"] = raw_event.get("building")
        data["team"] = raw_event.get("team")

    elif normalized_type == "roshan_kill":
        data["team"] = raw_event.get("team")
        data["killer"] = normalize_hero_name(raw_event.get("killer"))

    elif normalized_type == "position":
        data["x"] = raw_event.get("x")
        data["y"] = raw_event.get("y")
        data["hero"] = normalize_hero_name(raw_event.get("hero"))

    elif normalized_type == "ability_use":
        data["ability"] = raw_event.get("inflictorName", raw_event.get("value"))
        data["hero"] = normalize_hero_name(raw_event.get("attackerName"))
        data["target"] = normalize_hero_name(raw_event.get("targetName"))

    elif normalized_type == "rune_pickup":
        data["rune_type"] = raw_event.get("rune_type")
        data["hero"] = normalize_hero_name(raw_event.get("player"))

    return {
        "tick": tick,
        "game_time_secs": game_time,
        "event_type": normalized_type,
        "player_slot": player_slot,
        "data": data,
    }


def map_all_events(raw_events: list[dict]) -> list[dict]:
    """Map a list of raw clarity events to normalized domain events."""
    mapped = []
    for raw in raw_events:
        event = map_event(raw)
        if event is not None:
            mapped.append(event)

    logger.info("Mapped %d/%d events", len(mapped), len(raw_events))
    return mapped
