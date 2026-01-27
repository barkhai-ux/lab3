"""
Item timing analysis detector.

Compares the player's key item completion times against baselines
for their hero/role/patch/bracket.
"""

import logging

from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding

logger = logging.getLogger(__name__)


class ItemTimingDetector(BaseDetector):
    @property
    def name(self) -> str:
        return "item_timing"

    @property
    def category(self) -> str:
        return "items"

    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        findings = []

        if ctx.baseline is None:
            return findings

        baseline_timings = ctx.baseline.get("avg_item_timings", {})
        if not baseline_timings:
            return findings

        # Extract item purchase events for this player
        purchase_events = [
            e for e in ctx.events
            if e.get("event_type") == "item_purchase"
            and e.get("player_slot") == ctx.player_slot
        ]

        # Build a map of item → purchase time (first occurrence)
        item_times: dict[str, float] = {}
        for evt in purchase_events:
            item = evt.get("data", {}).get("item", "")
            game_time = evt.get("game_time_secs", 0)
            if item and item not in item_times:
                item_times[item] = game_time

        # Compare against baseline timings
        for item_name, baseline_secs in baseline_timings.items():
            actual_secs = item_times.get(item_name)

            if actual_secs is None:
                # Item was never purchased — could be a build deviation
                # Only flag for core items (items in baseline)
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=0.4,
                    title=f"Skipped common item: {item_name}",
                    description=(
                        f"The item '{item_name}' is typically purchased by "
                        f"this hero/role but was not bought this game. "
                        f"This may be a deliberate adaptation or a missed timing."
                    ),
                    data={
                        "item": item_name,
                        "baseline_timing": baseline_secs,
                        "purchased": False,
                    },
                ))
                continue

            deviation_secs = actual_secs - baseline_secs
            deviation_minutes = deviation_secs / 60

            if deviation_secs > 180:  # More than 3 minutes late
                severity = "critical" if deviation_secs > 360 else "warning"
                confidence = min(0.85, 0.5 + (deviation_secs / 600) * 0.3)

                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity=severity,
                    confidence=confidence,
                    title=f"Late {item_name}",
                    description=(
                        f"Completed {item_name} at {actual_secs / 60:.1f} min, "
                        f"which is {deviation_minutes:.1f} min behind the "
                        f"baseline of {baseline_secs / 60:.1f} min."
                    ),
                    game_time_secs=actual_secs,
                    data={
                        "item": item_name,
                        "actual_time": actual_secs,
                        "baseline_time": baseline_secs,
                        "deviation_secs": deviation_secs,
                    },
                ))
            elif deviation_secs < -120:  # More than 2 minutes early
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.8, 0.5 + abs(deviation_secs) / 600 * 0.3),
                    title=f"Fast {item_name}",
                    description=(
                        f"Completed {item_name} at {actual_secs / 60:.1f} min, "
                        f"which is {abs(deviation_minutes):.1f} min ahead of the "
                        f"baseline of {baseline_secs / 60:.1f} min."
                    ),
                    game_time_secs=actual_secs,
                    data={
                        "item": item_name,
                        "actual_time": actual_secs,
                        "baseline_time": baseline_secs,
                        "deviation_secs": deviation_secs,
                    },
                ))

        return findings
