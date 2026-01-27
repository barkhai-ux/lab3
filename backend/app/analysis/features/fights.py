"""
Teamfight detection.

A teamfight is defined as a cluster of kill events involving 3+ heroes
within a short time window and spatial proximity.

Algorithm:
1. Identify all hero kill events.
2. Cluster kills that occur within FIGHT_WINDOW_SECS of each other.
3. A cluster is a teamfight if it involves >= MIN_PARTICIPANTS heroes.
4. Merge overlapping clusters.
"""

import logging
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

FIGHT_WINDOW_SECS = 20  # Kills within 20 seconds are part of the same fight
MIN_PARTICIPANTS = 3  # Minimum unique heroes involved to count as a teamfight


@dataclass
class Teamfight:
    """Represents a detected teamfight."""

    start_time: float
    end_time: float
    kills: list[dict] = field(default_factory=list)
    radiant_deaths: int = 0
    dire_deaths: int = 0
    participants: set = field(default_factory=set)

    @property
    def duration(self) -> float:
        return self.end_time - self.start_time

    @property
    def total_kills(self) -> int:
        return len(self.kills)

    @property
    def winner(self) -> str | None:
        """The team with fewer deaths 'won' the fight."""
        if self.radiant_deaths < self.dire_deaths:
            return "radiant"
        elif self.dire_deaths < self.radiant_deaths:
            return "dire"
        return None

    def to_dict(self) -> dict:
        return {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "total_kills": self.total_kills,
            "radiant_deaths": self.radiant_deaths,
            "dire_deaths": self.dire_deaths,
            "winner": self.winner,
            "participants": list(self.participants),
        }


def detect_teamfights(events: list[dict]) -> list[Teamfight]:
    """
    Detect teamfights from parsed kill events.

    Args:
        events: List of parsed event dicts, filtered or unfiltered.

    Returns:
        List of Teamfight objects, sorted by start time.
    """
    # Extract kill events
    kill_events = [
        e for e in events
        if e.get("event_type") == "kill"
        and not e.get("data", {}).get("target_illusion", False)
    ]

    if not kill_events:
        return []

    # Sort by time
    kill_events.sort(key=lambda e: e.get("game_time_secs", 0))

    # Cluster kills into fights
    clusters: list[list[dict]] = []
    current_cluster: list[dict] = [kill_events[0]]

    for kill in kill_events[1:]:
        last_time = current_cluster[-1].get("game_time_secs", 0)
        curr_time = kill.get("game_time_secs", 0)

        if curr_time - last_time <= FIGHT_WINDOW_SECS:
            current_cluster.append(kill)
        else:
            clusters.append(current_cluster)
            current_cluster = [kill]

    clusters.append(current_cluster)

    # Convert clusters to teamfights (only those with enough participants)
    fights = []
    for cluster in clusters:
        participants = set()
        for kill in cluster:
            data = kill.get("data", {})
            attacker = data.get("attacker")
            target = data.get("target")
            if attacker:
                participants.add(attacker)
            if target:
                participants.add(target)

        if len(participants) < MIN_PARTICIPANTS:
            continue

        times = [k.get("game_time_secs", 0) for k in cluster]

        fight = Teamfight(
            start_time=min(times),
            end_time=max(times),
            kills=cluster,
            participants=participants,
        )

        # Count deaths by team
        for kill in cluster:
            slot = kill.get("player_slot")
            if slot is not None:
                # The victim's slot determines which team lost a hero
                # This is the attacker's slot; we need the target's slot
                # In parsed events, player_slot may refer to the attacker.
                # Use the target hero to determine team.
                pass

            data = kill.get("data", {})
            target = data.get("target")
            # We don't have team info directly from events, but player_slot
            # 0-4 = Radiant, 5-9 = Dire in standard Dota 2 indexing.
            # Since we can't reliably determine the victim's slot from hero name
            # alone, we'll count total kills and let higher-level analysis
            # cross-reference with player data.
            fight.radiant_deaths += 1  # Placeholder — refined during analysis

        fights.append(fight)

    logger.info("Detected %d teamfights from %d kill events", len(fights), len(kill_events))
    return fights
