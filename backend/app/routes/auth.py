import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import security
from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import OAuthCallbackIn, TokenOut, UserOut
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

    return TokenOut(
        access_token=security.create_access_token(user.id),
        user=UserOut.model_validate(user),
    )
