"""
Lane assignment inference.

Determines which lane each player occupied during the laning phase
(first 10 minutes) based on position data.

Dota 2 map coordinates (approximate, normalized 0-1):
- Radiant safe lane (bot): x > 0.5, y < 0.3
- Radiant off lane (top): x < 0.3, y > 0.5
- Mid lane: 0.3 < x < 0.7, 0.3 < y < 0.7
- Dire safe lane (top): x < 0.3, y > 0.5
- Dire off lane (bot): x > 0.5, y < 0.3
- Jungle: interior positions not on lanes

Lane codes: 1=safe, 2=mid, 3=off, 4=jungle
"""

import logging
from collections import Counter

logger = logging.getLogger(__name__)

LANING_PHASE_END_SECS = 600  # 10 minutes

# Map coordinate boundaries (normalized to 0-256 game units approximation)
# These are rough heuristics; real coordinates vary by map version.
MID_X_RANGE = (70, 180)
MID_Y_RANGE = (70, 180)
BOT_Y_THRESHOLD = 70
TOP_Y_THRESHOLD = 180
RIGHT_X_THRESHOLD = 180
LEFT_X_THRESHOLD = 70


def classify_position(x: float, y: float) -> str:
    """Classify a single position into a lane region."""
    if x is None or y is None:
        return "unknown"

    # Mid lane: diagonal corridor
    if MID_X_RANGE[0] <= x <= MID_X_RANGE[1] and MID_Y_RANGE[0] <= y <= MID_Y_RANGE[1]:
        # Check if close to the diagonal
        if abs(x - y) < 50:
            return "mid"

    # Bot lane: keep this fairly "tight" to avoid labeling jungle positions as lane.
    # (e.g. (130, 50) should be jungle, while (200, 30) is clearly bot lane.)
    if y < BOT_Y_THRESHOLD and x > RIGHT_X_THRESHOLD:
        return "bot"

    # Top lane
    if y > TOP_Y_THRESHOLD and x < LEFT_X_THRESHOLD:
        return "top"

    # If not clearly in any lane, it's jungle/roaming
    return "jungle"


def infer_lanes(
    snapshots: list[dict],
    match_players: list[dict],
) -> dict[int, int]:
    """
    Infer lane assignments for each player based on position snapshots
    during the first 10 minutes.

    Args:
        snapshots: List of player state snapshot dicts.
        match_players: List of match player dicts with player_slot and hero info.

    Returns:
        Dict mapping player_slot → lane code (1=safe, 2=mid, 3=off, 4=jungle).
    """
    # If lane hints are already present in DB (e.g. from OpenDota), use them as a fallback.
    lane_hints: dict[int, int] = {}
    for p in match_players:
        slot = p.get("player_slot")
        lane = p.get("lane")
        if isinstance(slot, int) and isinstance(lane, int) and lane in (1, 2, 3, 4):
            lane_hints[slot] = lane

    # Collect laning-phase positions per player
    player_positions: dict[int, list[tuple[float, float]]] = {}
    for snap in snapshots:
        if snap["game_time_secs"] > LANING_PHASE_END_SECS:
            continue
        slot = snap["player_slot"]
        x, y = snap.get("x"), snap.get("y")
        if x is not None and y is not None:
            player_positions.setdefault(slot, []).append((x, y))

    # Determine lane for each player
    lane_assignments: dict[int, int] = {}

    for slot, positions in player_positions.items():
        if not positions:
            lane_assignments[slot] = lane_hints.get(slot, 4)
            continue

        region_counts = Counter()
        for x, y in positions:
            region = classify_position(x, y)
            region_counts[region] += 1

        most_common_region = region_counts.most_common(1)[0][0]

        # Convert region name to lane code based on team
        # Works with both common slot schemes:
        # - 0-9 indexing (0-4 Radiant, 5-9 Dire)
        # - Valve/Dota API indexing (0-4 Radiant, 128-132 Dire)
        is_radiant = slot < 5

        if most_common_region == "mid":
            lane_assignments[slot] = 2
        elif most_common_region == "bot":
            lane_assignments[slot] = 1 if is_radiant else 3  # safe/off
        elif most_common_region == "top":
            lane_assignments[slot] = 3 if is_radiant else 1  # off/safe
        else:
            lane_assignments[slot] = 4  # jungle

    # Fill in any missing slots
    for slot in [0, 1, 2, 3, 4, 128, 129, 130, 131, 132]:
        if slot not in lane_assignments:
            lane_assignments[slot] = lane_hints.get(slot, 4)

    logger.info("Lane assignments: %s", lane_assignments)
    return lane_assignments
