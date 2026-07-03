from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import MeUpdate, UserOut

router = APIRouter(tags=["me"])


@router.get("/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    body: MeUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if body.name is not None:
        user.name = body.name
    if body.preferences is not None:
        # Reassign (not mutate) so SQLAlchemy sees the JSON column change.
        user.preferences = {**(user.preferences or {}), **body.preferences}
    db.commit()
    return user
