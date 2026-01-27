"""
Feature extractor: converts raw parsed events into time-indexed player states.

Takes the list of ParsedEvent rows for a match and produces PlayerStateSnapshot
records that capture each player's position, gold, XP, level, HP, mana, and
inventory at regular intervals.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

SNAPSHOT_INTERVAL_SECS = 60  # Generate a snapshot every 60 game seconds


@dataclass
class PlayerState:
    """Mutable running state for a single player during extraction."""

    player_slot: int
    hero: str | None = None
    x: float = 0.0
    y: float = 0.0
    gold: int = 0
    xp: int = 0
    level: int = 1
    hp: int = 0
    mana: int = 0
    items: list = field(default_factory=list)
    kills: int = 0
    deaths: int = 0
    assists: int = 0
    last_hits: int = 0
    denies: int = 0

    def to_snapshot(self, match_id: int, game_time: float) -> dict:
        return {
            "match_id": match_id,
            "player_slot": self.player_slot,
            "game_time_secs": game_time,
            "x": self.x,
            "y": self.y,
            "gold": self.gold,
            "xp": self.xp,
            "level": self.level,
            "hp": self.hp,
            "mana": self.mana,
            "items": self.items[:],
        }


def extract_player_states(
    match_id: int,
    events: list[dict],
    duration_secs: int,
) -> list[dict]:
    """
    Process a sorted list of parsed events and generate player state snapshots.

    Args:
        match_id: The match ID.
        events: List of event dicts (from parsed_events table), sorted by game_time_secs.
        duration_secs: Total match duration in seconds.

    Returns:
        List of snapshot dicts ready for PlayerStateSnapshot insertion.
    """
    # Initialize states for all 10 player slots
    states: dict[int, PlayerState] = {}
    for slot in range(10):
        states[slot] = PlayerState(player_slot=slot)

    # Sort events by game time
    sorted_events = sorted(events, key=lambda e: e.get("game_time_secs", 0))

    snapshots = []
    next_snapshot_time = SNAPSHOT_INTERVAL_SECS
    event_idx = 0

    while next_snapshot_time <= duration_secs:
        # Process all events up to the snapshot time
        while event_idx < len(sorted_events):
            evt = sorted_events[event_idx]
            evt_time = evt.get("game_time_secs", 0)

            if evt_time > next_snapshot_time:
                break

            _apply_event(states, evt)
            event_idx += 1

        # Take snapshot for all players
        for slot in range(10):
            snapshots.append(states[slot].to_snapshot(match_id, next_snapshot_time))

        next_snapshot_time += SNAPSHOT_INTERVAL_SECS

    logger.info(
        "Generated %d snapshots for match %s (%d events processed)",
        len(snapshots),
        match_id,
        len(sorted_events),
    )
    return snapshots


def _apply_event(states: dict[int, PlayerState], event: dict) -> None:
    """Apply a single event to update player states."""
    event_type = event.get("event_type", "")
    player_slot = event.get("player_slot")
    data = event.get("data", {})

    if player_slot is not None and 0 <= player_slot <= 9:
        state = states[player_slot]
    else:
        return

    if event_type == "position":
        x = data.get("x")
        y = data.get("y")
        if x is not None:
            state.x = float(x)
        if y is not None:
            state.y = float(y)
        if data.get("hero"):
            state.hero = data["hero"]

    elif event_type == "gold_change":
        amount = data.get("amount", 0)
        state.gold += amount

    elif event_type == "xp_change":
        amount = data.get("amount", 0)
        state.xp += amount
        # Rough level calculation (Dota 2 XP table approximation)
        state.level = _xp_to_level(state.xp)

    elif event_type == "item_purchase":
        item = data.get("item")
        if item:
            state.items.append(item)

    elif event_type == "kill":
        target = data.get("target")
        # If a hero was killed, track deaths for the victim
        if target and not data.get("target_illusion"):
            for s in states.values():
                if s.hero == target:
                    s.deaths += 1
                    break


# Approximate Dota 2 XP level table (cumulative XP per level)
_XP_TABLE = [
    0, 0, 230, 600, 1080, 1660, 2260, 2980, 3730, 4620, 5550,
    6520, 7530, 8580, 9805, 11055, 12330, 13630, 14955, 16455,
    18045, 19645, 21495, 23595, 25945, 28545, 31645, 35245, 39445, 44245, 49745,
]


def _xp_to_level(xp: int) -> int:
    """Convert cumulative XP to level."""
    for level in range(len(_XP_TABLE) - 1, 0, -1):
        if xp >= _XP_TABLE[level]:
            return level
    return 1
