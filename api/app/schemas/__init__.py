from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.domain.enums import InviteStatus, MemberRole, TaskKind, TaskPriority, TaskStatus
from app.schemas.service_inputs import (
    AttachmentInput,
    CreateColumnInput,
    CreateCommentInput,
    CreateProjectInput,
    CreateSubtaskInput,
    CreateTaskInput,
    CreateTaskLinkInput,
    DailyNoteInput,
    DrawingInput,
    FocusStartInput,
    ReorderTasksInput,
    UpdateColumnInput,
    UpdateSubtaskInput,
    UpdateTaskInput,
)


class MessageOut(BaseModel):
    detail: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str
    locale: str
    job_title: str | None = None
    avatar_seed: str | None = None
    avatar_config: dict | None = None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TeamOut(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None

    model_config = {"from_attributes": True}


class TeamCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class TeamUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)


class MemberOut(BaseModel):
    id: UUID
    user_id: UUID
    role: MemberRole
    display_name: str
    email: EmailStr
    job_title: str | None = None
    avatar_seed: str | None = None
    avatar_config: dict | None = None


class InviteCreateIn(BaseModel):
    email: EmailStr


class InviteOut(BaseModel):
    id: UUID
    token: UUID
    email: EmailStr
    status: InviteStatus
    expires_at: datetime

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: UUID
    team_id: UUID
    name: str
    color_token: str

    model_config = {"from_attributes": True}


class ColumnOut(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: str | None = None
    position: float
    color_token: str
    is_done: bool

    model_config = {"from_attributes": True}


class TagOut(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}


class SubtaskOut(BaseModel):
    id: UUID
    title: str
    is_done: bool
    position: float

    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: UUID
    project_id: UUID
    column_id: UUID | None = None
    title: str
    description: str | None
    kind: TaskKind = TaskKind.TASK
    status: TaskStatus
    priority: TaskPriority
    due_at: datetime | None
    assignee_id: UUID | None
    created_by: UUID
    position: float
    scheduled_for: date | None
    is_today: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    comments_count: int = 0
    links_count: int = 0
    is_blocked: bool = False
    tags: list[TagOut] = []
    subtasks: list[SubtaskOut] = []

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: UUID
    task_id: UUID
    author_id: UUID
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityOut(BaseModel):
    id: UUID
    team_id: UUID
    actor_id: UUID
    event_type: str
    payload: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class DrawingOut(BaseModel):
    task_id: UUID
    scene_json: dict
    updated_by: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class FocusOut(BaseModel):
    id: UUID
    user_id: UUID
    task_id: UUID | None
    started_at: datetime
    duration_sec: int
    ended_at: datetime | None

    model_config = {"from_attributes": True}


class DailyNoteOut(BaseModel):
    id: UUID
    team_id: UUID
    note_date: date
    body: str
    author_id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class AttachmentOut(BaseModel):
    id: UUID
    task_id: UUID
    label: str
    url: str
    created_by: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class StatsOut(BaseModel):
    total_tasks: int
    done_tasks: int
    doing_tasks: int
    today_tasks: int
    project_count: int


class CreateUserInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)
    locale: str = Field(default="fr", pattern="^(fr|en)$")


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshInput(BaseModel):
    refresh_token: str


class LocaleUpdateIn(BaseModel):
    locale: str | None = Field(default=None, pattern="^(fr|en)$")
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    job_title: str | None = Field(default=None, max_length=80)
    avatar_seed: str | None = Field(default=None, max_length=120)
    avatar_config: dict | None = None


class TaskLinkOut(BaseModel):
    id: UUID
    from_task_id: UUID
    to_task_id: UUID
    link_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskLinkCreateIn(BaseModel):
    to_task_id: UUID
    link_type: str = Field(pattern="^(blocks|relates_to|depends_on)$")


class ColumnsReorderIn(BaseModel):
    items: list[dict]


__all__ = [
    "ActivityOut",
    "AttachmentInput",
    "AttachmentOut",
    "AuthResponse",
    "ColumnOut",
    "ColumnsReorderIn",
    "CommentOut",
    "CreateColumnInput",
    "CreateCommentInput",
    "CreateProjectInput",
    "CreateSubtaskInput",
    "CreateTaskInput",
    "CreateTaskLinkInput",
    "CreateUserInput",
    "DailyNoteInput",
    "DailyNoteOut",
    "DrawingInput",
    "DrawingOut",
    "FocusOut",
    "FocusStartInput",
    "InviteCreateIn",
    "InviteOut",
    "LocaleUpdateIn",
    "LoginInput",
    "MemberOut",
    "MessageOut",
    "ProjectOut",
    "RefreshInput",
    "ReorderTasksInput",
    "StatsOut",
    "SubtaskOut",
    "TagOut",
    "TaskLinkCreateIn",
    "TaskLinkOut",
    "TaskOut",
    "TeamCreateIn",
    "TeamOut",
    "TeamUpdateIn",
    "TokenPair",
    "UpdateColumnInput",
    "UpdateSubtaskInput",
    "UpdateTaskInput",
    "UserOut",
]
