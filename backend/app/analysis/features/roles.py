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
- First, apply hero-based constraints (carries can't be support, supports can't be carry)
- Mid lane → role 2
- Safe lane with highest CS → role 1
- Off lane with highest CS → role 3
- Remaining players in safe/off lane with lower CS → roles 4/5
- Jungle → role depends on farm priority
"""

import logging

logger = logging.getLogger(__name__)

# Hard carry heroes - NEVER supports (positions 1-2 only)
HARD_CARRY_HEROES = {
    1,    # Anti-Mage
    6,    # Drow Ranger
    8,    # Juggernaut
    10,   # Morphling
    12,   # Phantom Lancer
    41,   # Faceless Void
    44,   # Phantom Assassin
    46,   # Templar Assassin
    48,   # Luna
    56,   # Clinkz
    67,   # Spectre
    72,   # Gyrocopter
    81,   # Chaos Knight
    89,   # Naga Siren
    93,   # Slark
    94,   # Medusa
    95,   # Troll Warlord
    109,  # Terrorblade
    113,  # Arc Warden
}

# Mid-focused heroes - typically position 2
MID_HEROES = {
    10,   # Morphling
    11,   # Shadow Fiend
    13,   # Puck
    17,   # Storm Spirit
    34,   # Tinker
    39,   # Queen of Pain
    46,   # Templar Assassin
    47,   # Viper
    74,   # Invoker
    106,  # Ember Spirit
    126,  # Void Spirit
}

# Hard support heroes - NEVER carries (positions 4-5 only)
HARD_SUPPORT_HEROES = {
    5,    # Crystal Maiden
    26,   # Lion
    27,   # Shadow Shaman
    30,   # Witch Doctor
    31,   # Lich
    37,   # Warlock
    50,   # Dazzle
    64,   # Jakiro
    75,   # Silencer
    84,   # Ogre Magi
    86,   # Rubick
    87,   # Disruptor
    90,   # Keeper of the Light
    101,  # Skywrath Mage
    111,  # Oracle
    112,  # Winter Wyvern
    119,  # Dark Willow
    121,  # Grimstroke
    128,  # Snapfire
}

# Offlane heroes - typically position 3
OFFLANE_HEROES = {
    2,    # Axe
    7,    # Earthshaker
    16,   # Sand King
    28,   # Slardar
    29,   # Tidehunter
    38,   # Beastmaster
    51,   # Clockwerk
    55,   # Dark Seer
    69,   # Doom
    71,   # Spirit Breaker
    96,   # Centaur Warrunner
    97,   # Magnus
    99,   # Bristleback
    104,  # Legion Commander
    108,  # Underlord
    129,  # Mars
    137,  # Primal Beast
}


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
    for team_slots in [range(0, 5), range(128, 133)]:
        team_players = [
            p for p in match_players
            if p.get("player_slot", -1) in team_slots
        ]
        if team_players:
            _assign_team_roles(team_players, lane_assignments, roles)

    return roles


def _get_hero_role_preference(hero_id: int) -> tuple[set[int], set[int]]:
    """
    Returns (preferred_roles, forbidden_roles) for a hero.
    """
    if hero_id in HARD_CARRY_HEROES:
        return ({1, 2}, {4, 5})  # Can be pos 1-2, never 4-5
    if hero_id in MID_HEROES:
        return ({2, 1}, {5})  # Prefers mid, can carry, not hard support
    if hero_id in HARD_SUPPORT_HEROES:
        return ({4, 5}, {1, 2})  # Can be pos 4-5, never 1-2
    if hero_id in OFFLANE_HEROES:
        return ({3, 4}, {1, 5})  # Usually offlane or 4, rarely carry or hard support
    return (set(), set())  # Flexible


def _assign_team_roles(
    players: list[dict],
    lanes: dict[int, int],
    roles: dict[int, int],
) -> None:
    """Assign roles for one team (5 players)."""
    assigned: set[int] = set()

    # Sort players by GPM descending to assign farm priority
    players_by_farm = sorted(players, key=lambda p: p.get("gpm", 0) or 0, reverse=True)

    # Step 1: Pre-assign based on hero type constraints
    # Hard carries with high farm → position 1
    for p in players_by_farm:
        slot = p.get("player_slot", -1)
        hero_id = p.get("hero_id", 0)
        if hero_id in HARD_CARRY_HEROES and 1 not in assigned:
            roles[slot] = 1
            assigned.add(1)
            break

    # Mid heroes in mid lane → position 2
    for p in players:
        slot = p.get("player_slot", -1)
        hero_id = p.get("hero_id", 0)
        if slot in roles:
            continue
        lane = lanes.get(slot)
        if (lane == 2 or hero_id in MID_HEROES) and 2 not in assigned:
            roles[slot] = 2
            assigned.add(2)
            break

    # Hard supports with low farm → position 5
    for p in reversed(players_by_farm):
        slot = p.get("player_slot", -1)
        hero_id = p.get("hero_id", 0)
        if slot in roles:
            continue
        if hero_id in HARD_SUPPORT_HEROES and 5 not in assigned:
            roles[slot] = 5
            assigned.add(5)
            break

    # Step 2: Assign remaining by lane and farm
    # Safe lane highest CS → carry (if not assigned)
    safe_lane_players = [
        p for p in players
        if lanes.get(p.get("player_slot", -1)) == 1
        and p.get("player_slot", -1) not in roles
    ]
    safe_lane_players.sort(key=lambda p: p.get("last_hits", 0) or 0, reverse=True)

    for i, p in enumerate(safe_lane_players):
        slot = p.get("player_slot", -1)
        hero_id = p.get("hero_id", 0)
        _, forbidden = _get_hero_role_preference(hero_id)

        if i == 0 and 1 not in assigned and 1 not in forbidden:
            roles[slot] = 1
            assigned.add(1)
        elif 5 not in assigned and 5 not in forbidden:
            roles[slot] = 5
            assigned.add(5)
        elif 4 not in assigned and 4 not in forbidden:
            roles[slot] = 4
            assigned.add(4)

    # Off lane players
    off_lane_players = [
        p for p in players
        if lanes.get(p.get("player_slot", -1)) == 3
        and p.get("player_slot", -1) not in roles
    ]
    off_lane_players.sort(key=lambda p: p.get("last_hits", 0) or 0, reverse=True)

    for i, p in enumerate(off_lane_players):
        slot = p.get("player_slot", -1)
        hero_id = p.get("hero_id", 0)
        _, forbidden = _get_hero_role_preference(hero_id)

        if i == 0 and 3 not in assigned and 3 not in forbidden:
            roles[slot] = 3
            assigned.add(3)
        elif 4 not in assigned and 4 not in forbidden:
            roles[slot] = 4
            assigned.add(4)

    # Step 3: Fill remaining respecting hero constraints
    unassigned = [p for p in players if p.get("player_slot", -1) not in roles]
    unassigned.sort(key=lambda p: p.get("gpm", 0) or 0, reverse=True)

    remaining_roles = sorted([r for r in [1, 2, 3, 4, 5] if r not in assigned])

    for p in unassigned:
        slot = p.get("player_slot", -1)
        hero_id = p.get("hero_id", 0)
        _, forbidden = _get_hero_role_preference(hero_id)

        # Find best available role not forbidden
        for role in remaining_roles:
            if role not in forbidden:
                roles[slot] = role
                remaining_roles.remove(role)
                break
        else:
            # Fallback: assign any remaining role
            if remaining_roles:
                roles[slot] = remaining_roles.pop(0)

    # Final fallback
    for p in players:
        slot = p.get("player_slot", -1)
        if slot not in roles:
            # Assign based on hero preference or default
            hero_id = p.get("hero_id", 0)
            if hero_id in HARD_CARRY_HEROES:
                roles[slot] = 1
            elif hero_id in HARD_SUPPORT_HEROES:
                roles[slot] = 5
            else:
                roles[slot] = 3  # Default to offlane
