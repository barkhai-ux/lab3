"""
Farming efficiency detector.

Analyzes GPM, XPM, last hits, and farm patterns relative to hero/role baselines.
"""

import logging

from app.analysis.baselines import compare_metric
from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding

logger = logging.getLogger(__name__)


class FarmingDetector(BaseDetector):
    @property
    def name(self) -> str:
        return "farming_efficiency"

    @property
    def category(self) -> str:
        return "farming"

    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        findings = []

        if ctx.baseline is None:
            return findings

        stats = ctx.player_stats

        # GPM analysis
        gpm = stats.get("gpm")
        if gpm is not None:
            gpm_cmp = compare_metric(gpm, ctx.baseline, "avg_gpm", "std_gpm")
            if gpm_cmp.get("available") and gpm_cmp["z_score"] is not None:
                z = gpm_cmp["z_score"]

                if z < -1.5:
                    findings.append(Finding(
                        detector_name=self.name,
                        category=self.category,
                        severity="warning" if z > -2.5 else "critical",
                        confidence=min(0.9, 0.5 + abs(z) * 0.15),
                        title="Below-average gold income",
                        description=(
                            f"GPM of {gpm} is {abs(gpm_cmp['deviation']):.0f} below "
                            f"the baseline average of {gpm_cmp['baseline_avg']:.0f} "
                            f"for this hero/role/bracket (z={z:.1f})."
                        ),
                        data=gpm_cmp,
                    ))
                elif z > 1.5:
                    findings.append(Finding(
                        detector_name=self.name,
                        category=self.category,
                        severity="info",
                        confidence=min(0.9, 0.5 + z * 0.15),
                        title="Above-average gold income",
                        description=(
                            f"GPM of {gpm} is {gpm_cmp['deviation']:.0f} above "
                            f"the baseline average of {gpm_cmp['baseline_avg']:.0f} "
                            f"for this hero/role/bracket (z={z:.1f})."
                        ),
                        data=gpm_cmp,
                    ))

        # XPM analysis
        xpm = stats.get("xpm")
        if xpm is not None:
            xpm_cmp = compare_metric(xpm, ctx.baseline, "avg_xpm", "std_xpm")
            if xpm_cmp.get("available") and xpm_cmp["z_score"] is not None:
                z = xpm_cmp["z_score"]

                if z < -1.5:
                    findings.append(Finding(
                        detector_name=self.name,
                        category=self.category,
                        severity="warning",
                        confidence=min(0.85, 0.5 + abs(z) * 0.12),
                        title="Below-average experience income",
                        description=(
                            f"XPM of {xpm} is {abs(xpm_cmp['deviation']):.0f} below "
                            f"the baseline ({xpm_cmp['baseline_avg']:.0f}). "
                            f"This suggests time spent dead, inefficient rotations, "
                            f"or contested farm."
                        ),
                        data=xpm_cmp,
                    ))

        # Last hits at 10 minutes (from snapshots)
        ten_min_snap = None
        for snap in ctx.snapshots:
            if (
                snap.get("player_slot") == ctx.player_slot
                and 540 <= snap.get("game_time_secs", 0) <= 660
            ):
                ten_min_snap = snap
                break

        if ten_min_snap and ctx.role in (1, 2):  # Carry or Mid
            # Check if gold at 10 min is reasonable
            gold_10 = ten_min_snap.get("gold", 0)
            expected_gpm = ctx.baseline.get("avg_gpm", 0)
            expected_gold_10 = expected_gpm * 10
            if expected_gold_10 > 0:
                ratio = gold_10 / expected_gold_10
                if ratio < 0.7:
                    findings.append(Finding(
                        detector_name=self.name,
                        category=self.category,
                        severity="warning",
                        confidence=0.6,
                        title="Weak laning phase farm",
                        description=(
                            f"Gold at 10 minutes ({gold_10}) is significantly "
                            f"below the expected pace for this hero and role."
                        ),
                        game_time_secs=600,
                        data={"gold_10": gold_10, "expected": expected_gold_10},
                    ))

        return findings
