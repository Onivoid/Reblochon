"""task links between tasks

Revision ID: 0003_task_links
Revises: 0002_board_columns
Create Date: 2026-09-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_task_links"
down_revision: Union[str, None] = "0002_board_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

task_link_type = postgresql.ENUM("blocks", "relates_to", name="task_link_type", create_type=False)


def upgrade() -> None:
    task_link_type.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "task_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("from_task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("link_type", task_link_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("from_task_id", "to_task_id", "link_type", name="uq_task_link"),
    )
    op.create_index("ix_task_links_from_task_id", "task_links", ["from_task_id"])
    op.create_index("ix_task_links_to_task_id", "task_links", ["to_task_id"])


def downgrade() -> None:
    op.drop_index("ix_task_links_to_task_id", table_name="task_links")
    op.drop_index("ix_task_links_from_task_id", table_name="task_links")
    op.drop_table("task_links")
    task_link_type.drop(op.get_bind(), checkfirst=True)
