"""
Objective conversion detector.

Analyzes whether the team converted won teamfights into objectives
(towers, Roshan, barracks). This measures decision quality after
gaining a numbers advantage.
"""

import logging

from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding

logger = logging.getLogger(__name__)

# Window after a fight ends to check for objective takes
OBJECTIVE_WINDOW_SECS = 90


class ObjectiveConversionDetector(BaseDetector):
    @property
    def name(self) -> str:
        return "objective_conversion"

    @property
    def category(self) -> str:
        return "objectives"

    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        findings = []

        if not ctx.teamfights:
            return findings

        # Determine player's team
        team = "radiant" if ctx.is_radiant else "dire"

        # Collect objective events
        objective_events = [
            e for e in ctx.events
            if e.get("event_type") in ("building_kill", "roshan_kill")
        ]

        # For each teamfight won, check if an objective was taken
        fights_won = 0
        fights_converted = 0
        fights_not_converted = []

        for fight in ctx.teamfights:
            winner = fight.get("winner")
            if winner != team:
                continue

            fights_won += 1
            fight_end = fight.get("end_time", 0)

            # Check for objectives taken within the window after the fight
            converted = False
            for obj in objective_events:
                obj_time = obj.get("game_time_secs", 0)
                if fight_end < obj_time <= fight_end + OBJECTIVE_WINDOW_SECS:
                    converted = True
                    break

            if converted:
                fights_converted += 1
            else:
                fights_not_converted.append(fight_end)

        if fights_won == 0:
            return findings

        conversion_rate = fights_converted / fights_won

        if fights_won >= 3 and conversion_rate < 0.4:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="warning",
                confidence=min(0.85, 0.5 + fights_won * 0.08),
                title="Low objective conversion after fights",
                description=(
                    f"Won {fights_won} teamfights but only converted "
                    f"{fights_converted} into objectives ({conversion_rate:.0%}). "
                    f"Taking towers or Roshan after winning fights "
                    f"accelerates advantage."
                ),
                data={
                    "fights_won": fights_won,
                    "fights_converted": fights_converted,
                    "conversion_rate": round(conversion_rate, 2),
                    "missed_at": fights_not_converted[:5],
                },
            ))
        elif fights_won >= 2 and conversion_rate >= 0.7:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="info",
                confidence=0.75,
                title="Strong objective conversion",
                description=(
                    f"Converted {fights_converted} of {fights_won} won fights "
                    f"into objectives ({conversion_rate:.0%}). "
                    f"Efficient use of advantages."
                ),
                data={
                    "fights_won": fights_won,
                    "fights_converted": fights_converted,
                    "conversion_rate": round(conversion_rate, 2),
                },
            ))

        return findings
