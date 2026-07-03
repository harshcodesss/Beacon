"""projects.log_source_config -> projects.settings; users.preferences

The JSONB column stopped being purely log-source config in v1 (it also
carries budget + delivery), so the name catches up with reality.
users.preferences holds account-level defaults (e.g. default delivery for
new projects).

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("projects", "log_source_config", new_column_name="settings")
    op.add_column(
        "users",
        sa.Column(
            "preferences", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'")
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "preferences")
    op.alter_column("projects", "settings", new_column_name="log_source_config")
