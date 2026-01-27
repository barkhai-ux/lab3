from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.matches import router as matches_router
from app.api.insights import router as insights_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(matches_router, prefix="/api/matches", tags=["matches"])
api_router.include_router(insights_router, prefix="/api/insights", tags=["insights"])
