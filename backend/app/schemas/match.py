from datetime import datetime

from pydantic import BaseModel


class MatchPlayerOut(BaseModel):
    player_slot: int
    steam_id: int | None = None
    hero_id: int
    kills: int | None = None
    deaths: int | None = None
    assists: int | None = None
    gpm: int | None = None
    xpm: int | None = None
    last_hits: int | None = None
    denies: int | None = None
    hero_damage: int | None = None
    tower_damage: int | None = None
    hero_healing: int | None = None
    level: int | None = None
    items: dict | None = None
    lane: int | None = None
    role: int | None = None

    model_config = {"from_attributes": True}


class MatchOut(BaseModel):
    match_id: int
    patch_id: int | None = None
    game_mode: int
    lobby_type: int | None = None
    duration_secs: int
    start_time: datetime
    radiant_win: bool
    avg_mmr: int | None = None
    replay_state: str
    created_at: datetime
    player_hero_id: int | None = None
    player_won: bool | None = None

    model_config = {"from_attributes": True}


class MatchDetailOut(MatchOut):
    players: list[MatchPlayerOut] = []


class MatchListOut(BaseModel):
    matches: list[MatchOut]
    total: int
    page: int
    per_page: int


class EventOut(BaseModel):
    tick: int
    game_time_secs: float
    event_type: str
    player_slot: int | None = None
    data: dict

    model_config = {"from_attributes": True}


class TimelineOut(BaseModel):
    match_id: int
    events: list[EventOut]
    total_events: int


class TaskStatusOut(BaseModel):
    task_id: str
    status: str
    result: dict | None = None
