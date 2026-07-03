"""Background triage jobs (Redis + RQ).

The worker must never crash: any exception marks the incident failed and
stores the traceback in reports.accuracy_meta.error.
"""

import logging
import traceback
import uuid

import redis
from rq import Queue

from app.beacon_client import beacon_graph
from app.config import default_budget, settings
from app.db import SessionLocal
from app.emailer import send_report_email
from app.models import Incident, IncidentStatus, Report, utcnow

logger = logging.getLogger(__name__)

QUEUE_NAME = "triage"
JOB_TIMEOUT_SECONDS = 600


def get_queue() -> Queue:
    return Queue(QUEUE_NAME, connection=redis.Redis.from_url(settings.redis_url))


def enqueue_triage(incident_id: str) -> None:
    get_queue().enqueue(run_triage, incident_id, job_timeout=JOB_TIMEOUT_SECONDS)


def project_budget(project_settings: dict | None) -> dict:
    budget = default_budget()
    configured = (project_settings or {}).get("budget") or {}
    for key in ("max_tool_calls", "max_tokens"):
        value = configured.get(key)
        if isinstance(value, int) and value > 0:
            budget[key] = value
    return budget


def run_triage(incident_id: str) -> None:
    db = SessionLocal()
    try:
        incident = db.get(Incident, uuid.UUID(incident_id))
        if incident is None:
            logger.error("triage job: incident %s not found", incident_id)
            return
        if incident.status not in (IncidentStatus.queued, IncidentStatus.running):
            logger.info(
                "triage job: incident %s already %s, skipping", incident_id, incident.status
            )
            return

        incident.status = IncidentStatus.running
        db.commit()

        project = incident.project
        budget = project_budget(project.settings)

        try:
            result = beacon_graph.invoke({"incident_id": incident_id, "budget": budget})
            usage = result.get("budget") or {}
            db.add(
                Report(
                    incident_id=incident.id,
                    report_md=result.get("report") or "",
                    verdicts=result.get("verdicts"),
                    hypotheses=result.get("hypotheses"),
                    accuracy_meta=None,
                    tokens_used=int(usage.get("tokens_used") or 0),
                    tool_calls_used=int(usage.get("tool_calls_used") or 0),
                )
            )
            incident.status = IncidentStatus.done
            incident.finished_at = utcnow()
            db.commit()
            logger.info("triage job: incident %s done", incident_id)
            _deliver(db, incident)
        except Exception:
            db.rollback()
            logger.exception("triage job: incident %s failed", incident_id)
            db.add(
                Report(
                    incident_id=incident.id,
                    report_md="",
                    accuracy_meta={"error": traceback.format_exc()},
                )
            )
            incident.status = IncidentStatus.failed
            incident.finished_at = utcnow()
            db.commit()
    except Exception:
        # Absolute backstop — a triage job must never take the worker down.
        logger.exception("triage job: unexpected error for incident %s", incident_id)
        db.rollback()
    finally:
        db.close()


def _deliver(db, incident: Incident) -> None:
    project = incident.project
    config = project.settings or {}
    if config.get("delivery") != "email":
        return
    owner = project.user
    report = db.get(Incident, incident.id).report
    if owner is None or report is None:
        return
    send_report_email(
        owner.email,
        f"[Beacon] Incident report — {project.name}",
        report.report_md,
    )
