"""auth: rename users.google_sub -> users.github_login

Rename-in-place: rows keyed by a numeric Google sub will never match a
GitHub login, so pre-existing Google users effectively become dormant and
those people get a fresh account on first GitHub sign-in. Dev-mode users
(`dev:{email}`) are unaffected.

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "google_sub", new_column_name="github_login")
    op.execute("ALTER INDEX ix_users_google_sub RENAME TO ix_users_github_login")


def downgrade() -> None:
    op.execute("ALTER INDEX ix_users_github_login RENAME TO ix_users_google_sub")
    op.alter_column("users", "github_login", new_column_name="google_sub")
