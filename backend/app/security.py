import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt

from app.config import settings

API_KEY_PREFIX = "beacon_sk_"


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expires_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str:
    """Return the user id (sub) or raise jwt exceptions."""
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    return payload["sub"]


def generate_api_key() -> str:
    return API_KEY_PREFIX + secrets.token_urlsafe(32)


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def verify_github_access_token(access_token: str) -> dict:
    """Resolve a GitHub OAuth access token to its user via the GitHub API.

    Returns {"login", "email", "name"}. Raises ValueError if the token is
    invalid or GitHub is unreachable. GitHub hides most users' email on
    /user, so fall back to /user/emails (needs the user:email scope) and
    finally to the noreply synthetic address — users.email is NOT NULL.
    """
    import httpx

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }
    try:
        resp = httpx.get("https://api.github.com/user", headers=headers, timeout=10)
    except httpx.HTTPError as exc:
        raise ValueError(f"GitHub API unreachable: {exc}") from exc
    if resp.status_code != 200:
        raise ValueError("Invalid GitHub access token")
    data = resp.json()
    login = data["login"]

    email = data.get("email")
    if not email:
        try:
            emails_resp = httpx.get(
                "https://api.github.com/user/emails", headers=headers, timeout=10
            )
            if emails_resp.status_code == 200:
                entries = emails_resp.json()
                primary = [e for e in entries if e.get("primary") and e.get("verified")]
                verified = [e for e in entries if e.get("verified")]
                chosen = (primary or verified or [{}])[0]
                email = chosen.get("email")
        except httpx.HTTPError:
            email = None
    if not email:
        email = f"{login}@users.noreply.github.com"

    return {"login": login, "email": email, "name": data.get("name") or login}
