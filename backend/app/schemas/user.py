from datetime import datetime

from pydantic import BaseModel


class UserOut(BaseModel):
    steam_id: int
    persona_name: str
    avatar_url: str | None = None
    profile_url: str | None = None
    is_public: bool = True
    created_at: datetime
    last_login: datetime | None = None

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    steam_id: int
    persona_name: str
