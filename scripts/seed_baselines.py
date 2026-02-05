"""
Seed hero baselines from OpenDota public data.

This script populates the hero_baselines table with average metrics
per hero/role/patch/bracket. In production, this would be run periodically
or after each major patch.

Usage:
    python scripts/seed_baselines.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.config import settings
from app.database import async_session_factory
from app.models.analysis import HeroBaseline
from app.models.match import Patch

# Sample baseline data for common heroes.
# In production, this would be fetched from OpenDota's explorer SQL
# or their public data dumps.
SAMPLE_BASELINES = [
    # (hero_id, role, patch_name, bracket, metrics)
    (1, 1, "7.37d", 3, {  # Anti-Mage, Carry, Legend bracket
        "avg_gpm": 580, "std_gpm": 95,
        "avg_xpm": 620, "std_xpm": 80,
        "avg_last_hits_10": 60, "avg_last_hits_20": 155,
        "avg_kills": 7.5, "avg_deaths": 4.8, "std_deaths": 2.5,
        "avg_item_timings": {"item_battlefury": 900, "item_manta": 1440},
        "win_rate": 0.50,
    }),
    (2, 2, "7.37d", 3, {  # Axe, Offlane
        "avg_gpm": 420, "std_gpm": 75,
        "avg_xpm": 510, "std_xpm": 65,
        "avg_last_hits_10": 35, "avg_last_hits_20": 85,
        "avg_kills": 8.0, "avg_deaths": 6.5, "std_deaths": 3.0,
        "avg_item_timings": {"item_blink": 720, "item_blade_mail": 960},
        "win_rate": 0.51,
    }),
    (5, 5, "7.37d", 3, {  # Crystal Maiden, Hard Support
        "avg_gpm": 280, "std_gpm": 60,
        "avg_xpm": 340, "std_xpm": 55,
        "avg_last_hits_10": 8, "avg_last_hits_20": 20,
        "avg_kills": 3.0, "avg_deaths": 8.5, "std_deaths": 3.5,
        "avg_item_timings": {"item_glimmer_cape": 1200, "item_force_staff": 1500},
        "win_rate": 0.49,
    }),
    (8, 2, "7.37d", 3, {  # Juggernaut, Carry
        "avg_gpm": 540, "std_gpm": 90,
        "avg_xpm": 580, "std_xpm": 75,
        "avg_last_hits_10": 55, "avg_last_hits_20": 140,
        "avg_kills": 9.0, "avg_deaths": 5.0, "std_deaths": 2.0,
        "avg_item_timings": {"item_battlefury": 840, "item_manta": 1380},
        "win_rate": 0.51,
    }),
    (11, 2, "7.37d", 3, {  # Shadow Fiend, Mid
        "avg_gpm": 520, "std_gpm": 100,
        "avg_xpm": 600, "std_xpm": 85,
        "avg_last_hits_10": 65, "avg_last_hits_20": 160,
        "avg_kills": 8.5, "avg_deaths": 6.0, "std_deaths": 2.8,
        "avg_item_timings": {"item_bkb": 1080, "item_hurricane_pike": 1320},
        "win_rate": 0.48,
    }),
]


async def seed():
    from sqlalchemy import select

    async with async_session_factory() as session:
        # Ensure patch exists
        result = await session.execute(
            select(Patch).where(Patch.name == "7.37d")
        )
        patch = result.scalar_one_or_none()
        if patch is None:
            from datetime import datetime, timezone
            patch = Patch(
                name="7.37d",
                released_at=datetime(2024, 10, 15, tzinfo=timezone.utc),
            )
            session.add(patch)
            await session.flush()

        for hero_id, role, patch_name, bracket, metrics in SAMPLE_BASELINES:
            existing = await session.execute(
                select(HeroBaseline).where(
                    HeroBaseline.hero_id == hero_id,
                    HeroBaseline.role == role,
                    HeroBaseline.patch_id == patch.id,
                    HeroBaseline.mmr_bracket == bracket,
                )
            )
            if existing.scalar_one_or_none() is not None:
                print(f"  Baseline already exists for hero {hero_id}, role {role}")
                continue

            baseline = HeroBaseline(
                hero_id=hero_id,
                role=role,
                patch_id=patch.id,
                mmr_bracket=bracket,
                metrics=metrics,
                sample_size=10000,
            )
            session.add(baseline)
            print(f"  Seeded baseline for hero {hero_id}, role {role}")

        await session.commit()
        print("Done seeding baselines.")


if __name__ == "__main__":
    asyncio.run(seed())
