"""Tests for Steam API client helper methods."""

from app.services.steam_api import SteamAPIClient


def test_steam_id64_to_account_id():
    assert SteamAPIClient.steam_id64_to_account_id(76561198000000000) == 39734272


def test_parse_start_time():
    dt = SteamAPIClient.parse_start_time(1700000000)
    assert dt.year == 2023
    assert dt.tzinfo is not None
