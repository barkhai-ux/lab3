from datetime import datetime

from pydantic import BaseModel


class FindingOut(BaseModel):
    detector_name: str
    category: str | None = None
    severity: str | None = None
    confidence: float | None = None
    title: str | None = None
    description: str | None = None
    game_time_secs: float | None = None
    data: dict | None = None

    model_config = {"from_attributes": True}


class MatchAnalysisOut(BaseModel):
    id: int
    match_id: int
    steam_id: int
    overall_score: float | None = None
    summary: str | None = None
    created_at: datetime
    findings: list[FindingOut] = []

    model_config = {"from_attributes": True}


class HeroPerformance(BaseModel):
    hero_id: int
    matches_played: int
    wins: int
    losses: int
    avg_kills: float
    avg_deaths: float
    avg_assists: float
    avg_gpm: float
    avg_xpm: float
    avg_score: float | None = None


class AggregateInsights(BaseModel):
    total_matches: int
    total_wins: int
    total_losses: int
    win_rate: float
    most_played_heroes: list[HeroPerformance]
    avg_overall_score: float | None = None
    top_findings: list[FindingOut] = []
