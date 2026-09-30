"""board columns + task.column_id

Revision ID: 0002_board_columns
Revises: 0001_initial
Create Date: 2026-09-30
"""

from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_board_columns"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_COLUMNS = (
    ("À faire", 0.0, "accent", False),
    ("En cours", 1.0, "cyan", False),
    ("Terminé", 2.0, "mint", True),
)


def upgrade() -> None:
    op.create_table(
        "board_columns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("position", sa.Float(), nullable=False, server_default="0"),
        sa.Column("color_token", sa.String(32), nullable=False, server_default="accent"),
        sa.Column("is_done", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_board_columns_project_id", "board_columns", ["project_id"])

    op.add_column(
        "tasks",
        sa.Column("column_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_tasks_column_id",
        "tasks",
        "board_columns",
        ["column_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_tasks_column_id", "tasks", ["column_id"])

    bind = op.get_bind()
    projects = bind.execute(sa.text("SELECT id FROM projects")).fetchall()
    status_to_idx = {"todo": 0, "doing": 1, "done": 2}

    for (project_id,) in projects:
        col_ids: list = []
        for name, position, color_token, is_done in DEFAULT_COLUMNS:
            col_id = uuid4()
            col_ids.append(col_id)
            bind.execute(
                sa.text(
                    "INSERT INTO board_columns (id, project_id, name, position, color_token, is_done) "
                    "VALUES (:id, :project_id, :name, :position, :color_token, :is_done)"
                ),
                {
                    "id": col_id,
                    "project_id": project_id,
                    "name": name,
                    "position": position,
                    "color_token": color_token,
                    "is_done": is_done,
                },
            )
        tasks = bind.execute(
            sa.text("SELECT id, status FROM tasks WHERE project_id = :pid AND deleted_at IS NULL"),
            {"pid": project_id},
        ).fetchall()
        for task_id, status in tasks:
            idx = status_to_idx.get(str(status), 0)
            bind.execute(
                sa.text("UPDATE tasks SET column_id = :cid WHERE id = :tid"),
                {"cid": col_ids[idx], "tid": task_id},
            )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_column_id", "tasks", type_="foreignkey")
    op.drop_index("ix_tasks_column_id", table_name="tasks")
    op.drop_column("tasks", "column_id")
    op.drop_index("ix_board_columns_project_id", table_name="board_columns")
    op.drop_table("board_columns")
