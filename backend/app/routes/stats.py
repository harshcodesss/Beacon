from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Incident, IncidentStatus, Project, Report, User
from app.schemas import AccuracyStats, StatsOverview

router = APIRouter(tags=["stats"])


@router.get("/stats/overview", response_model=StatsOverview)
def stats_overview(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> StatsOverview:
    """Aggregate numbers across all of the user's projects (for /home)."""
    status_counts = dict(
        db.execute(
            select(Incident.status, func.count())
            .join(Project, Incident.project_id == Project.id)
            .where(Project.user_id == user.id)
            .group_by(Incident.status)
        ).all()
    )
    done = status_counts.get(IncidentStatus.done, 0)
    failed = status_counts.get(IncidentStatus.failed, 0)
    active = status_counts.get(IncidentStatus.queued, 0) + status_counts.get(
        IncidentStatus.running, 0
    )

    reports = db.scalars(
        select(Report)
        .join(Incident, Report.incident_id == Incident.id)
        .join(Project, Incident.project_id == Project.id)
        .where(Project.user_id == user.id, Incident.status == IncidentStatus.done)
    ).all()

    scored = [r.accuracy_meta for r in reports if r.accuracy_meta and "top1" in r.accuracy_meta]
    accuracy = None
    if scored:
        n = len(scored)
        accuracy = AccuracyStats(
            evaluated=n,
            top1_rate=sum(1 for m in scored if m.get("top1")) / n,
            top3_rate=sum(1 for m in scored if m.get("top3")) / n,
        )

    return StatsOverview(
        total_incidents=sum(status_counts.values()),
        done=done,
        failed=failed,
        active=active,
        accuracy=accuracy,
        avg_tokens=round(sum(r.tokens_used for r in reports) / len(reports), 1) if reports else 0,
        avg_tool_calls=(
            round(sum(r.tool_calls_used for r in reports) / len(reports), 1) if reports else 0
        ),
    )
