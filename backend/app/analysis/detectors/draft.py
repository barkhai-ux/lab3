"""
Draft analysis detector.

Analyzes team composition, hero synergies, and counter picks
to evaluate the draft phase of the match.
"""

import logging

from app.analysis.detectors.base import BaseDetector, DetectorContext, Finding
from app.data.hero_matchups import (
    get_hero_name,
    get_hero_synergies,
    get_team_counters,
)

logger = logging.getLogger(__name__)


class DraftAnalysisDetector(BaseDetector):
    @property
    def name(self) -> str:
        return "draft_analysis"

    @property
    def category(self) -> str:
        return "draft"

    def analyze(self, ctx: DetectorContext) -> list[Finding]:
        findings = []

        # Split players by team
        radiant_players = [p for p in ctx.all_players if p["player_slot"] < 5]
        dire_players = [p for p in ctx.all_players if p["player_slot"] >= 5]

        radiant_heroes = [p["hero_id"] for p in radiant_players]
        dire_heroes = [p["hero_id"] for p in dire_players]

        # Determine player's team
        is_radiant = ctx.player_slot < 5
        player_team_heroes = radiant_heroes if is_radiant else dire_heroes
        enemy_team_heroes = dire_heroes if is_radiant else radiant_heroes
        team_name = "Radiant" if is_radiant else "Dire"
        enemy_name = "Dire" if is_radiant else "Radiant"

        # Analyze synergies within player's team
        team_synergies = get_hero_synergies(player_team_heroes)
        enemy_synergies = get_hero_synergies(enemy_team_heroes)

        # Analyze counters between teams
        team_counters, enemy_counters = get_team_counters(
            player_team_heroes, enemy_team_heroes
        )

        # Finding: Strong team synergies
        if team_synergies:
            strong_synergies = [(h1, h2, s) for h1, h2, s in team_synergies if s >= 0.75]
            if strong_synergies:
                synergy_descriptions = []
                for h1, h2, score in strong_synergies[:3]:  # Top 3
                    synergy_descriptions.append(
                        f"{get_hero_name(h1)} + {get_hero_name(h2)} ({score:.0%})"
                    )

                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.9, sum(s for _, _, s in strong_synergies) / len(strong_synergies)),
                    title="Strong team synergies",
                    description=(
                        f"Your team has strong hero combinations: "
                        f"{', '.join(synergy_descriptions)}. "
                        f"Coordinate with these heroes for maximum impact."
                    ),
                    data={
                        "synergies": [
                            {"hero1": h1, "hero2": h2, "score": s}
                            for h1, h2, s in strong_synergies
                        ],
                        "team": team_name,
                    },
                ))

        # Finding: Weak draft synergy
        total_synergy_score = sum(s for _, _, s in team_synergies)
        if not team_synergies or total_synergy_score < 0.5:
            findings.append(Finding(
                detector_name=self.name,
                category=self.category,
                severity="warning",
                confidence=0.6,
                title="Limited draft synergy",
                description=(
                    f"Your team's draft lacks strong hero combinations. "
                    f"Focus on individual hero strengths rather than combo plays."
                ),
                data={
                    "total_synergy_score": total_synergy_score,
                    "team": team_name,
                },
            ))

        # Finding: Good counter picks
        if team_counters:
            strong_counters = [(c, counter, s) for c, counter, s in team_counters if s >= 0.75]
            if strong_counters:
                counter_descriptions = []
                for countered, counter, score in strong_counters[:3]:
                    counter_descriptions.append(
                        f"{get_hero_name(counter)} counters {get_hero_name(countered)}"
                    )

                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.85, sum(s for _, _, s in strong_counters) / len(strong_counters)),
                    title="Good counter picks",
                    description=(
                        f"Your team has effective counters: "
                        f"{'; '.join(counter_descriptions)}. "
                        f"Prioritize targeting these heroes."
                    ),
                    data={
                        "counters": [
                            {"countered": c, "counter": counter, "score": s}
                            for c, counter, s in strong_counters
                        ],
                        "team": team_name,
                    },
                ))

        # Finding: Draft is countered
        if enemy_counters:
            hard_counters = [(c, counter, s) for c, counter, s in enemy_counters if s >= 0.75]
            if hard_counters:
                counter_descriptions = []
                for countered, counter, score in hard_counters[:3]:
                    counter_descriptions.append(
                        f"{get_hero_name(countered)} by {get_hero_name(counter)}"
                    )

                # Determine severity based on number and strength of counters
                avg_counter_score = sum(s for _, _, s in hard_counters) / len(hard_counters)
                severity = "critical" if len(hard_counters) >= 3 or avg_counter_score >= 0.85 else "warning"

                # Check if player's hero is specifically countered
                player_countered = any(c == ctx.hero_id for c, _, _ in hard_counters)

                if player_countered:
                    player_counter_info = next(
                        (c, counter, s) for c, counter, s in hard_counters
                        if c == ctx.hero_id
                    )
                    description = (
                        f"Your hero ({get_hero_name(ctx.hero_id)}) is countered by "
                        f"{get_hero_name(player_counter_info[1])} ({player_counter_info[2]:.0%} effectiveness). "
                        f"Play cautiously and consider itemizing defensively."
                    )
                else:
                    description = (
                        f"Teammates countered: {'; '.join(counter_descriptions)}. "
                        f"Support these heroes and help them survive."
                    )

                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity=severity,
                    confidence=avg_counter_score,
                    title="Draft countered by enemy",
                    description=description,
                    data={
                        "countered": [
                            {"hero": c, "counter": counter, "score": s}
                            for c, counter, s in hard_counters
                        ],
                        "player_hero_countered": player_countered,
                        "enemy_team": enemy_name,
                    },
                ))

        # Finding: Enemy team synergies to watch out for
        if enemy_synergies:
            enemy_strong = [(h1, h2, s) for h1, h2, s in enemy_synergies if s >= 0.80]
            if enemy_strong:
                synergy_descriptions = []
                for h1, h2, score in enemy_strong[:2]:
                    synergy_descriptions.append(
                        f"{get_hero_name(h1)} + {get_hero_name(h2)}"
                    )

                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="warning",
                    confidence=0.7,
                    title="Beware enemy combos",
                    description=(
                        f"Enemy team has dangerous combinations: "
                        f"{', '.join(synergy_descriptions)}. "
                        f"Avoid grouping or position carefully in fights."
                    ),
                    data={
                        "enemy_synergies": [
                            {"hero1": h1, "hero2": h2, "score": s}
                            for h1, h2, s in enemy_strong
                        ],
                        "enemy_team": enemy_name,
                    },
                ))

        # Finding: Draft summary
        team_synergy_total = sum(s for _, _, s in team_synergies)
        team_counter_total = sum(s for _, _, s in team_counters)
        enemy_counter_total = sum(s for _, _, s in enemy_counters)

        draft_advantage = team_synergy_total + team_counter_total - enemy_counter_total

        if abs(draft_advantage) >= 1.0:
            if draft_advantage > 0:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="info",
                    confidence=min(0.8, draft_advantage / 3),
                    title="Draft advantage",
                    description=(
                        f"Your team has a drafting advantage with better synergies "
                        f"and counter picks. Play around your draft strengths."
                    ),
                    data={
                        "draft_score": round(draft_advantage, 2),
                        "synergy_score": round(team_synergy_total, 2),
                        "counter_score": round(team_counter_total, 2),
                        "countered_score": round(enemy_counter_total, 2),
                    },
                ))
            else:
                findings.append(Finding(
                    detector_name=self.name,
                    category=self.category,
                    severity="warning",
                    confidence=min(0.75, abs(draft_advantage) / 3),
                    title="Draft disadvantage",
                    description=(
                        f"Your team is at a drafting disadvantage. "
                        f"Focus on outplaying mechanically and avoid direct confrontations "
                        f"where counters are most effective."
                    ),
                    data={
                        "draft_score": round(draft_advantage, 2),
                        "synergy_score": round(team_synergy_total, 2),
                        "counter_score": round(team_counter_total, 2),
                        "countered_score": round(enemy_counter_total, 2),
                    },
                ))

        return findings
