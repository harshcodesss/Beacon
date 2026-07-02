from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://beacon:beacon@localhost:5432/beacon"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = "change-me-generate-a-real-secret"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7

    google_client_id: str = ""

    # Enables password-less dev sign-in for local demos. Never enable in production.
    auth_dev_mode: bool = False

    frontend_origin: str = "http://localhost:3000"

    webhook_rate_limit_per_minute: int = 30

    default_max_tool_calls: int = 15
    default_max_tokens: int = 60000

    email_provider: str = "none"  # none | resend | smtp
    email_from: str = "beacon@example.com"
    resend_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()


def default_budget() -> dict:
    return {
        "max_tool_calls": settings.default_max_tool_calls,
        "max_tokens": settings.default_max_tokens,
    }
