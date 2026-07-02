import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user, get_owned_project
from app.models import ApiKey, Incident, IncidentStatus, Project, Report, User
from app.schemas import (
    AccuracyStats,
    ApiKeyCreated,
    ApiKeyOut,
    IncidentSummary,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    ProjectWithStats,
)
from app.security import generate_api_key, hash_api_key

router = APIRouter(tags=["projects"])

RECENT_INCIDENTS = 5


def _accuracy_stats(db: Session, project_id: uuid.UUID) -> AccuracyStats | None:
    rows = db.scalars(
        select(Report)
        .join(Incident, Report.incident_id == Incident.id)
        .where(Incident.project_id == project_id, Incident.status == IncidentStatus.done)
    ).all()
    scored = [r.accuracy_meta for r in rows if r.accuracy_meta and "top1" in r.accuracy_meta]
    if not scored:
        return None
    n = len(scored)
    return AccuracyStats(
        evaluated=n,
        top1_rate=sum(1 for m in scored if m.get("top1")) / n,
        top3_rate=sum(1 for m in scored if m.get("top3")) / n,
    )


def _with_stats(db: Session, project: Project) -> ProjectWithStats:
    recent = db.scalars(
        select(Incident)
        .where(Incident.project_id == project.id)
        .order_by(desc(Incident.created_at))
        .limit(RECENT_INCIDENTS)
    ).all()
    total = db.scalar(
        select(func.count()).select_from(Incident).where(Incident.project_id == project.id)
    )
    return ProjectWithStats(
        **ProjectOut.model_validate(project).model_dump(),
        incident_count=total or 0,
        recent_incidents=[IncidentSummary.model_validate(i) for i in recent],
        accuracy=_accuracy_stats(db, project.id),
    )


@router.get("/projects", response_model=list[ProjectWithStats])
def list_projects(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ProjectWithStats]:
    projects = db.scalars(
        select(Project).where(Project.user_id == user.id).order_by(desc(Project.created_at))
    ).all()
    return [_with_stats(db, p) for p in projects]


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    project = Project(
        user_id=user.id,
        name=body.name,
        repo_full_name=body.repo_full_name,
        log_source_type=body.log_source_type,
        log_source_config=body.log_source_config,
    )
    db.add(project)
    db.commit()
    return project


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    return get_owned_project(project_id, user, db)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Project:
    project = get_owned_project(project_id, user, db)
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)
    db.commit()
    return project


@router.get("/projects/{project_id}/api-keys", response_model=list[ApiKeyOut])
def list_api_keys(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ApiKey]:
    project = get_owned_project(project_id, user, db)
    return db.scalars(
        select(ApiKey).where(ApiKey.project_id == project.id).order_by(desc(ApiKey.created_at))
    ).all()


@router.post(
    "/projects/{project_id}/api-keys",
    response_model=ApiKeyCreated,
    status_code=status.HTTP_201_CREATED,
)
def create_api_key(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiKeyCreated:
    """Generate an API key. The raw key is returned exactly once; only its hash is stored."""
    project = get_owned_project(project_id, user, db)
    raw_key = generate_api_key()
    record = ApiKey(project_id=project.id, key_hash=hash_api_key(raw_key))
    db.add(record)
    db.commit()
    return ApiKeyCreated(id=record.id, api_key=raw_key, created_at=record.created_at)
