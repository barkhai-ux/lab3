"""
OpenDota API client for replay URLs and supplementary data.

Documented at: https://docs.opendota.com/

Rate limit: 60 requests/minute (free tier), 1200/minute with API key.
"""

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class OpenDotaAPIError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class OpenDotaClient:
    """Async client for OpenDota API."""

    def __init__(self):
        self.base_url = settings.opendota_api_url
        self.api_key = settings.opendota_api_key

    def _params(self, extra: dict | None = None) -> dict:
        params = {}
        if self.api_key:
            params["api_key"] = self.api_key
        if extra:
            params.update(extra)
        return params

    async def get_match(self, match_id: int) -> dict[str, Any]:
        """
        Fetch parsed match data from OpenDota.

        This may trigger a parse request if the match hasn't been parsed yet.
        """
        url = f"{self.base_url}/matches/{match_id}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, params=self._params())

        if resp.status_code == 404:
            raise OpenDotaAPIError(f"Match {match_id} not found", 404)
        if resp.status_code != 200:
            raise OpenDotaAPIError(
                f"OpenDota returned {resp.status_code}", resp.status_code
            )

        return resp.json()

    async def get_replay_url(self, match_id: int) -> str | None:
        """
        Get the replay download URL for a match.

        Returns None if the replay salt is not available.
        The replay URL follows the pattern:
        http://replay{cluster}.valve.net/570/{match_id}_{replay_salt}.dem.bz2
        """
        try:
            match_data = await self.get_match(match_id)
        except OpenDotaAPIError:
            return None

        replay_url = match_data.get("replay_url")
        if replay_url:
            return replay_url

        # Try to construct from cluster and replay_salt
        cluster = match_data.get("cluster")
        replay_salt = match_data.get("replay_salt")
        if cluster and replay_salt:
            return (
                f"http://replay{cluster}.valve.net/570/"
                f"{match_id}_{replay_salt}.dem.bz2"
            )

        return None

    async def request_parse(self, match_id: int) -> dict:
        """
        Request OpenDota to parse a match replay.

        Returns a job status dict.
        """
        url = f"{self.base_url}/request/{match_id}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, params=self._params())

        if resp.status_code != 200:
            raise OpenDotaAPIError(
                f"Parse request failed: {resp.status_code}", resp.status_code
            )

        return resp.json()

    async def get_heroes(self) -> list[dict]:
        """Fetch the hero list from OpenDota."""
        url = f"{self.base_url}/heroes"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url, params=self._params())

        if resp.status_code != 200:
            raise OpenDotaAPIError(
                f"Heroes endpoint returned {resp.status_code}", resp.status_code
            )

        return resp.json()
