from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import (
    ActivityEventRow,
    CommentRow,
    FocusSessionRow,
    SubtaskRow,
    TaskAttachmentRow,
    TaskDrawingRow,
    TeamDailyNoteRow,
)
from app.domain.enums import ActivityType, TaskStatus
from app.repositories import (
    SqlAlchemyActivityRepository,
    SqlAlchemyAttachmentRepository,
    SqlAlchemyCommentRepository,
    SqlAlchemyDailyNoteRepository,
    SqlAlchemyDrawingRepository,
    SqlAlchemyFocusRepository,
    SqlAlchemyProjectRepository,
    SqlAlchemySubtaskRepository,
    SqlAlchemyTaskRepository,
)
from app.schemas.service_inputs import (
    AttachmentInput,
    CreateCommentInput,
    CreateSubtaskInput,
    DailyNoteInput,
    DrawingInput,
    FocusStartInput,
    UpdateSubtaskInput,
)
from app.services.project_service import ProjectService
from app.services.task_service import TaskService
from app.services.team_service import TeamService


class CommentService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._comments = SqlAlchemyCommentRepository(db)
        self._tasks = TaskService(db)
        self._activity = SqlAlchemyActivityRepository(db)
        self._projects = ProjectService(db)

    def add(self, task_id: UUID, user_id: UUID, data: CreateCommentInput) -> CommentRow:
        task = self._tasks.get(task_id, user_id)
        project = self._projects.get_for_member(task.project_id, user_id)
        comment = CommentRow(task_id=task.id, author_id=user_id, body=data.body.strip())
        self._comments.add(comment)
        self._activity.add(
            ActivityEventRow(
                team_id=project.team_id,
                actor_id=user_id,
                event_type=ActivityType.COMMENT_ADDED,
                payload={"task_id": str(task.id)},
            )
        )
        self._db.commit()
        self._db.refresh(comment)
        return comment

    def list(self, task_id: UUID, user_id: UUID) -> list[CommentRow]:
        self._tasks.get(task_id, user_id)
        return self._comments.list_for_task(task_id)


class SubtaskService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._subtasks = SqlAlchemySubtaskRepository(db)
        self._tasks = TaskService(db)

    def add(self, task_id: UUID, user_id: UUID, data: CreateSubtaskInput) -> SubtaskRow:
        self._tasks.get(task_id, user_id)
        subtask = SubtaskRow(task_id=task_id, title=data.title.strip())
        self._subtasks.add(subtask)
        self._db.commit()
        self._db.refresh(subtask)
        return subtask

    def update(self, subtask_id: UUID, user_id: UUID, data: UpdateSubtaskInput) -> SubtaskRow:
        subtask = self._subtasks.get(subtask_id)
        if subtask is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="subtask_not_found")
        self._tasks.get(subtask.task_id, user_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(subtask, key, value)
        self._db.commit()
        self._db.refresh(subtask)
        return subtask

    def list(self, task_id: UUID, user_id: UUID) -> list[SubtaskRow]:
        self._tasks.get(task_id, user_id)
        return self._subtasks.list_for_task(task_id)


class DrawingService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._drawings = SqlAlchemyDrawingRepository(db)
        self._tasks = TaskService(db)
        self._projects = ProjectService(db)
        self._activity = SqlAlchemyActivityRepository(db)

    def get(self, task_id: UUID, user_id: UUID) -> TaskDrawingRow | None:
        self._tasks.get(task_id, user_id)
        return self._drawings.get_for_task(task_id)

    def save(self, task_id: UUID, user_id: UUID, data: DrawingInput) -> TaskDrawingRow:
        task = self._tasks.get(task_id, user_id)
        project = self._projects.get_for_member(task.project_id, user_id)
        drawing = TaskDrawingRow(task_id=task_id, scene_json=data.scene_json, updated_by=user_id)
        saved = self._drawings.upsert(drawing)
        self._activity.add(
            ActivityEventRow(
                team_id=project.team_id,
                actor_id=user_id,
                event_type=ActivityType.DRAWING_UPDATED,
                payload={"task_id": str(task_id)},
            )
        )
        self._db.commit()
        return saved


class FocusService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._focus = SqlAlchemyFocusRepository(db)
        self._tasks = TaskService(db)

    def start(self, user_id: UUID, data: FocusStartInput) -> FocusSessionRow:
        if data.task_id is not None:
            self._tasks.get(data.task_id, user_id)
        session = FocusSessionRow(
            user_id=user_id, task_id=data.task_id, duration_sec=data.duration_sec
        )
        self._focus.add(session)
        self._db.commit()
        self._db.refresh(session)
        return session

    def end(self, session_id: UUID, user_id: UUID) -> FocusSessionRow:
        session = self._focus.get(session_id)
        if session is None or session.user_id != user_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="focus_not_found")
        from app.db.models import utcnow

        session.ended_at = utcnow()
        self._db.commit()
        self._db.refresh(session)
        return session

    def list_mine(self, user_id: UUID) -> list[FocusSessionRow]:
        return self._focus.list_for_user(user_id)


