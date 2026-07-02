from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import jobs
from app.config import settings
from app.db import get_db
from app.models import ApiKey, Incident, IncidentStatus, IncidentTrigger, Report, utcnow
from app.ratelimit import check_rate_limit
from app.schemas import WebhookIn, WebhookOut
from app.security import hash_api_key

router = APIRouter(tags=["webhook"])


def _authenticate(request: Request, db: Session) -> ApiKey:
    raw_key = request.headers.get("x-beacon-key", "")
    if not raw_key:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            raw_key = auth[7:]
    if not raw_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")
    key = db.scalar(select(ApiKey).where(ApiKey.key_hash == hash_api_key(raw_key)))
    if key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
    return key


@router.post("/webhook/github", response_model=WebhookOut, status_code=status.HTTP_202_ACCEPTED)
def github_webhook(
    body: WebhookIn, request: Request, db: Session = Depends(get_db)
) -> WebhookOut:
    """GitHub Action / external trigger endpoint (API-key auth, rate-limited).

    Two modes:
      * body includes report_md  -> ingest a completed triage (the Action ran the
        beacon CLI in its own container) as a finished incident.
      * body omits report_md     -> enqueue a server-side triage run.
    """
    key = _authenticate(request, db)
    if not check_rate_limit(
        f"webhook:{key.id}", limit=settings.webhook_rate_limit_per_minute, window_seconds=60
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded"
        )
    key.last_used_at = utcnow()

    if body.report_md is not None:
        incident = Incident(
            project_id=key.project_id,
            trigger=IncidentTrigger.action,
            status=IncidentStatus.done,
            finished_at=utcnow(),
        )
        db.add(incident)
        db.flush()
        db.add(
            Report(
                incident_id=incident.id,
                report_md=body.report_md,
                verdicts=body.verdicts,
                hypotheses=body.hypotheses,
                accuracy_meta=body.accuracy_meta,
                tokens_used=body.tokens_used,
                tool_calls_used=body.tool_calls_used,
            )
        )
        db.commit()
        return WebhookOut(incident_id=incident.id, status=incident.status.value)

    incident = Incident(project_id=key.project_id, trigger=IncidentTrigger.api)
    db.add(incident)
    db.commit()
    jobs.enqueue_triage(str(incident.id))
    return WebhookOut(incident_id=incident.id, status=incident.status.value)
