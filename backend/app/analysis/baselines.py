"""
Hero/role/patch/MMR baselines.

Provides reference metrics to compare individual player performance against.
Baselines are stored in the hero_baselines table, keyed by
(hero_id, role, patch_id, mmr_bracket).

All comparisons produce z-scores: (observed - mean) / std_dev.
"""

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import HeroBaseline

logger = logging.getLogger(__name__)

# MMR bracket boundaries
MMR_BRACKETS = {
    1: (0, 1540),       # Herald/Guardian
    2: (1540, 2310),    # Crusader/Archon
    3: (2310, 3080),    # Legend/Ancient
    4: (3080, 3850),    # Divine
    5: (3850, 99999),   # Immortal
}


def mmr_to_bracket(mmr: int | None) -> int:
    """Convert an MMR value to a bracket number (1-5)."""
    if mmr is None:
        return 3  # Default to middle bracket
    for bracket, (low, high) in MMR_BRACKETS.items():
        if low <= mmr < high:
            return bracket
    return 5


async def get_baseline(
    session: AsyncSession,
    hero_id: int,
    role: int,
    patch_id: int | None,
    mmr_bracket: int,
) -> dict[str, Any] | None:
    """
    Fetch the baseline metrics for a specific hero/role/patch/bracket.

    Falls back to:
    1. Same hero/role/patch, any bracket
    2. Same hero/role, any patch/bracket
    3. None
    """
    # Exact match
    if patch_id is not None:
        result = await session.execute(
            select(HeroBaseline).where(
                HeroBaseline.hero_id == hero_id,
                HeroBaseline.role == role,
                HeroBaseline.patch_id == patch_id,
                HeroBaseline.mmr_bracket == mmr_bracket,
            )
        )
        baseline = result.scalar_one_or_none()
        if baseline:
            return baseline.metrics

    # Fallback: any bracket in same patch
    if patch_id is not None:
        result = await session.execute(
            select(HeroBaseline).where(
                HeroBaseline.hero_id == hero_id,
                HeroBaseline.role == role,
                HeroBaseline.patch_id == patch_id,
            ).limit(1)
        )
        baseline = result.scalar_one_or_none()
        if baseline:
            return baseline.metrics

    # Fallback: any patch/bracket
    result = await session.execute(
        select(HeroBaseline).where(
            HeroBaseline.hero_id == hero_id,
            HeroBaseline.role == role,
        ).limit(1)
    )
    baseline = result.scalar_one_or_none()
    if baseline:
        return baseline.metrics

    return None


def compute_z_score(observed: float, mean: float, std: float) -> float:
    """Compute a z-score. Returns 0 if std is 0."""
    if std == 0:
        return 0.0
    return (observed - mean) / std


def compare_metric(
    observed: float,
    baseline: dict,
    metric_avg_key: str,
    metric_std_key: str,
) -> dict:
    """
    Compare an observed metric against a baseline.

    Returns a dict with the z-score, percentile estimate, and interpretation.
    """
    avg = baseline.get(metric_avg_key)
    std = baseline.get(metric_std_key)

    if avg is None or std is None:
        return {"z_score": None, "available": False}

    z = compute_z_score(observed, avg, std)

    return {
        "observed": observed,
        "baseline_avg": avg,
        "baseline_std": std,
        "z_score": round(z, 2),
        "deviation": round(observed - avg, 1),
        "available": True,
    }
