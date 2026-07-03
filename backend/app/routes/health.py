from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.beacon_client import AGENT_CORE
from app.db import get_db
from app.ratelimit import get_redis

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz(db: Session = Depends(get_db)) -> dict:
    checks = {"api": "ok"}
    try:
        db.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "error"
    try:
        get_redis().ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
    checks["status"] = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    # Informational, not part of the ok/degraded calculation.
    checks["agent_core"] = AGENT_CORE
    return checks
