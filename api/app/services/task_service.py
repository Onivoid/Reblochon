from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.models import ActivityEventRow, CommentRow, TaskLinkRow, TaskRow
from app.domain.enums import ActivityType, TaskLinkType, TaskStatus
from app.repositories import (
    SqlAlchemyActivityRepository,
    SqlAlchemyColumnRepository,
    SqlAlchemyTagRepository,
    SqlAlchemyTaskRepository,
)
from app.schemas import TaskOut
from app.schemas.service_inputs import CreateTaskInput, CreateTaskLinkInput, UpdateTaskInput
from app.services.project_service import ProjectService, status_for_column
from app.services.team_service import TeamService


def is_task_blocked(dependency_statuses: list[TaskStatus]) -> bool:
    """True if at least one depends_on target is not done."""
    return any(s != TaskStatus.DONE for s in dependency_statuses)


def serialize_tasks(db: Session, tasks: list[TaskRow]) -> list[TaskOut]:
    if not tasks:
        return []
    ids = [t.id for t in tasks]
    comment_map = {
        tid: count
        for tid, count in db.execute(
            select(CommentRow.task_id, func.count())
            .where(CommentRow.task_id.in_(ids))
            .group_by(CommentRow.task_id)
        ).all()
    }
    link_map: dict[UUID, int] = {}
    for tid, count in db.execute(
        select(TaskLinkRow.from_task_id, func.count())
        .where(TaskLinkRow.from_task_id.in_(ids))
        .group_by(TaskLinkRow.from_task_id)
    ).all():
        link_map[tid] = link_map.get(tid, 0) + int(count)
    for tid, count in db.execute(
        select(TaskLinkRow.to_task_id, func.count())
        .where(TaskLinkRow.to_task_id.in_(ids))
        .group_by(TaskLinkRow.to_task_id)
    ).all():
        link_map[tid] = link_map.get(tid, 0) + int(count)

    deps_by_from: dict[UUID, list[TaskStatus]] = {}
    dep_rows = db.execute(
        select(TaskLinkRow.from_task_id, TaskRow.status)
        .join(TaskRow, TaskRow.id == TaskLinkRow.to_task_id)
        .where(
            TaskLinkRow.from_task_id.in_(ids),
            TaskLinkRow.link_type == TaskLinkType.DEPENDS_ON,
            TaskRow.deleted_at.is_(None),
        )
    ).all()
    for from_id, to_status in dep_rows:
        deps_by_from.setdefault(from_id, []).append(to_status)

    return [
        TaskOut.model_validate(t).model_copy(
            update={
                "comments_count": int(comment_map.get(t.id, 0)),
                "links_count": int(link_map.get(t.id, 0)),
                "is_blocked": is_task_blocked(deps_by_from.get(t.id, [])),
            }
        )
        for t in tasks
    ]


def serialize_task(db: Session, task: TaskRow) -> TaskOut:
    return serialize_tasks(db, [task])[0]


