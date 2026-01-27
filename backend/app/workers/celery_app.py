from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "dota2analyzer",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.tasks.fetch_matches_for_user": {"queue": "ingestion"},
        "app.workers.tasks.fetch_match_details": {"queue": "ingestion"},
        "app.workers.tasks.download_and_parse_replay": {"queue": "parsing"},
        "app.workers.tasks.analyze_match_for_user": {"queue": "analysis"},
        "app.workers.tasks.cleanup_expired_replays": {"queue": "ingestion"},
    },
    beat_schedule={
        "cleanup-expired-replays": {
            "task": "app.workers.tasks.cleanup_expired_replays",
            "schedule": crontab(hour=3, minute=0),  # daily at 3 AM UTC
        },
    },
)

celery_app.autodiscover_tasks(["app.workers"])
