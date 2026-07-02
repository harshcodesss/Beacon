import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import security
from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import GoogleCallbackIn, TokenOut, UserOut
from app.seed import seed_demo_project

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


@router.post("/auth/google/callback", response_model=TokenOut)
def google_callback(body: GoogleCallbackIn, db: Session = Depends(get_db)) -> TokenOut:
    """Exchange a Google ID token for a Beacon session JWT (issued by this API).

    In AUTH_DEV_MODE, `dev_email` may be used instead for local demos.
    """
    if body.id_token:
        try:
            claims = security.verify_google_id_token(body.id_token)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token"
            ) from None
        google_sub = claims["sub"]
        email = claims.get("email", "")
        name = claims.get("name", "")
    elif body.dev_email and settings.auth_dev_mode:
        email = body.dev_email.strip().lower()
        if "@" not in email:
            raise HTTPException(status_code=422, detail="Invalid email")
        google_sub = f"dev:{email}"
        name = body.dev_name or email.split("@")[0]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials"
        )

    user = db.scalar(select(User).where(User.google_sub == google_sub))
    if user is None:
        user = User(google_sub=google_sub, email=email, name=name)
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
