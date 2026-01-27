from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
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


class MatchAnalysis(Base):
    __tablename__ = "match_analyses"
    __table_args__ = (
        UniqueConstraint("match_id", "steam_id", name="uq_analysis_match_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("matches.match_id"), nullable=False
    )
    steam_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    overall_score: Mapped[float | None] = mapped_column(Float)
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    patch_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("patches.id")
    )

    findings: Mapped[list["AnalysisFinding"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )


class AnalysisFinding(Base):
    __tablename__ = "analysis_findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("match_analyses.id"), nullable=False
    )
    detector_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    severity: Mapped[str | None] = mapped_column(String(20))
    confidence: Mapped[float | None] = mapped_column(Float)
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    game_time_secs: Mapped[float | None] = mapped_column(Float)
    data: Mapped[dict | None] = mapped_column(JSONB)

    analysis: Mapped["MatchAnalysis"] = relationship(back_populates="findings")


class HeroBaseline(Base):
    __tablename__ = "hero_baselines"
    __table_args__ = (
        UniqueConstraint(
            "hero_id", "role", "patch_id", "mmr_bracket",
            name="uq_hero_baseline",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hero_id: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    patch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patches.id"), nullable=False
    )
    mmr_bracket: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    metrics: Mapped[dict] = mapped_column(JSONB, nullable=False)
    sample_size: Mapped[int | None] = mapped_column(Integer)
