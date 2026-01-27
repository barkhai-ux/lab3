"""Tests for ingestion pipeline and Steam API client helper methods."""

from datetime import datetime, timezone

from app.services.steam_api import SteamAPIClient
from app.workers.ingestion import determine_patch


def test_steam_id64_to_account_id():
    assert SteamAPIClient.steam_id64_to_account_id(76561198000000000) == 39734272


def test_parse_start_time():
    dt = SteamAPIClient.parse_start_time(1700000000)
    assert dt.year == 2023
    assert dt.tzinfo is not None


# ── determine_patch tests ──────────────────────────────


def _make_patches() -> dict[str, tuple[int, datetime]]:
    """Build a test patches dict matching KNOWN_PATCHES structure."""
    return {
        "7.37": (1, datetime(2024, 9, 1, tzinfo=timezone.utc)),
        "7.37b": (2, datetime(2024, 9, 15, tzinfo=timezone.utc)),
        "7.37c": (3, datetime(2024, 10, 1, tzinfo=timezone.utc)),
        "7.37d": (4, datetime(2024, 10, 15, tzinfo=timezone.utc)),
    }


def test_determine_patch_exact_match():
    """Match starting exactly at a patch release gets that patch."""
    patches = _make_patches()
    result = determine_patch(datetime(2024, 9, 15, tzinfo=timezone.utc), patches)
    assert result == 2  # 7.37b


def test_determine_patch_between_patches():
    """Match between two patches gets the earlier one."""
    patches = _make_patches()
    result = determine_patch(datetime(2024, 9, 20, tzinfo=timezone.utc), patches)
    assert result == 2  # 7.37b (released Sep 15, before Sep 20)


def test_determine_patch_after_latest():
    """Match after the last known patch gets the latest patch."""
    patches = _make_patches()
    result = determine_patch(datetime(2024, 12, 1, tzinfo=timezone.utc), patches)
    assert result == 4  # 7.37d


def test_determine_patch_before_first():
    """Match before any known patch returns None."""
    patches = _make_patches()
    result = determine_patch(datetime(2024, 1, 1, tzinfo=timezone.utc), patches)
    assert result is None


def test_determine_patch_empty_patches():
    """Empty patches dict returns None."""
    result = determine_patch(datetime(2024, 10, 1, tzinfo=timezone.utc), {})
    assert result is None


def test_determine_patch_on_first_patch():
    """Match starting exactly at the first patch release gets that patch."""
    patches = _make_patches()
    result = determine_patch(datetime(2024, 9, 1, tzinfo=timezone.utc), patches)
    assert result == 1  # 7.37
