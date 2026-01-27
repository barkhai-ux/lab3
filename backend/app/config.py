from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Steam
    steam_api_key: str = Field(default="")
    steam_openid_realm: str = Field(default="http://localhost:8000")
    steam_openid_return_url: str = Field(
        default="http://localhost:8000/auth/steam/callback"
    )

    # JWT
    jwt_secret_key: str = Field(default="change-me")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expire_minutes: int = Field(default=1440)

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://dota2:dota2pass@localhost:5432/dota2analyzer"
    )
    database_url_sync: str = Field(
        default="postgresql://dota2:dota2pass@localhost:5432/dota2analyzer"
    )

    # Redis / Celery
    redis_url: str = Field(default="redis://localhost:6379/0")
    celery_broker_url: str = Field(default="redis://localhost:6379/1")
    celery_result_backend: str = Field(default="redis://localhost:6379/2")

    # Replay parser
    clarity_jar_path: str = Field(default="/app/parser/clarity.jar")
    replay_storage_path: str = Field(default="/app/data/replays")
    replay_retention_days: int = Field(default=7)

    # OpenDota
    opendota_api_url: str = Field(default="https://api.opendota.com/api")
    opendota_api_key: str = Field(default="")

    # Frontend
    frontend_url: str = Field(default="http://localhost:3000")
    cors_origins: str = Field(default="http://localhost:3000")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
