import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, joinedload

from app import jobs
from app.db import get_db
from app.deps import get_current_user, get_owned_project
from app.models import Incident, IncidentTrigger, User
from app.schemas import (
    IncidentCreate,
    IncidentDetail,
    IncidentPage,
    IncidentSummary,
    ReportOut,
)

router = APIRouter(tags=["incidents"])


@router.post(
    "/projects/{project_id}/incidents",
    response_model=IncidentSummary,
    status_code=status.HTTP_202_ACCEPTED,
)
def trigger_incident(
    project_id: uuid.UUID,
    body: IncidentCreate | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Incident:
    """Create a queued incident and enqueue the triage job."""
    project = get_owned_project(project_id, user, db)
    trigger_value = (body.trigger if body else "manual") or "manual"
    try:
        trigger = IncidentTrigger(trigger_value)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid trigger") from None

    incident = Incident(project_id=project.id, trigger=trigger)
    db.add(incident)
    db.commit()
    jobs.enqueue_triage(str(incident.id))
    return incident


@router.get("/projects/{project_id}/incidents", response_model=IncidentPage)
def list_incidents(
    project_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IncidentPage:
    project = get_owned_project(project_id, user, db)
    base = select(Incident).where(Incident.project_id == project.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = db.scalars(
        base.order_by(desc(Incident.created_at)).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return IncidentPage(
        items=[IncidentSummary.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/incidents/{incident_id}", response_model=IncidentDetail)
def get_incident(
    incident_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IncidentDetail:
    incident = db.scalar(
        select(Incident)
        .options(joinedload(Incident.report), joinedload(Incident.project))
        .where(Incident.id == incident_id)
    )
    # Scope through the owning project; 404 so incident IDs can't be probed.
    if incident is None or incident.project.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    detail = IncidentDetail.model_validate(incident)
    detail.project_name = incident.project.name
    if incident.report is not None:
        detail.report = ReportOut.model_validate(incident.report)
    return detail
