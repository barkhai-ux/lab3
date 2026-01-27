"""
Vision control detector.

Analyzes ward placement patterns for support players and dewarding
for all roles.
"""

import logging

from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding

logger = logging.getLogger(__name__)

# Expected ward counts per game length for supports
EXPECTED_OBS_PER_10MIN = 2.5
EXPECTED_SENTRY_PER_10MIN = 1.5


class VisionDetector(BaseDetector):
    @property
    def name(self) -> str:
        return "vision_control"

    @property
    def category(self) -> str:
        return "vision"

    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        findings = []

        # Only flag vision metrics for support roles
        is_support = ctx.role in (4, 5)

        # Count wards placed by this player
        ward_events = [
            e for e in ctx.events
            if e.get("event_type") == "ward_placed"
            and e.get("player_slot") == ctx.player_slot
        ]

        obs_placed = sum(
            1 for e in ward_events
            if e.get("data", {}).get("ward_type") == "observer"
        )
        sentry_placed = sum(
            1 for e in ward_events
            if e.get("data", {}).get("ward_type") == "sentry"
        )

        # Count wards killed (dewarding)
        deward_events = [
            e for e in ctx.events
            if e.get("event_type") == "ward_killed"
            and e.get("player_slot") == ctx.player_slot
        ]
        wards_dewarded = len(deward_events)

        game_10min_periods = max(1, ctx.duration_secs / 600)

        if is_support:
            obs_rate = obs_placed / game_10min_periods
            sentry_rate = sentry_placed / game_10min_periods

            if obs_rate < EXPECTED_OBS_PER_10MIN * 0.5:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="warning",
                    confidence=0.7,
                    title="Low observer ward usage",
                    description=(
                        f"Placed {obs_placed} observer wards in a "
                        f"{ctx.duration_secs // 60} min game "
                        f"({obs_rate:.1f} per 10 min). "
                        f"Expected ~{EXPECTED_OBS_PER_10MIN:.1f} per 10 min "
                        f"for position {ctx.role}."
                    ),
                    data={
                        "obs_placed": obs_placed,
                        "obs_rate_per_10min": round(obs_rate, 1),
                        "expected_rate": EXPECTED_OBS_PER_10MIN,
                    },
                ))

            if sentry_rate < EXPECTED_SENTRY_PER_10MIN * 0.4:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=0.6,
                    title="Low sentry ward usage",
                    description=(
                        f"Placed {sentry_placed} sentry wards "
                        f"({sentry_rate:.1f} per 10 min). "
                        f"Consider more active dewarding."
                    ),
                    data={
                        "sentry_placed": sentry_placed,
                        "sentry_rate_per_10min": round(sentry_rate, 1),
                    },
                ))

        # Dewarding for all roles (positive finding)
        if wards_dewarded >= 3:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="info",
                confidence=0.8,
                title="Active dewarding",
                description=(
                    f"Destroyed {wards_dewarded} enemy wards, "
                    f"contributing to vision control."
                ),
                data={"wards_dewarded": wards_dewarded},
            ))

        # Ward timing analysis — were wards placed at key timings?
        night_ward_events = [
            e for e in ward_events
            if e.get("data", {}).get("ward_type") == "observer"
            and self._is_near_nightfall(e.get("game_time_secs", 0))
        ]

        if is_support and obs_placed > 0:
            night_ward_ratio = len(night_ward_events) / max(1, obs_placed)
            if night_ward_ratio > 0.3:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=0.5,
                    title="Good ward timing awareness",
                    description=(
                        f"{len(night_ward_events)} of {obs_placed} observer wards "
                        f"placed near nightfall transitions, suggesting "
                        f"awareness of vision timing."
                    ),
                    data={
                        "night_wards": len(night_ward_events),
                        "total_obs": obs_placed,
                    },
                ))

        return findings

    @staticmethod
    def _is_near_nightfall(game_time_secs: float) -> bool:
        """Check if the game time is near a day/night transition."""
        # Dota 2: first night at 5:00, then every 5 minutes
        cycle_pos = game_time_secs % 300  # 5-minute cycle
        return cycle_pos < 30 or cycle_pos > 270  # Within 30 sec of transition
