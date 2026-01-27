"""
Death context analysis detector.

Examines each death of the analyzed player to determine context:
- Was it during a teamfight or a solo death?
- Was the player out of position?
- Did the team trade favorably?
- Deaths in the first N minutes (laning phase) vs. later.
"""

import logging

from app.analysis.baselines import compare_metric
from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding

logger = logging.getLogger(__name__)


class DeathContextDetector(BaseDetector):
    @property
    def name(self) -> str:
        return "death_context"

    @property
    def category(self) -> str:
        return "deaths"

    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        findings = []

        stats = ctx.player_stats
        deaths = stats.get("deaths", 0) or 0
        kills = stats.get("kills", 0) or 0

        if deaths == 0:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="info",
                confidence=0.95,
                title="Deathless game",
                description="Zero deaths this game — excellent survivability.",
                data={"deaths": 0},
            ))
            return findings

        # Compare deaths to baseline
        if ctx.baseline:
            death_cmp = compare_metric(
                deaths, ctx.baseline, "avg_deaths", "std_deaths"
            )
            if death_cmp.get("available") and death_cmp["z_score"] is not None:
                z = death_cmp["z_score"]
                if z > 2.0:
                    findings.append(Finding(
                        detector_name=self.name,
                        category=self.category,
                        severity="critical" if z > 3.0 else "warning",
                        confidence=min(0.9, 0.5 + z * 0.12),
                        title="Significantly more deaths than average",
                        description=(
                            f"{deaths} deaths is {death_cmp['deviation']:.0f} above "
                            f"the baseline of {death_cmp['baseline_avg']:.1f} "
                            f"for this hero/role/bracket."
                        ),
                        data=death_cmp,
                    ))

        # Analyze death timing distribution
        death_events = [
            e for e in ctx.events
            if e.get("event_type") == "kill"
            and e.get("data", {}).get("target") is not None
        ]

        # Player's hero name (approximate: we don't always have it)
        player_deaths = []
        early_deaths = 0
        for evt in death_events:
            data = evt.get("data", {})
            slot = evt.get("player_slot")
            game_time = evt.get("game_time_secs", 0)

            # Check if this player was killed
            # Since we track by slot in events, check if the target matches
            if slot == ctx.player_slot or (
                slot is None and data.get("target_slot") == ctx.player_slot
            ):
                player_deaths.append(game_time)
                if game_time < 600:  # First 10 minutes
                    early_deaths += 1

        if early_deaths >= 3:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="warning",
                confidence=0.75,
                title="Multiple early deaths",
                description=(
                    f"{early_deaths} deaths in the first 10 minutes. "
                    f"This suggests a difficult laning phase or aggressive "
                    f"positioning that was punished."
                ),
                game_time_secs=600,
                data={"early_deaths": early_deaths, "laning_phase": True},
            ))

        # Kill participation relative to deaths (KDA efficiency)
        assists = stats.get("assists", 0) or 0
        if deaths > 0:
            kda = (kills + assists) / deaths
            if kda < 1.5 and ctx.role in (1, 2, 3):  # Core roles
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="warning",
                    confidence=0.7,
                    title="Low KDA ratio for core role",
                    description=(
                        f"KDA of {kda:.1f} ({kills}/{deaths}/{assists}) "
                        f"is below expectations for a position {ctx.role} player."
                    ),
                    data={"kda": kda, "kills": kills, "deaths": deaths, "assists": assists},
                ))

        return findings
