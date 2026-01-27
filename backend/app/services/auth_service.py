import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt

from app.config import settings

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_PLAYER_SUMMARY_URL = (
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
)

STEAM_ID_RE = re.compile(r"https://steamcommunity\.com/openid/id/(\d+)")


def build_steam_openid_url() -> str:
    """Build the redirect URL for Steam OpenID 2.0 authentication."""
    params = {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": settings.steam_openid_return_url,
        "openid.realm": settings.steam_openid_realm,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    }
    return f"{STEAM_OPENID_URL}?{urlencode(params)}"


async def verify_steam_openid(params: dict[str, str]) -> int | None:
    """
    Verify the Steam OpenID callback parameters.

    Returns the SteamID64 if valid, None otherwise.
    """
    validation_params = dict(params)
    validation_params["openid.mode"] = "check_authentication"

    async with httpx.AsyncClient() as client:
        resp = await client.post(STEAM_OPENID_URL, data=validation_params)

    if "is_valid:true" not in resp.text:
        return None

    claimed_id = params.get("openid.claimed_id", "")
    match = STEAM_ID_RE.search(claimed_id)
    if not match:
        return None

    return int(match.group(1))


async def fetch_steam_profile(steam_id: int) -> dict | None:
    """Fetch the player summary from Steam Web API."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            STEAM_PLAYER_SUMMARY_URL,
            params={"key": settings.steam_api_key, "steamids": str(steam_id)},
        )

    if resp.status_code != 200:
        return None

    data = resp.json()
    players = data.get("response", {}).get("players", [])
    return players[0] if players else None


def create_access_token(steam_id: int, persona_name: str) -> str:
    """Create a signed JWT with the user's Steam ID."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(steam_id),
        "name": persona_name,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """Decode and verify a JWT. Returns the payload or None."""
    try:
        return jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except JWTError:
        return None
