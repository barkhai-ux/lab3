"""Tests for auth service functions."""

from app.services.auth_service import (
    build_steam_openid_url,
    create_access_token,
    decode_access_token,
)


def test_build_steam_openid_url():
    url = build_steam_openid_url()
    assert "steamcommunity.com/openid/login" in url
    assert "openid.mode=checkid_setup" in url
    assert "openid.ns=" in url


def test_create_and_decode_token():
    steam_id = 76561198000000000
    name = "TestPlayer"

    token = create_access_token(steam_id, name)
    assert token is not None

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == str(steam_id)
    assert payload["name"] == name


def test_decode_invalid_token():
    result = decode_access_token("invalid.token.here")
    assert result is None
