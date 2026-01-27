"""
Steam Web API client.

Documented endpoints used:
- IPlayerService/GetRecentlyPlayedGames (not used — just for context)
- IDOTA2Match_570/GetMatchHistory/v1
- IDOTA2Match_570/GetMatchDetails/v1

See: https://wiki.teamfortress.com/wiki/WebAPI
"""

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.steampowered.com"
MATCH_HISTORY_URL = f"{BASE_URL}/IDOTA2Match_570/GetMatchHistory/v1"
MATCH_DETAILS_URL = f"{BASE_URL}/IDOTA2Match_570/GetMatchDetails/v1"


class SteamAPIError(Exception):
    """Raised when the Steam API returns an error."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class SteamAPIClient:
    """Async client for Steam Dota 2 Web API."""

    def __init__(self):
        self.api_key = settings.steam_api_key

    async def get_match_history(
        self,
        account_id: int,
        matches_requested: int = 25,
        start_at_match_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Fetch recent match history for an account.

        account_id: 32-bit Steam account ID (SteamID64 - 76561197960265728)

        Returns the raw result dict from the API. A status of 15 means
        the profile is private.
        """
        params: dict[str, Any] = {
            "key": self.api_key,
            "account_id": account_id,
            "matches_requested": matches_requested,
        }
        if start_at_match_id is not None:
            params["start_at_match_id"] = start_at_match_id

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(MATCH_HISTORY_URL, params=params)

        if resp.status_code != 200:
            raise SteamAPIError(
                f"GetMatchHistory returned {resp.status_code}", resp.status_code
            )

        data = resp.json()
        result = data.get("result", {})

        if result.get("status") == 15:
            raise SteamAPIError("Profile is private", status_code=403)

        return result

    async def get_match_details(self, match_id: int) -> dict[str, Any]:
        """
        Fetch full details for a specific match.

        Returns the raw result dict from the API.
        """
        params = {"key": self.api_key, "match_id": match_id}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(MATCH_DETAILS_URL, params=params)

        if resp.status_code != 200:
            raise SteamAPIError(
                f"GetMatchDetails returned {resp.status_code}", resp.status_code
            )

        data = resp.json()
        return data.get("result", {})

    @staticmethod
    def steam_id64_to_account_id(steam_id64: int) -> int:
        """Convert SteamID64 to 32-bit account ID."""
        return steam_id64 - 76561197960265728

    @staticmethod
    def parse_start_time(unix_ts: int) -> datetime:
        """Convert a unix timestamp to a timezone-aware datetime."""
        return datetime.fromtimestamp(unix_ts, tz=timezone.utc)
