"""team description and avatar_config

Revision ID: 0005_team_avatar
Revises: 0004_ux_agile
Create Date: 2026-09-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_team_avatar"
down_revision: Union[str, None] = "0004_ux_agile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column("avatar_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.execute(
        "UPDATE teams SET description = 'Équipe de démarrage' "
        "WHERE name = 'Default' AND description IS NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_config")
    op.drop_column("teams", "description")