class DailyNoteService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._notes = SqlAlchemyDailyNoteRepository(db)
        self._teams = TeamService(db)
        self._activity = SqlAlchemyActivityRepository(db)

    def get(
        self, team_id: UUID, user_id: UUID, note_date: date | None = None
    ) -> TeamDailyNoteRow | None:
        self._teams.require_member(team_id, user_id)
        return self._notes.get(team_id, note_date or date.today())

    def upsert(self, team_id: UUID, user_id: UUID, data: DailyNoteInput) -> TeamDailyNoteRow:
        self._teams.require_member(team_id, user_id)
        note_date = data.note_date or date.today()
        note = TeamDailyNoteRow(
            team_id=team_id, note_date=note_date, body=data.body.strip(), author_id=user_id
        )
        saved = self._notes.upsert(note)
        self._activity.add(
            ActivityEventRow(
                team_id=team_id,
                actor_id=user_id,
                event_type=ActivityType.DAILY_NOTE,
                payload={"note_date": str(note_date)},
            )
        )
        self._db.commit()
        return saved


class AttachmentService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._attachments = SqlAlchemyAttachmentRepository(db)
        self._tasks = TaskService(db)

    def add(self, task_id: UUID, user_id: UUID, data: AttachmentInput) -> TaskAttachmentRow:
        self._tasks.get(task_id, user_id)
        attachment = TaskAttachmentRow(
            task_id=task_id,
            label=data.label.strip(),
            url=str(data.url).strip(),
            created_by=user_id,
        )
        self._attachments.add(attachment)
        self._db.commit()
        self._db.refresh(attachment)
        return attachment

    def list(self, task_id: UUID, user_id: UUID) -> list[TaskAttachmentRow]:
        self._tasks.get(task_id, user_id)
        return self._attachments.list_for_task(task_id)

    def delete(self, attachment_id: UUID, user_id: UUID) -> None:
        attachment = self._attachments.get(attachment_id)
        if attachment is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="attachment_not_found")
        self._tasks.get(attachment.task_id, user_id)
        self._attachments.delete(attachment)
        self._db.commit()


class ActivityService:
    def __init__(self, db: Session) -> None:
        self._activity = SqlAlchemyActivityRepository(db)
        self._teams = TeamService(db)

    def list(self, team_id: UUID, user_id: UUID, limit: int = 50) -> list[ActivityEventRow]:
        self._teams.require_member(team_id, user_id)
        return self._activity.list_for_team(team_id, limit)


class StatsService:
    def __init__(self, db: Session) -> None:
        self._tasks = SqlAlchemyTaskRepository(db)
        self._projects = SqlAlchemyProjectRepository(db)
        self._teams = TeamService(db)

    def team_stats(self, team_id: UUID, user_id: UUID) -> dict:
        self._teams.require_member(team_id, user_id)
        projects = self._projects.list_for_team(team_id)
        total = 0
        done = 0
        doing = 0
        today = 0
        for project in projects:
            for task in self._tasks.list_for_project(project.id):
                total += 1
                if task.status == TaskStatus.DONE:
                    done += 1
                elif task.status == TaskStatus.DOING:
                    doing += 1
                if task.is_today or task.scheduled_for == date.today():
                    today += 1
        return {
            "total_tasks": total,
            "done_tasks": done,
            "doing_tasks": doing,
            "today_tasks": today,
            "project_count": len(projects),
        }
