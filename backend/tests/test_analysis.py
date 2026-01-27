"""Tests for analysis detectors and baselines."""

from app.analysis.baselines import compute_z_score, mmr_to_bracket
from app.analysis.detectors.base import DetectorContext, Finding
from app.analysis.detectors.farming import FarmingDetector
from app.analysis.detectors.deaths import DeathContextDetector
from app.analysis.features.lanes import classify_position


def test_compute_z_score():
    assert compute_z_score(500, 450, 50) == 1.0
    assert compute_z_score(400, 450, 50) == -1.0
    assert compute_z_score(450, 450, 0) == 0.0


def test_mmr_to_bracket():
    assert mmr_to_bracket(None) == 3
    assert mmr_to_bracket(1000) == 1
    assert mmr_to_bracket(2500) == 3
    assert mmr_to_bracket(4000) == 5


def test_classify_position():
    assert classify_position(125, 125) == "mid"
    assert classify_position(200, 30) == "bot"
    assert classify_position(30, 200) == "top"
    assert classify_position(130, 50) == "jungle"


def _make_context(**overrides) -> DetectorContext:
    defaults = {
        "match_id": 1,
        "steam_id": 123,
        "player_slot": 0,
        "hero_id": 1,
        "role": 1,
        "lane": 1,
        "duration_secs": 2400,
        "is_radiant": True,
        "won": True,
        "player_stats": {
            "gpm": 300, "xpm": 350, "kills": 5, "deaths": 10, "assists": 3,
            "last_hits": 100, "denies": 5,
        },
        "baseline": {
            "avg_gpm": 500, "std_gpm": 80,
            "avg_xpm": 550, "std_xpm": 70,
            "avg_deaths": 5.0, "std_deaths": 2.0,
        },
        "events": [],
        "snapshots": [],
        "all_players": [],
        "teamfights": [],
    }
    defaults.update(overrides)
    return DetectorContext(**defaults)


def test_farming_detector_low_gpm():
    ctx = _make_context()
    detector = FarmingDetector()
    findings = detector.analyze(ctx)
    assert len(findings) >= 1
    gpm_finding = next(f for f in findings if "gold income" in f.title.lower())
    assert gpm_finding.severity in ("warning", "critical")
    assert gpm_finding.confidence > 0


def test_death_detector_high_deaths():
    ctx = _make_context(
        player_stats={"kills": 2, "deaths": 15, "assists": 1, "gpm": 300, "xpm": 300}
    )
    detector = DeathContextDetector()
    findings = detector.analyze(ctx)
    assert len(findings) >= 1
    death_finding = next(f for f in findings if "deaths" in f.title.lower())
    assert death_finding.severity in ("warning", "critical")


def test_death_detector_zero_deaths():
    ctx = _make_context(
        player_stats={"kills": 10, "deaths": 0, "assists": 8, "gpm": 600, "xpm": 650}
    )
    detector = DeathContextDetector()
    findings = detector.analyze(ctx)
    assert any("deathless" in f.title.lower() for f in findings)
