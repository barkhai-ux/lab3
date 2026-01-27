from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patch(Base):
    __tablename__ = "patches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    released_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Match(Base):
    __tablename__ = "matches"

    match_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    patch_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("patches.id"), nullable=True
    )
    game_mode: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    lobby_type: Mapped[int | None] = mapped_column(SmallInteger)
    duration_secs: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    radiant_win: Mapped[bool] = mapped_column(Boolean, nullable=False)
    avg_mmr: Mapped[int | None] = mapped_column(Integer)
    replay_url: Mapped[str | None] = mapped_column(Text)
    replay_state: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    players: Mapped[list["MatchPlayer"]] = relationship(
        back_populates="match", cascade="all, delete-orphan"
    )
    replay_file: Mapped["ReplayFile | None"] = relationship(
        back_populates="match", uselist=False
    )


class MatchPlayer(Base):
    __tablename__ = "match_players"
    __table_args__ = (
        UniqueConstraint("match_id", "player_slot", name="uq_match_player_slot"),
        Index("ix_match_players_steam_id", "steam_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("matches.match_id"), nullable=False
    )
    steam_id: Mapped[int | None] = mapped_column(BigInteger)
    player_slot: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    hero_id: Mapped[int] = mapped_column(Integer, nullable=False)
    kills: Mapped[int | None] = mapped_column(Integer)
    deaths: Mapped[int | None] = mapped_column(Integer)
    assists: Mapped[int | None] = mapped_column(Integer)
    gpm: Mapped[int | None] = mapped_column(Integer)
    xpm: Mapped[int | None] = mapped_column(Integer)
    last_hits: Mapped[int | None] = mapped_column(Integer)
    denies: Mapped[int | None] = mapped_column(Integer)
    hero_damage: Mapped[int | None] = mapped_column(Integer)
    tower_damage: Mapped[int | None] = mapped_column(Integer)
    hero_healing: Mapped[int | None] = mapped_column(Integer)
    level: Mapped[int | None] = mapped_column(SmallInteger)
    items: Mapped[dict | None] = mapped_column(JSONB)
    lane: Mapped[int | None] = mapped_column(SmallInteger)
    role: Mapped[int | None] = mapped_column(SmallInteger)

    match: Mapped["Match"] = relationship(back_populates="players")


class ReplayFile(Base):
    __tablename__ = "replay_files"

    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("matches.match_id"), primary_key=True
    )
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger)
    downloaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    match: Mapped["Match"] = relationship(back_populates="replay_file")
