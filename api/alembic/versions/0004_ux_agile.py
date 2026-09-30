"""ux agile profile columns kinds depends_on

Revision ID: 0004_ux_agile
Revises: 0003_task_links
Create Date: 2026-09-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_ux_agile"
down_revision: Union[str, None] = "0003_task_links"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

task_kind = postgresql.ENUM("epic", "story", "task", name="task_kind", create_type=False)


def upgrade() -> None:
    op.add_column("users", sa.Column("job_title", sa.String(80), nullable=True))
    op.add_column("users", sa.Column("avatar_seed", sa.String(120), nullable=True))
    op.add_column("board_columns", sa.Column("description", sa.Text(), nullable=True))

    task_kind.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "tasks",
        sa.Column("kind", task_kind, nullable=False, server_default="task"),
    )

    # Extend task_link_type enum with depends_on
    op.execute("ALTER TYPE task_link_type ADD VALUE IF NOT EXISTS 'depends_on'")


def downgrade() -> None:
    op.drop_column("tasks", "kind")
    task_kind.drop(op.get_bind(), checkfirst=True)
    op.drop_column("board_columns", "description")
    op.drop_column("users", "avatar_seed")
    op.drop_column("users", "job_title")