class TaskService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._tasks = SqlAlchemyTaskRepository(db)
        self._projects = ProjectService(db)
        self._columns = SqlAlchemyColumnRepository(db)
        self._tags = SqlAlchemyTagRepository(db)
        self._activity = SqlAlchemyActivityRepository(db)
        self._teams = TeamService(db)

    def create(self, project_id: UUID, user_id: UUID, data: CreateTaskInput) -> TaskRow:
        project = self._projects.get_for_member(project_id, user_id)
        columns = self._columns.list_for_project(project.id)
        column = None
        if data.column_id is not None:
            column = self._columns.get(data.column_id)
            if column is None or column.project_id != project.id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_column")
        elif columns:
            column = columns[0]
        status = data.status
        if column is not None:
            status = status_for_column(column, columns)
        task = TaskRow(
            project_id=project.id,
            column_id=column.id if column else None,
            title=data.title.strip(),
            description=data.description,
            kind=data.kind,
            status=status,
            priority=data.priority,
            due_at=data.due_at,
            assignee_id=data.assignee_id,
            created_by=user_id,
            position=data.position,
            scheduled_for=data.scheduled_for,
            is_today=data.is_today,
        )
        for tag_name in data.tags:
            task.tags.append(self._tags.get_or_create(project.team_id, tag_name))
        self._tasks.add(task)
        self._activity.add(
            ActivityEventRow(
                team_id=project.team_id,
                actor_id=user_id,
                event_type=ActivityType.TASK_CREATED,
                payload={"task_id": str(task.id), "title": task.title},
            )
        )
        self._db.commit()
        return self._tasks.get(task.id)  # type: ignore[return-value]

    def list_project(self, project_id: UUID, user_id: UUID) -> list[TaskRow]:
        self._projects.get_for_member(project_id, user_id)
        return self._tasks.list_for_project(project_id)

    def list_today(self, team_id: UUID, user_id: UUID, mine_only: bool = False) -> list[TaskRow]:
        self._teams.require_member(team_id, user_id)
        return self._tasks.list_today(team_id, user_id if mine_only else None)

    def get(self, task_id: UUID, user_id: UUID) -> TaskRow:
        task = self._tasks.get(task_id)
        if task is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="task_not_found")
        self._projects.get_for_member(task.project_id, user_id)
        return task

    def update(self, task_id: UUID, user_id: UUID, data: UpdateTaskInput) -> TaskRow:
        task = self.get(task_id, user_id)
        project = self._projects.get_for_member(task.project_id, user_id)
        columns = self._columns.list_for_project(project.id)
        payload = data.model_dump(exclude_unset=True)
        tags = payload.pop("tags", None)
        previous_status = task.status
        if "column_id" in payload and payload["column_id"] is not None:
            column = self._columns.get(payload["column_id"])
            if column is None or column.project_id != project.id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_column")
            payload["status"] = status_for_column(column, columns)
        for key, value in payload.items():
            setattr(task, key, value)
        if tags is not None:
            task.tags = [self._tags.get_or_create(project.team_id, name) for name in tags]
        event_type = ActivityType.TASK_UPDATED
        if task.status == TaskStatus.DONE and previous_status != TaskStatus.DONE:
            event_type = ActivityType.TASK_COMPLETED
        self._activity.add(
            ActivityEventRow(
                team_id=project.team_id,
                actor_id=user_id,
                event_type=event_type,
                payload={"task_id": str(task.id), "title": task.title},
            )
        )
        self._db.commit()
        return self._tasks.get(task.id)  # type: ignore[return-value]

    def reorder(self, project_id: UUID, user_id: UUID, items: list[dict]) -> list[TaskRow]:
        self._projects.get_for_member(project_id, user_id)
        columns = self._columns.list_for_project(project_id)
        by_id = {c.id: c for c in columns}
        for item in items:
            task = self._tasks.get(UUID(str(item["id"])))
            if task is None or task.project_id != project_id:
                continue
            if "position" in item:
                task.position = float(item["position"])
            if "column_id" in item and item["column_id"] is not None:
                col_id = UUID(str(item["column_id"]))
                column = by_id.get(col_id)
                if column is None:
                    continue
                task.column_id = col_id
                task.status = status_for_column(column, columns)
            elif "status" in item:
                task.status = TaskStatus(item["status"])
        self._db.commit()
        return self._tasks.list_for_project(project_id)

    def delete(self, task_id: UUID, user_id: UUID) -> None:
        task = self.get(task_id, user_id)
        self._tasks.soft_delete(task)
        self._db.commit()


class TaskLinkService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._tasks = TaskService(db)

    def list(self, task_id: UUID, user_id: UUID) -> list[TaskLinkRow]:
        self._tasks.get(task_id, user_id)
        return list(
            self._db.scalars(
                select(TaskLinkRow).where(
                    or_(TaskLinkRow.from_task_id == task_id, TaskLinkRow.to_task_id == task_id)
                )
            ).all()
        )

    def create(self, task_id: UUID, user_id: UUID, data: CreateTaskLinkInput) -> TaskLinkRow:
        source = self._tasks.get(task_id, user_id)
        target = self._tasks.get(data.to_task_id, user_id)
        if source.id == target.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="self_link")
        if source.project_id != target.project_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="cross_project_link")
        existing = self._db.scalars(
            select(TaskLinkRow).where(
                TaskLinkRow.from_task_id == task_id,
                TaskLinkRow.to_task_id == data.to_task_id,
                TaskLinkRow.link_type == data.link_type,
            )
        ).first()
        if existing:
            return existing
        link = TaskLinkRow(
            from_task_id=task_id, to_task_id=data.to_task_id, link_type=data.link_type
        )
        self._db.add(link)
        self._db.commit()
        self._db.refresh(link)
        return link

    def delete(self, link_id: UUID, user_id: UUID) -> None:
        link = self._db.get(TaskLinkRow, link_id)
        if link is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="link_not_found")
        self._tasks.get(link.from_task_id, user_id)
        self._db.delete(link)
        self._db.commit()
