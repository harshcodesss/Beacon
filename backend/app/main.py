import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import auth, health, incidents, me, projects, stats, webhook

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

def assert_safe_boot(cfg=settings) -> None:
    """Fail closed: the password-less dev sign-in must never reach production."""
    if cfg.env == "production" and cfg.auth_dev_mode:
        raise RuntimeError(
            "Refusing to start: AUTH_DEV_MODE=true with ENV=production. "
            "Disable dev sign-in before deploying."
        )


assert_safe_boot()

app = FastAPI(title="Beacon API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(incidents.router)
app.include_router(me.router)
app.include_router(stats.router)
app.include_router(webhook.router)
