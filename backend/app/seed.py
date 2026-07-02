"""Demo-project seeding: every brand-new user gets one project with three
realistic finished incidents so no screen ever renders empty."""

from datetime import timedelta

from sqlalchemy.orm import Session

from app.config import default_budget
from app.demo_data import SCENARIOS
from app.models import Incident, IncidentStatus, IncidentTrigger, Project, Report, User, utcnow


def seed_demo_project(db: Session, user: User) -> Project:
    project = Project(
        user_id=user.id,
        name="meetpilot-api (demo)",
        repo_full_name="harshcodesss/meetpilot",
        log_source_type="file",
        log_source_config={
            "path": "./logs/app.log",
            "budget": default_budget(),
            "delivery": "in_app",
            "demo": True,
        },
    )
    db.add(project)
    db.flush()

    now = utcnow()
    triggers = [IncidentTrigger.action, IncidentTrigger.manual, IncidentTrigger.action]
    for i, scenario in enumerate(SCENARIOS):
        started = now - timedelta(days=2 * (len(SCENARIOS) - i), hours=3 * i + 1)
        incident = Incident(
            project_id=project.id,
            status=IncidentStatus.done,
            trigger=triggers[i % len(triggers)],
            created_at=started,
            finished_at=started + timedelta(seconds=95 + 40 * i),
        )
        db.add(incident)
        db.flush()
        db.add(
            Report(
                incident_id=incident.id,
                report_md=scenario["report_md"],
                verdicts=scenario["verdicts"],
                hypotheses=scenario["hypotheses"],
                accuracy_meta=scenario["accuracy_meta"],
                tokens_used=scenario["tokens_used"],
                tool_calls_used=scenario["tool_calls_used"],
                created_at=started + timedelta(seconds=95 + 40 * i),
            )
        )
    db.flush()
    return project
