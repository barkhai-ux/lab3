from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import TokenOut, UserOut
from app.services.auth_service import (
    build_steam_openid_url,
    create_access_token,
    decode_access_token,
    fetch_steam_profile,
    verify_steam_openid,
)
from app.config import settings

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that extracts and validates the current user from JWT."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    steam_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.steam_id == steam_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


@router.get("/steam")
async def steam_login():
    """Redirect the user to Steam's OpenID login page."""
    return RedirectResponse(url=build_steam_openid_url())


@router.get("/steam/callback")
async def steam_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle the callback from Steam OpenID.

    Verifies the assertion, upserts the user, and returns a JWT.
    """
    params = dict(request.query_params)

    steam_id = await verify_steam_openid(params)
    if steam_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Steam OpenID verification failed",
        )

    # Fetch profile info from Steam
    profile = await fetch_steam_profile(steam_id)

    persona_name = profile.get("personaname", "Unknown") if profile else "Unknown"
    avatar_url = profile.get("avatarfull", "") if profile else ""
    profile_url = profile.get("profileurl", "") if profile else ""
    is_public = (
        profile.get("communityvisibilitystate", 1) == 3 if profile else False
    )

    # Upsert user
    result = await db.execute(select(User).where(User.steam_id == steam_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            steam_id=steam_id,
            persona_name=persona_name,
            avatar_url=avatar_url,
            profile_url=profile_url,
            is_public=is_public,
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)
    else:
        user.persona_name = persona_name
        user.avatar_url = avatar_url
        user.profile_url = profile_url
        user.is_public = is_public
        user.last_login = datetime.now(timezone.utc)

    await db.flush()

    token = create_access_token(steam_id, persona_name)

    # Redirect to frontend with token
    redirect_url = f"{settings.frontend_url}/auth/callback?token={token}&steam_id={steam_id}&name={persona_name}"
    return RedirectResponse(url=redirect_url)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.post("/logout")
async def logout():
    """
    Logout endpoint.

    Since we use stateless JWTs, this is a no-op on the server side.
    The frontend should discard the token.
    """
    return {"message": "Logged out. Discard the token on the client."}
