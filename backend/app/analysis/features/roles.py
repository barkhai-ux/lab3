"""
Role classification.

Infers player roles from lane assignments, hero pick, and farm priority
during the laning phase.

Role codes:
    1 = Carry (Position 1)
    2 = Mid (Position 2)
    3 = Offlane (Position 3)
    4 = Soft Support (Position 4)
    5 = Hard Support (Position 5)

Heuristic:
- Mid lane → role 2
- Safe lane with highest CS → role 1
- Off lane with highest CS → role 3
- Remaining players in safe/off lane with lower CS → roles 4/5
- Jungle → role depends on farm priority
"""

import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Heroes that are commonly played in specific roles.
# This is a simplified lookup; a production system would use per-patch data.
TYPICAL_SUPPORT_HEROES = {
    5, 31, 32, 37, 45, 48, 50, 51, 53, 58, 64, 65, 77, 84, 86, 90,
    92, 94, 100, 105, 108, 109, 111, 126, 131,
}  # Crystal Maiden, Lich, Warlock, etc.


def classify_roles(
    lane_assignments: dict[int, int],
    match_players: list[dict],
    snapshots: list[dict],
) -> dict[int, int]:
    """
    Classify roles for each player in a match.

    Args:
        lane_assignments: Dict of player_slot → lane code.
        match_players: List of match player dicts with player_slot, hero_id, gpm, last_hits.
        snapshots: Player state snapshots (for early farm data).

    Returns:
        Dict mapping player_slot → role code (1-5).
    """
    roles: dict[int, int] = {}

    # Separate teams
    for team_slots in [range(0, 5), range(5, 10)]:
        team_players = [
            p for p in match_players if p.get("player_slot", -1) in team_slots
        ]
        _assign_team_roles(team_players, lane_assignments, roles)

    return roles


def _assign_team_roles(
    players: list[dict],
    lanes: dict[int, int],
    roles: dict[int, int],
) -> None:
    """Assign roles for one team (5 players)."""
    assigned = set()

    # Step 1: Mid lane player → role 2
    for p in players:
        slot = p.get("player_slot", -1)
        if lanes.get(slot) == 2 and 2 not in assigned:
            roles[slot] = 2
            assigned.add(2)
            break

    # Step 2: Safe lane players
    safe_lane_players = [
        p for p in players
        if lanes.get(p.get("player_slot", -1)) == 1
        and p.get("player_slot", -1) not in roles
    ]
    safe_lane_players.sort(key=lambda p: p.get("last_hits", 0) or 0, reverse=True)

    for i, p in enumerate(safe_lane_players):
        slot = p.get("player_slot", -1)
        if i == 0 and 1 not in assigned:
            roles[slot] = 1  # Carry
            assigned.add(1)
        elif 5 not in assigned:
            roles[slot] = 5  # Hard support
            assigned.add(5)
        elif 4 not in assigned:
            roles[slot] = 4
            assigned.add(4)

    # Step 3: Off lane players
    off_lane_players = [
        p for p in players
        if lanes.get(p.get("player_slot", -1)) == 3
        and p.get("player_slot", -1) not in roles
    ]
    off_lane_players.sort(key=lambda p: p.get("last_hits", 0) or 0, reverse=True)

    for i, p in enumerate(off_lane_players):
        slot = p.get("player_slot", -1)
        if i == 0 and 3 not in assigned:
            roles[slot] = 3  # Offlaner
            assigned.add(3)
        elif 4 not in assigned:
            roles[slot] = 4  # Soft support
            assigned.add(4)

    # Step 4: Fill remaining
    unassigned = [
        p for p in players if p.get("player_slot", -1) not in roles
    ]
    remaining_roles = [r for r in [1, 2, 3, 4, 5] if r not in assigned]

    # Sort unassigned by farm (GPM) descending
    unassigned.sort(key=lambda p: p.get("gpm", 0) or 0, reverse=True)

    remaining_roles.sort()
    for p, role in zip(unassigned, remaining_roles):
        roles[p.get("player_slot", -1)] = role

    # Final fallback: anyone still missing gets role 5
    for p in players:
        slot = p.get("player_slot", -1)
        if slot not in roles:
            roles[slot] = 5
