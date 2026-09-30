from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.domain.enums import TaskLinkType
from app.schemas import (
    AttachmentOut,
    ColumnOut,
    ColumnsReorderIn,
    CommentOut,
    DrawingOut,
    MessageOut,
    SubtaskOut,
    TaskLinkCreateIn,
    TaskLinkOut,
    TaskOut,
)
from app.schemas.service_inputs import (
    AttachmentInput,
    CreateColumnInput,
    CreateCommentInput,
    CreateSubtaskInput,
    CreateTaskInput,
    CreateTaskLinkInput,
    DrawingInput,
    ReorderTasksInput,
    UpdateColumnInput,
    UpdateSubtaskInput,
    UpdateTaskInput,
)
from app.services.board_extras_service import (
    AttachmentService,
    CommentService,
    DrawingService,
    SubtaskService,
)
from app.services.project_service import ColumnService
from app.services.task_service import TaskLinkService, TaskService, serialize_task, serialize_tasks

tasks_router = APIRouter(tags=["tasks"])


@tasks_router.get("/projects/{project_id}/columns", response_model=list[ColumnOut])
def list_columns(
    project_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ColumnOut]:
    return [ColumnOut.model_validate(c) for c in ColumnService(db).list(project_id, user.id)]


@tasks_router.post("/projects/{project_id}/columns", response_model=ColumnOut)
def create_column(
    project_id: UUID,
    body: CreateColumnInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ColumnOut:
    return ColumnOut.model_validate(ColumnService(db).create(project_id, user.id, body))


@tasks_router.patch("/columns/{column_id}", response_model=ColumnOut)
def update_column(
    column_id: UUID,
    body: UpdateColumnInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ColumnOut:
    return ColumnOut.model_validate(ColumnService(db).update(column_id, user.id, body))


@tasks_router.patch("/projects/{project_id}/columns/reorder", response_model=list[ColumnOut])
def reorder_columns(
    project_id: UUID,
    body: ColumnsReorderIn,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ColumnOut]:
    return [
        ColumnOut.model_validate(c)
        for c in ColumnService(db).reorder(project_id, user.id, body.items)
    ]


@tasks_router.delete("/columns/{column_id}", response_model=MessageOut)
def delete_column(
    column_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    ColumnService(db).delete(column_id, user.id)
    return MessageOut(detail="ok")


@tasks_router.post("/projects/{project_id}/tasks", response_model=TaskOut)
def create_task(
    project_id: UUID,
    body: CreateTaskInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskOut:
    return serialize_task(db, TaskService(db).create(project_id, user.id, body))


@tasks_router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskOut]:
    return serialize_tasks(db, TaskService(db).list_project(project_id, user.id))


@tasks_router.patch("/projects/{project_id}/tasks/reorder", response_model=list[TaskOut])
def reorder_tasks(
    project_id: UUID,
    body: ReorderTasksInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskOut]:
    return serialize_tasks(db, TaskService(db).reorder(project_id, user.id, body.items))


@tasks_router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(
    task_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskOut:
    return serialize_task(db, TaskService(db).get(task_id, user.id))


@tasks_router.patch("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: UUID,
    body: UpdateTaskInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskOut:
    return serialize_task(db, TaskService(db).update(task_id, user.id, body))


@tasks_router.delete("/tasks/{task_id}", response_model=MessageOut)
def delete_task(
    task_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    TaskService(db).delete(task_id, user.id)
    return MessageOut(detail="ok")


@tasks_router.post("/tasks/{task_id}/comments", response_model=CommentOut)
def add_comment(
    task_id: UUID,
    body: CreateCommentInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CommentOut:
    return CommentOut.model_validate(CommentService(db).add(task_id, user.id, body))


@tasks_router.get("/tasks/{task_id}/comments", response_model=list[CommentOut])
def list_comments(
    task_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CommentOut]:
    return [CommentOut.model_validate(c) for c in CommentService(db).list(task_id, user.id)]


@tasks_router.post("/tasks/{task_id}/subtasks", response_model=SubtaskOut)
def add_subtask(
    task_id: UUID,
    body: CreateSubtaskInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubtaskOut:
    return SubtaskOut.model_validate(SubtaskService(db).add(task_id, user.id, body))


@tasks_router.patch("/subtasks/{subtask_id}", response_model=SubtaskOut)
def update_subtask(
    subtask_id: UUID,
    body: UpdateSubtaskInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubtaskOut:
    return SubtaskOut.model_validate(SubtaskService(db).update(subtask_id, user.id, body))


@tasks_router.get("/tasks/{task_id}/drawing", response_model=DrawingOut | None)
def get_drawing(
    task_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DrawingOut | None:
    drawing = DrawingService(db).get(task_id, user.id)
    return DrawingOut.model_validate(drawing) if drawing else None


@tasks_router.put("/tasks/{task_id}/drawing", response_model=DrawingOut)
def save_drawing(
    task_id: UUID,
    body: DrawingInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DrawingOut:
    return DrawingOut.model_validate(DrawingService(db).save(task_id, user.id, body))


@tasks_router.post("/tasks/{task_id}/attachments", response_model=AttachmentOut)
def add_attachment(
    task_id: UUID,
    body: AttachmentInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttachmentOut:
    return AttachmentOut.model_validate(AttachmentService(db).add(task_id, user.id, body))


@tasks_router.get("/tasks/{task_id}/attachments", response_model=list[AttachmentOut])
def list_attachments(
    task_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AttachmentOut]:
    return [AttachmentOut.model_validate(a) for a in AttachmentService(db).list(task_id, user.id)]


@tasks_router.delete("/attachments/{attachment_id}", response_model=MessageOut)
def delete_attachment(
    attachment_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    AttachmentService(db).delete(attachment_id, user.id)
    return MessageOut(detail="ok")


@tasks_router.get("/tasks/{task_id}/links", response_model=list[TaskLinkOut])
def list_links(
    task_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskLinkOut]:
    return [TaskLinkOut.model_validate(link) for link in TaskLinkService(db).list(task_id, user.id)]


@tasks_router.post("/tasks/{task_id}/links", response_model=TaskLinkOut)
def create_link(
    task_id: UUID,
    body: TaskLinkCreateIn,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TaskLinkOut:
    link = TaskLinkService(db).create(
        task_id,
        user.id,
        CreateTaskLinkInput(to_task_id=body.to_task_id, link_type=TaskLinkType(body.link_type)),
    )
    return TaskLinkOut.model_validate(link)


@tasks_router.delete("/links/{link_id}", response_model=MessageOut)
def delete_link(
    link_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    TaskLinkService(db).delete(link_id, user.id)
    return MessageOut(detail="ok")
