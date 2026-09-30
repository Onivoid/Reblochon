import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt

from app.config import get_settings


def _now() -> datetime:
    return datetime.now(UTC)


def create_access_token(user_id: UUID, email: str) -> str:
    settings = get_settings()
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "exp": _now() + timedelta(minutes=settings.jwt_access_minutes),
        "iat": _now(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_refresh_token_value() -> str:
    return secrets.token_urlsafe(48)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def refresh_expiry() -> datetime:
    settings = get_settings()
    return _now() + timedelta(days=settings.jwt_refresh_days)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    if payload.get("type") != "access":
        raise JWTError("invalid token type")
    return payload
