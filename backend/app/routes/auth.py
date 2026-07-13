import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import security
from app.config import settings
from app.db import get_db
from app.models import AuthSession, User
from app.schemas import LogoutIn, OAuthCallbackIn, RefreshIn, RefreshOut, TokenOut, UserOut
from app.seed import seed_demo_project

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


@router.post("/auth/oauth/callback", response_model=TokenOut)
def oauth_callback(body: OAuthCallbackIn, db: Session = Depends(get_db)) -> TokenOut:
    """Exchange a GitHub OAuth access token for a Beacon session JWT (issued by this API).

    In AUTH_DEV_MODE, `dev_email` may be used instead for local demos.
    """
    if body.access_token:
        try:
            gh_user = security.verify_github_access_token(body.access_token)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid GitHub token"
            ) from None
        github_login = gh_user["login"]
        email = gh_user["email"]
        name = gh_user["name"]
    elif body.dev_email and settings.auth_dev_mode:
        email = body.dev_email.strip().lower()
        if "@" not in email:
            raise HTTPException(status_code=422, detail="Invalid email")
        github_login = f"dev:{email}"
        name = body.dev_name or email.split("@")[0]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials"
        )

    user = db.scalar(select(User).where(User.github_login == github_login))
    if user is None:
        user = User(github_login=github_login, email=email, name=name)
        db.add(user)
        db.flush()
        seed_demo_project(db, user)
        db.commit()
        logger.info("new user signed up; demo project seeded")
    else:
        if (email and user.email != email) or (name and user.name != name):
            user.email = email or user.email
            user.name = name or user.name
            db.commit()

    raw_refresh = security.generate_refresh_token()
    auth_session = AuthSession(
        user_id=user.id,
        refresh_token_hash=security.hash_refresh_token(raw_refresh),
        remember=body.remember,
        absolute_expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_absolute_days),
    )
    db.add(auth_session)
    db.commit()

    return TokenOut(
        access_token=security.create_access_token(user.id, auth_session.id),
        refresh_token=raw_refresh,
        expires_in=settings.jwt_expires_minutes * 60,
        user=UserOut.model_validate(user),
    )


def _as_utc(dt: datetime) -> datetime:
    """SQLite (tests) returns naive datetimes for tz-aware columns; they are
    stored as UTC, so stamp the zone back on."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _load_live_session(db: Session, raw_token: str) -> AuthSession:
    """Resolve a raw refresh token to its live session or raise 401.

    A token that hashes to nothing is either fake or already rotated out;
    both get the same answer so a stolen old token leaks nothing.
    """
    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.refresh_token_hash == security.hash_refresh_token(raw_token)
        )
    )
    now = datetime.now(UTC)
    if auth_session is not None:
        expired_absolute = now >= _as_utc(auth_session.absolute_expires_at)
        expired_idle = not auth_session.remember and now >= _as_utc(
            auth_session.last_used_at
        ) + timedelta(hours=settings.refresh_idle_hours)
        if expired_absolute or expired_idle:
            db.delete(auth_session)
            db.commit()
            auth_session = None
    if auth_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        )
    return auth_session


@router.post("/auth/refresh", response_model=RefreshOut)
def refresh(body: RefreshIn, db: Session = Depends(get_db)) -> RefreshOut:
    """Rotate a refresh token and mint a fresh access token.

    last_used_at is the inactivity clock: browsers refresh at most every
    access-token lifetime, so it tracks real usage.
    """
    auth_session = _load_live_session(db, body.refresh_token)

    raw_refresh = security.generate_refresh_token()
    auth_session.refresh_token_hash = security.hash_refresh_token(raw_refresh)
    auth_session.last_used_at = datetime.now(UTC)
    db.commit()

    return RefreshOut(
        access_token=security.create_access_token(auth_session.user_id, auth_session.id),
        refresh_token=raw_refresh,
        expires_in=settings.jwt_expires_minutes * 60,
    )


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(body: LogoutIn, db: Session = Depends(get_db)) -> None:
    """Revoke the session behind a refresh token. Idempotent: unknown or
    already-rotated tokens are a no-op, not an error."""
    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.refresh_token_hash == security.hash_refresh_token(body.refresh_token)
        )
    )
    if auth_session is not None:
        db.delete(auth_session)
        db.commit()
