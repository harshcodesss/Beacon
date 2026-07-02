"""Transactional email delivery for finished reports (Resend or SMTP — never Gmail API).

Best-effort: delivery failures are logged (without secrets) and never fail the job.
"""

import logging
import smtplib
from email.mime.text import MIMEText

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def send_report_email(to_email: str, subject: str, markdown_body: str) -> bool:
    provider = settings.email_provider.lower()
    try:
        if provider == "resend":
            return _send_resend(to_email, subject, markdown_body)
        if provider == "smtp":
            return _send_smtp(to_email, subject, markdown_body)
        logger.info("email delivery skipped (EMAIL_PROVIDER=none)")
        return False
    except Exception:
        logger.exception("report email delivery failed (provider=%s)", provider)
        return False


def _send_resend(to_email: str, subject: str, body: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("EMAIL_PROVIDER=resend but RESEND_API_KEY is not set")
        return False
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json={
            "from": settings.email_from,
            "to": [to_email],
            "subject": subject,
            "text": body,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return True


def _send_smtp(to_email: str, subject: str, body: str) -> bool:
    if not settings.smtp_host:
        logger.warning("EMAIL_PROVIDER=smtp but SMTP_HOST is not set")
        return False
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = to_email
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.email_from, [to_email], msg.as_string())
    return True
