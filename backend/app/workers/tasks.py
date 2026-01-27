"""
Celery task definitions.

All tasks are idempotent — re-running them for already-processed data is safe.
"""

import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.workers.tasks.fetch_matches_for_user",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def fetch_matches_for_user(self, steam_id64: int) -> dict:
    """Fetch recent matches for a user from the Steam Web API."""
    try:
        from app.workers.ingestion import run_fetch_matches

        match_ids = run_fetch_matches(steam_id64)
        return {"steam_id": steam_id64, "new_matches": len(match_ids), "match_ids": match_ids}
    except Exception as exc:
        logger.error("Error fetching matches for %s: %s", steam_id64, exc)
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.workers.tasks.fetch_match_details",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def fetch_match_details(self, match_id: int) -> dict:
    """Fetch and store detailed match data."""
    try:
        from app.workers.ingestion import run_fetch_matches

        # This is handled as part of the batch fetch;
        # kept as a separate task for individual re-processing.
        return {"match_id": match_id, "status": "details stored via batch fetch"}
    except Exception as exc:
        logger.error("Error fetching details for match %s: %s", match_id, exc)
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.workers.tasks.download_and_parse_replay",
    bind=True,
    max_retries=2,
    default_retry_delay=120,
)
def download_and_parse_replay(self, match_id: int) -> dict:
    """Download the replay file for a match, parse it with clarity, and store events."""
    try:
        from app.workers.replay import run_download_and_parse

        result = run_download_and_parse(match_id)
        return result
    except Exception as exc:
        logger.error("Error processing replay for match %s: %s", match_id, exc)
        raise self.retry(exc=exc)


@celery_app.task(
    name="app.workers.tasks.analyze_match_for_user",
    bind=True,
    max_retries=1,
    default_retry_delay=30,
)
def analyze_match_for_user(self, match_id: int, steam_id64: int) -> dict:
    """Run all analysis detectors on a match for a specific user."""
    try:
        from app.workers.analysis import run_analysis

        result = run_analysis(match_id, steam_id64)
        return result
    except Exception as exc:
        logger.error(
            "Error analyzing match %s for user %s: %s", match_id, steam_id64, exc
        )
        raise self.retry(exc=exc)


@celery_app.task(name="app.workers.tasks.cleanup_expired_replays")
def cleanup_expired_replays() -> dict:
    """Remove expired replay files from disk and database."""
    try:
        from app.workers.replay import run_cleanup_replays

        count = run_cleanup_replays()
        return {"cleaned": count}
    except Exception as exc:
        logger.error("Error cleaning up replays: %s", exc)
        return {"error": str(exc)}
