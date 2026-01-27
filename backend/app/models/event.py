from sqlalchemy import BigInteger, Float, ForeignKey, Index, Integer, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ParsedEvent(Base):
    __tablename__ = "parsed_events"
    __table_args__ = (
        Index("ix_parsed_events_match_type", "match_id", "event_type"),
        Index("ix_parsed_events_match_tick", "match_id", "tick"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("matches.match_id"), nullable=False
    )
    tick: Mapped[int] = mapped_column(Integer, nullable=False)
    game_time_secs: Mapped[float] = mapped_column(Float, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    player_slot: Mapped[int | None] = mapped_column(SmallInteger)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)


class PlayerStateSnapshot(Base):
    __tablename__ = "player_state_snapshots"
    __table_args__ = (
        Index(
            "ix_snapshots_match_player_time",
            "match_id",
            "player_slot",
            "game_time_secs",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("matches.match_id"), nullable=False
    )
    player_slot: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    game_time_secs: Mapped[float] = mapped_column(Float, nullable=False)
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)
    gold: Mapped[int | None] = mapped_column(Integer)
    xp: Mapped[int | None] = mapped_column(Integer)
    level: Mapped[int | None] = mapped_column(SmallInteger)
    hp: Mapped[int | None] = mapped_column(Integer)
    mana: Mapped[int | None] = mapped_column(Integer)
    items: Mapped[dict | None] = mapped_column(JSONB)
