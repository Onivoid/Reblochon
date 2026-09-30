from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.domain.enums import TaskKind, TaskLinkType, TaskPriority, TaskStatus


class CreateProjectInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    color_token: str = Field(default="accent", max_length=32)


class CreateColumnInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str | None = None
    color_token: str = Field(default="accent", max_length=32)
    is_done: bool = False
    position: float | None = None


class UpdateColumnInput(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    description: str | None = None
    color_token: str | None = Field(default=None, max_length=32)
    is_done: bool | None = None
    position: float | None = None


class CreateTaskInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    kind: TaskKind = TaskKind.TASK
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    due_at: datetime | None = None
    assignee_id: UUID | None = None
    scheduled_for: date | None = None
    is_today: bool = False
    tags: list[str] = Field(default_factory=list)
    position: float = 0.0
    column_id: UUID | None = None


class UpdateTaskInput(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    kind: TaskKind | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    due_at: datetime | None = None
    assignee_id: UUID | None = None
    scheduled_for: date | None = None
    is_today: bool | None = None
    tags: list[str] | None = None
    position: float | None = None
    column_id: UUID | None = None


class ReorderTasksInput(BaseModel):
    items: list[dict]


class CreateCommentInput(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class CreateSubtaskInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class UpdateSubtaskInput(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    is_done: bool | None = None
    position: float | None = None


class DrawingInput(BaseModel):
    scene_json: dict


class FocusStartInput(BaseModel):
    task_id: UUID | None = None
    duration_sec: int = Field(default=1500, ge=60, le=7200)


class DailyNoteInput(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    note_date: date | None = None


class AttachmentInput(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=1, max_length=2048)


class CreateTaskLinkInput(BaseModel):
    to_task_id: UUID
    link_type: TaskLinkType = TaskLinkType.RELATES_TO
