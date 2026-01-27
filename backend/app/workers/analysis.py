"""
Analysis worker pipeline.

Runs the analysis engine for a specific match and user.
"""

import asyncio
import logging

from app.analysis.engine import analyze_match
from app.database import async_session_factory

logger = logging.getLogger(__name__)


async def execute_analysis(match_id: int, steam_id64: int) -> dict:
    """Run analysis for a player in a match."""
    async with async_session_factory() as session:
        analysis = await analyze_match(match_id, steam_id64, session)
        await session.commit()

        if analysis is None:
            return {
                "match_id": match_id,
                "steam_id": steam_id64,
                "status": "skipped",
                "reason": "Analysis not possible (missing data or already exists)",
            }

        return {
            "match_id": match_id,
            "steam_id": steam_id64,
            "status": "completed",
            "analysis_id": analysis.id,
            "overall_score": analysis.overall_score,
            "findings_count": len(analysis.findings),
        }


def run_analysis(match_id: int, steam_id64: int) -> dict:
    """Synchronous wrapper for Celery."""
    return asyncio.get_event_loop().run_until_complete(
        execute_analysis(match_id, steam_id64)
    )
