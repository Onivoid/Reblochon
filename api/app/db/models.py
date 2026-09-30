from datetime import UTC, date, datetime
from enum import Enum as PyEnum
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.domain.enums import (
    InviteStatus,
    MemberRole,
    TaskKind,
    TaskLinkType,
    TaskPriority,
    TaskStatus,
)


def utcnow() -> datetime:
    return datetime.now(UTC)


def pg_enum(enum_cls: type[PyEnum], name: str) -> Enum:
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda members: [member.value for member in members],
    )


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(80))
    locale: Mapped[str] = mapped_column(String(8), default="fr")
    job_title: Mapped[str | None] = mapped_column(String(80), nullable=True)
    avatar_seed: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    memberships: Mapped[list["TeamMemberRow"]] = relationship(back_populates="user")


class TeamRow(Base):
    __tablename__ = "teams"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    members: Mapped[list["TeamMemberRow"]] = relationship(
        back_populates="team", cascade="all, delete-orphan", passive_deletes=True
    )
    projects: Mapped[list["ProjectRow"]] = relationship(
        back_populates="team", cascade="all, delete-orphan", passive_deletes=True
    )


class TeamMemberRow(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_user"),)

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    team_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    role: Mapped[MemberRole] = mapped_column(
        pg_enum(MemberRole, "member_role"), default=MemberRole.MEMBER
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    team: Mapped[TeamRow] = relationship(back_populates="members")
    user: Mapped[UserRow] = relationship(back_populates="memberships")


class InviteRow(Base):
    __tablename__ = "invites"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    token: Mapped[UUID] = mapped_column(UUID(as_uuid=True), unique=True, default=uuid4, index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    team_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")
    )
    invited_by: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[InviteStatus] = mapped_column(
        pg_enum(InviteStatus, "invite_status"), default=InviteStatus.PENDING
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProjectRow(Base):
    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    team_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    color_token: Mapped[str] = mapped_column(String(32), default="accent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    team: Mapped[TeamRow] = relationship(back_populates="projects")
    tasks: Mapped[list["TaskRow"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", passive_deletes=True
    )
    columns: Mapped[list["BoardColumnRow"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="BoardColumnRow.position",
    )


class BoardColumnRow(Base):
    __tablename__ = "board_columns"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[float] = mapped_column(Float, default=0.0)
    color_token: Mapped[str] = mapped_column(String(32), default="accent")
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)

    project: Mapped[ProjectRow] = relationship(back_populates="columns")
    tasks: Mapped[list["TaskRow"]] = relationship(back_populates="column")


class TagRow(Base):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("team_id", "name", name="uq_team_tag"),)

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    team_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(48))


class TaskRow(Base):
    __tablename__ = "tasks"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    column_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("board_columns.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    kind: Mapped[TaskKind] = mapped_column(pg_enum(TaskKind, "task_kind"), default=TaskKind.TASK)
    status: Mapped[TaskStatus] = mapped_column(
        pg_enum(TaskStatus, "task_status"), default=TaskStatus.TODO
    )
    priority: Mapped[TaskPriority] = mapped_column(
        pg_enum(TaskPriority, "task_priority"), default=TaskPriority.MEDIUM
    )
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assignee_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    created_by: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    position: Mapped[float] = mapped_column(Float, default=0.0)
    scheduled_for: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_today: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    project: Mapped[ProjectRow] = relationship(back_populates="tasks")
    column: Mapped["BoardColumnRow | None"] = relationship(back_populates="tasks")
    tags: Mapped[list[TagRow]] = relationship(secondary="task_tags")
    subtasks: Mapped[list["SubtaskRow"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    comments: Mapped[list["CommentRow"]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )
    drawing: Mapped["TaskDrawingRow | None"] = relationship(
        back_populates="task", uselist=False, cascade="all, delete-orphan"
    )


class TaskTagRow(Base):
    __tablename__ = "task_tags"
    __table_args__ = (UniqueConstraint("task_id", "tag_id", name="uq_task_tag"),)

    task_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    tag_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True
    )


class SubtaskRow(Base):
    __tablename__ = "subtasks"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[float] = mapped_column(Float, default=0.0)

    task: Mapped[TaskRow] = relationship(back_populates="subtasks")


class CommentRow(Base):
    __tablename__ = "comments"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    task: Mapped[TaskRow] = relationship(back_populates="comments")


class ActivityEventRow(Base):
    __tablename__ = "activity_events"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    team_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), index=True
    )
    actor_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(48))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )


class TaskDrawingRow(Base):
    __tablename__ = "task_drawings"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), unique=True
    )
    scene_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    updated_by: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    task: Mapped[TaskRow] = relationship(back_populates="drawing")


class FocusSessionRow(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    task_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    duration_sec: Mapped[int] = mapped_column(default=1500)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TeamDailyNoteRow(Base):
    __tablename__ = "team_daily_notes"
    __table_args__ = (UniqueConstraint("team_id", "note_date", name="uq_team_day_note"),)

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    team_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE")
    )
    note_date: Mapped[date] = mapped_column(Date)
    body: Mapped[str] = mapped_column(Text)
    author_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class TaskAttachmentRow(Base):
    __tablename__ = "task_attachments"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    task_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String(120))
    url: Mapped[str] = mapped_column(String(2048))
    created_by: Mapped[UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TaskLinkRow(Base):
    __tablename__ = "task_links"
    __table_args__ = (
        UniqueConstraint("from_task_id", "to_task_id", "link_type", name="uq_task_link"),
    )

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    from_task_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    to_task_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    link_type: Mapped[TaskLinkType] = mapped_column(pg_enum(TaskLinkType, "task_link_type"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RefreshTokenRow(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
