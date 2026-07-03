import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- auth ----


class OAuthCallbackIn(BaseModel):
    access_token: str | None = None
    # Dev-mode sign-in (AUTH_DEV_MODE=true only): bypasses GitHub for local demos.
    dev_email: str | None = None
    dev_name: str | None = None


class UserOut(ORMModel):
    id: uuid.UUID
    github_login: str
    email: str
    name: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- projects ----


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    repo_full_name: str = Field(default="", max_length=255)
    log_source_type: str = "file"
    settings: dict = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    repo_full_name: str | None = Field(default=None, max_length=255)
    log_source_type: str | None = None
    settings: dict | None = None


class ProjectOut(ORMModel):
    id: uuid.UUID
    name: str
    repo_full_name: str
    log_source_type: str
    settings: dict
    created_at: datetime


class IncidentSummary(ORMModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    trigger: str
    created_at: datetime
    finished_at: datetime | None


class AccuracyStats(BaseModel):
    evaluated: int
    top1_rate: float
    top3_rate: float


class ProjectWithStats(ProjectOut):
    incident_count: int = 0
    recent_incidents: list[IncidentSummary] = Field(default_factory=list)
    accuracy: AccuracyStats | None = None


# ---- incidents / reports ----


class IncidentCreate(BaseModel):
    trigger: str = "manual"


class ReportOut(ORMModel):
    report_md: str
    verdicts: list | dict | None
    hypotheses: list | dict | None
    accuracy_meta: dict | None
    tokens_used: int
    tool_calls_used: int
    created_at: datetime


class IncidentDetail(IncidentSummary):
    project_name: str | None = None
    report: ReportOut | None = None


class IncidentPage(BaseModel):
    items: list[IncidentSummary]
    total: int
    page: int
    page_size: int


# ---- api keys ----


class ApiKeyOut(ORMModel):
    id: uuid.UUID
    created_at: datetime
    last_used_at: datetime | None


class ApiKeyCreated(BaseModel):
    id: uuid.UUID
    api_key: str  # raw key — shown exactly once
    created_at: datetime


# ---- webhook ----


class WebhookIn(BaseModel):
    # If report_md is present the incident is ingested as already-triaged (the
    # GitHub Action runs the beacon CLI in its own container and posts the result).
    # Otherwise a triage run is enqueued server-side.
    report_md: str | None = None
    verdicts: list | dict | None = None
    hypotheses: list | dict | None = None
    accuracy_meta: dict | None = None
    tokens_used: int = 0
    tool_calls_used: int = 0


class WebhookOut(BaseModel):
    incident_id: uuid.UUID
    status: str
