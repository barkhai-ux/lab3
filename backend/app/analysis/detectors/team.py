"""
Team analysis detector.

Compares performance metrics between the two teams and analyzes
lane matchups and team fight dynamics.
"""

import logging

from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding
from app.data.hero_matchups import get_hero_name

logger = logging.getLogger(__name__)


class TeamAnalysisDetector(BaseDetector):
    @property
    def name(self) -> str:
        return "team_analysis"

    @property
    def category(self) -> str:
        return "team"

    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        findings = []

        # Split players by team
        radiant_players = [p for p in ctx.all_players if p["player_slot"] < 5]
        dire_players = [p for p in ctx.all_players if p["player_slot"] >= 5]

        # Determine player's team
        is_radiant = ctx.player_slot < 5
        player_team = radiant_players if is_radiant else dire_players
        enemy_team = dire_players if is_radiant else radiant_players
        team_name = "Radiant" if is_radiant else "Dire"
        enemy_name = "Dire" if is_radiant else "Radiant"

        # Aggregate team stats
        team_stats = self._aggregate_team_stats(player_team)
        enemy_stats = self._aggregate_team_stats(enemy_team)

        # Team fight analysis (kills/deaths comparison)
        kill_diff = team_stats["total_kills"] - enemy_stats["total_kills"]
        death_diff = team_stats["total_deaths"] - enemy_stats["total_deaths"]

        if abs(kill_diff) >= 10:
            if kill_diff > 0:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.9, kill_diff / 30),
                    title="Team fight dominance",
                    description=(
                        f"Your team secured {kill_diff} more kills than the enemy "
                        f"({team_stats['total_kills']} vs {enemy_stats['total_kills']}). "
                        f"Strong team fighting performance."
                    ),
                    data={
                        "team_kills": team_stats["total_kills"],
                        "enemy_kills": enemy_stats["total_kills"],
                        "kill_difference": kill_diff,
                    },
                ))
            else:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="warning",
                    confidence=min(0.85, abs(kill_diff) / 30),
                    title="Team fight disadvantage",
                    description=(
                        f"Your team had {abs(kill_diff)} fewer kills "
                        f"({team_stats['total_kills']} vs {enemy_stats['total_kills']}). "
                        f"Consider avoiding fights or improving coordination."
                    ),
                    data={
                        "team_kills": team_stats["total_kills"],
                        "enemy_kills": enemy_stats["total_kills"],
                        "kill_difference": kill_diff,
                    },
                ))

        # GPM comparison - estimate gold advantage
        gpm_diff = team_stats["avg_gpm"] - enemy_stats["avg_gpm"]
        estimated_gold_diff = gpm_diff * 5 * (ctx.duration_secs / 60)  # 5 players * minutes

        if abs(estimated_gold_diff) >= 10000:
            if estimated_gold_diff > 0:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.85, estimated_gold_diff / 30000),
                    title="Gold advantage",
                    description=(
                        f"Your team had ~{estimated_gold_diff / 1000:.0f}k gold advantage "
                        f"(avg GPM: {team_stats['avg_gpm']:.0f} vs {enemy_stats['avg_gpm']:.0f}). "
                        f"Good economic performance."
                    ),
                    data={
                        "team_avg_gpm": team_stats["avg_gpm"],
                        "enemy_avg_gpm": enemy_stats["avg_gpm"],
                        "estimated_gold_diff": round(estimated_gold_diff),
                    },
                ))
            else:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="warning",
                    confidence=min(0.8, abs(estimated_gold_diff) / 30000),
                    title="Gold disadvantage",
                    description=(
                        f"Your team was ~{abs(estimated_gold_diff) / 1000:.0f}k gold behind "
                        f"(avg GPM: {team_stats['avg_gpm']:.0f} vs {enemy_stats['avg_gpm']:.0f}). "
                        f"Farm more efficiently or take advantageous fights."
                    ),
                    data={
                        "team_avg_gpm": team_stats["avg_gpm"],
                        "enemy_avg_gpm": enemy_stats["avg_gpm"],
                        "estimated_gold_diff": round(estimated_gold_diff),
                    },
                ))

        # Tower damage comparison - objective focus
        tower_diff = team_stats["total_tower_damage"] - enemy_stats["total_tower_damage"]
        tower_ratio = (
            team_stats["total_tower_damage"] / max(1, enemy_stats["total_tower_damage"])
        )

        if team_stats["total_tower_damage"] > 5000 and tower_ratio >= 1.5:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="info",
                confidence=min(0.8, tower_ratio / 3),
                title="Strong objective focus",
                description=(
                    f"Your team dealt {team_stats['total_tower_damage']:,} tower damage "
                    f"({tower_ratio:.1f}x enemy). Good objective-focused play."
                ),
                data={
                    "team_tower_damage": team_stats["total_tower_damage"],
                    "enemy_tower_damage": enemy_stats["total_tower_damage"],
                    "tower_ratio": round(tower_ratio, 2),
                },
            ))
        elif enemy_stats["total_tower_damage"] > 5000 and tower_ratio <= 0.6:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="warning",
                confidence=min(0.75, 1 / max(0.1, tower_ratio) / 3),
                title="Low objective damage",
                description=(
                    f"Your team dealt only {team_stats['total_tower_damage']:,} tower damage "
                    f"vs enemy's {enemy_stats['total_tower_damage']:,}. "
                    f"Prioritize taking objectives after won fights."
                ),
                data={
                    "team_tower_damage": team_stats["total_tower_damage"],
                    "enemy_tower_damage": enemy_stats["total_tower_damage"],
                    "tower_ratio": round(tower_ratio, 2),
                },
            ))

        # Hero damage comparison
        hero_dmg_diff = team_stats["total_hero_damage"] - enemy_stats["total_hero_damage"]
        if abs(hero_dmg_diff) >= 20000:
            if hero_dmg_diff > 0:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.8, hero_dmg_diff / 50000),
                    title="High team damage output",
                    description=(
                        f"Your team dealt {hero_dmg_diff / 1000:.0f}k more hero damage "
                        f"({team_stats['total_hero_damage'] / 1000:.0f}k total). "
                        f"Strong damage contribution in fights."
                    ),
                    data={
                        "team_hero_damage": team_stats["total_hero_damage"],
                        "enemy_hero_damage": enemy_stats["total_hero_damage"],
                        "damage_diff": hero_dmg_diff,
                    },
                ))

        # Lane analysis - compare by role/lane
        lane_findings = self._analyze_lanes(player_team, enemy_team, is_radiant)
        findings.extend(lane_findings)

        # Support contribution
        support_findings = self._analyze_support_contribution(player_team, enemy_team, is_radiant)
        findings.extend(support_findings)

        # Team composition balance
        composition_findings = self._analyze_team_composition(player_team, team_name)
        findings.extend(composition_findings)

        return findings

    def _aggregate_team_stats(self, players: list[dict]) -> dict:
        """Aggregate stats for a team."""
        return {
            "total_kills": sum(p.get("kills", 0) or 0 for p in players),
            "total_deaths": sum(p.get("deaths", 0) or 0 for p in players),
            "total_assists": sum(p.get("assists", 0) or 0 for p in players),
            "avg_gpm": sum(p.get("gpm", 0) or 0 for p in players) / max(1, len(players)),
            "avg_xpm": sum(p.get("xpm", 0) or 0 for p in players) / max(1, len(players)),
            "total_hero_damage": sum(p.get("hero_damage", 0) or 0 for p in players),
            "total_tower_damage": sum(p.get("tower_damage", 0) or 0 for p in players),
            "total_healing": sum(p.get("hero_healing", 0) or 0 for p in players),
            "total_last_hits": sum(p.get("last_hits", 0) or 0 for p in players),
        }

    def _analyze_lanes(
        self,
        player_team: list[dict],
        enemy_team: list[dict],
        is_radiant: bool
    ) -> list[Finding]:
        """Analyze lane matchups by comparing players in the same lane."""
        findings = []

        # Group players by lane
        team_by_lane: dict[int, list[dict]] = {}
        enemy_by_lane: dict[int, list[dict]] = {}

        for p in player_team:
            lane = p.get("lane") or 0
            if lane:
                team_by_lane.setdefault(lane, []).append(p)

        for p in enemy_team:
            lane = p.get("lane") or 0
            if lane:
                enemy_by_lane.setdefault(lane, []).append(p)

        lane_names = {1: "Safe Lane", 2: "Mid Lane", 3: "Off Lane"}

        for lane_id, lane_name in lane_names.items():
            team_lane = team_by_lane.get(lane_id, [])
            enemy_lane = enemy_by_lane.get(lane_id, [])

            if not team_lane or not enemy_lane:
                continue

            # Compare last hits as proxy for lane winning
            team_cs = sum(p.get("last_hits", 0) or 0 for p in team_lane)
            enemy_cs = sum(p.get("last_hits", 0) or 0 for p in enemy_lane)
            team_deaths = sum(p.get("deaths", 0) or 0 for p in team_lane)
            enemy_deaths = sum(p.get("deaths", 0) or 0 for p in enemy_lane)

            cs_diff = team_cs - enemy_cs
            death_diff = team_deaths - enemy_deaths

            # Significant lane difference
            if abs(cs_diff) >= 30 or abs(death_diff) >= 3:
                won_lane = cs_diff > 20 or (cs_diff >= 0 and death_diff < -2)
                lost_lane = cs_diff < -20 or (cs_diff <= 0 and death_diff > 2)

                if won_lane:
                    findings.append(Finding(
                        detector_name=self.name,
                        category=self.category,
                        severity="info",
                        confidence=min(0.75, abs(cs_diff) / 60 + abs(death_diff) / 5),
                        title=f"{lane_name} won",
                        description=(
                            f"Your {lane_name.lower()} had +{cs_diff} CS advantage "
                            f"and {abs(death_diff)} fewer deaths. Strong laning phase."
                        ),
                        data={
                            "lane": lane_id,
                            "lane_name": lane_name,
                            "cs_diff": cs_diff,
                            "death_diff": death_diff,
                        },
                    ))
                elif lost_lane:
                    findings.append(Finding(
                        detector_name=self.name,
                        category=self.category,
                        severity="warning",
                        confidence=min(0.7, abs(cs_diff) / 60 + abs(death_diff) / 5),
                        title=f"{lane_name} lost",
                        description=(
                            f"Your {lane_name.lower()} had {cs_diff} CS deficit "
                            f"and {death_diff} more deaths. Consider earlier rotations."
                        ),
                        data={
                            "lane": lane_id,
                            "lane_name": lane_name,
                            "cs_diff": cs_diff,
                            "death_diff": death_diff,
                        },
                    ))

        return findings

    def _analyze_support_contribution(
        self,
        player_team: list[dict],
        enemy_team: list[dict],
        is_radiant: bool
    ) -> list[Finding]:
        """Analyze support player contribution."""
        findings = []

        # Get supports (role 4 and 5)
        team_supports = [p for p in player_team if p.get("role") in (4, 5)]
        enemy_supports = [p for p in enemy_team if p.get("role") in (4, 5)]

        if not team_supports:
            return findings

        # Compare assist participation
        team_total_kills = sum(p.get("kills", 0) or 0 for p in player_team)
        support_assists = sum(p.get("assists", 0) or 0 for p in team_supports)
        support_deaths = sum(p.get("deaths", 0) or 0 for p in team_supports)

        if team_total_kills > 0:
            assist_participation = support_assists / team_total_kills

            if assist_participation >= 0.7:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.8, assist_participation),
                    title="High support participation",
                    description=(
                        f"Supports participated in {assist_participation:.0%} of kills "
                        f"({support_assists} assists). Excellent team coordination."
                    ),
                    data={
                        "support_assists": support_assists,
                        "team_kills": team_total_kills,
                        "participation_rate": round(assist_participation, 2),
                    },
                ))
            elif assist_participation <= 0.3 and team_total_kills >= 15:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="warning",
                    confidence=0.6,
                    title="Low support participation",
                    description=(
                        f"Supports only participated in {assist_participation:.0%} of kills. "
                        f"Better positioning and smoke rotations could help."
                    ),
                    data={
                        "support_assists": support_assists,
                        "team_kills": team_total_kills,
                        "participation_rate": round(assist_participation, 2),
                    },
                ))

        return findings

    def _analyze_team_composition(
        self,
        player_team: list[dict],
        team_name: str
    ) -> list[Finding]:
        """Analyze team role composition."""
        findings = []

        roles = [p.get("role") for p in player_team if p.get("role")]

        # Check for missing core roles
        has_carry = 1 in roles
        has_mid = 2 in roles
        has_offlane = 3 in roles
        has_support = 4 in roles or 5 in roles

        if not has_carry and not has_mid:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="warning",
                confidence=0.6,
                title="Unusual team composition",
                description=(
                    f"No clear position 1 or 2 detected. Ensure farm priority "
                    f"is understood within the team."
                ),
                data={
                    "roles_detected": roles,
                    "team": team_name,
                },
            ))

        # Count cores vs supports
        core_count = sum(1 for r in roles if r in (1, 2, 3))
        support_count = sum(1 for r in roles if r in (4, 5))

        if core_count >= 4:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="info",
                confidence=0.65,
                title="Greedy lineup",
                description=(
                    f"Your team has {core_count} core heroes. "
                    f"Ensure good early game to secure farm for everyone."
                ),
                data={
                    "core_count": core_count,
                    "support_count": support_count,
                },
            ))

        return findings
