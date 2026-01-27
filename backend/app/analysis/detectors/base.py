"""
Base detector interface.

All analysis detectors implement this interface. Each detector examines
a specific aspect of play and produces confidence-weighted findings.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Finding:
    """A single analysis finding from a detector."""

    detector_name: str
    category: str
    severity: str  # "info", "warning", "critical"
    confidence: float  # 0.0 to 1.0
    title: str
    description: str
    game_time_secs: float | None = None
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "detector_name": self.detector_name,
            "category": self.category,
            "severity": self.severity,
            "confidence": self.confidence,
            "title": self.title,
            "description": self.description,
            "game_time_secs": self.game_time_secs,
            "data": self.data,
        }


@dataclass
class DetectorContext:
    """All data a detector needs to produce findings."""

    match_id: int
    steam_id: int
    player_slot: int
    hero_id: int
    role: int | None
    lane: int | None
    duration_secs: int
    is_radiant: bool
    won: bool
    player_stats: dict  # From match_players row
    baseline: dict | None  # From hero_baselines
    events: list[dict]  # Parsed events for this match
    snapshots: list[dict]  # Player state snapshots
    all_players: list[dict]  # All 10 players' stats
    teamfights: list[dict]  # Detected teamfights


class BaseDetector(ABC):
    """Abstract base class for all analysis detectors."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this detector."""

    @property
    @abstractmethod
    def category(self) -> str:
        """Category: farming, deaths, items, vision, objectives."""

    @abstractmethod
    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        """
        Run the detector and produce findings.

        Must not raise exceptions — return an empty list if analysis is
        not applicable.
        """
