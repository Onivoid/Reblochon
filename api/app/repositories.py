from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import (
    ActivityEventRow,
    BoardColumnRow,
    CommentRow,
    FocusSessionRow,
    InviteRow,
    ProjectRow,
    RefreshTokenRow,
    SubtaskRow,
    TagRow,
    TaskAttachmentRow,
    TaskDrawingRow,
    TaskRow,
    TeamDailyNoteRow,
    TeamMemberRow,
    TeamRow,
    UserRow,
    utcnow,
)


class SqlAlchemyUserRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_id(self, user_id: UUID) -> UserRow | None:
        return self._db.get(UserRow, user_id)

    def get_by_email(self, email: str) -> UserRow | None:
        return self._db.scalar(select(UserRow).where(UserRow.email == email.lower()))

    def add(self, user: UserRow) -> UserRow:
        self._db.add(user)
        self._db.flush()
        return user


class SqlAlchemyTeamRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get(self, team_id: UUID) -> TeamRow | None:
        return self._db.get(TeamRow, team_id)

    def get_by_slug(self, slug: str) -> TeamRow | None:
        return self._db.scalar(select(TeamRow).where(TeamRow.slug == slug))

    def add(self, team: TeamRow) -> TeamRow:
        self._db.add(team)
        self._db.flush()
        return team

    def list_for_user(self, user_id: UUID) -> list[TeamRow]:
        stmt: Select[tuple[TeamRow]] = (
            select(TeamRow)
            .join(TeamMemberRow, TeamMemberRow.team_id == TeamRow.id)
            .where(TeamMemberRow.user_id == user_id)
            .order_by(TeamRow.name)
        )
        return list(self._db.scalars(stmt).all())

    def get_membership(self, team_id: UUID, user_id: UUID) -> TeamMemberRow | None:
        return self._db.scalar(
            select(TeamMemberRow).where(
                TeamMemberRow.team_id == team_id,
                TeamMemberRow.user_id == user_id,
            )
        )

    def add_member(self, member: TeamMemberRow) -> TeamMemberRow:
        self._db.add(member)
        self._db.flush()
        return member

    def list_members(self, team_id: UUID) -> list[TeamMemberRow]:
        stmt = (
            select(TeamMemberRow)
            .options(selectinload(TeamMemberRow.user))
            .where(TeamMemberRow.team_id == team_id)
        )
        return list(self._db.scalars(stmt).all())


class SqlAlchemyInviteRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, invite: InviteRow) -> InviteRow:
        self._db.add(invite)
        self._db.flush()
        return invite

    def get_by_token(self, token: UUID) -> InviteRow | None:
        return self._db.scalar(select(InviteRow).where(InviteRow.token == token))

    def list_for_team(self, team_id: UUID) -> list[InviteRow]:
        return list(
            self._db.scalars(
                select(InviteRow)
                .where(InviteRow.team_id == team_id)
                .order_by(InviteRow.created_at.desc())
            ).all()
        )


class SqlAlchemyProjectRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, project: ProjectRow) -> ProjectRow:
        self._db.add(project)
        self._db.flush()
        return project

    def get(self, project_id: UUID) -> ProjectRow | None:
        return self._db.get(ProjectRow, project_id)

    def list_for_team(self, team_id: UUID) -> list[ProjectRow]:
        return list(
            self._db.scalars(
                select(ProjectRow).where(ProjectRow.team_id == team_id).order_by(ProjectRow.name)
            ).all()
        )

    def delete(self, project: ProjectRow) -> None:
        self._db.delete(project)
        self._db.flush()


class SqlAlchemyColumnRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, column: BoardColumnRow) -> BoardColumnRow:
        self._db.add(column)
        self._db.flush()
        return column

    def get(self, column_id: UUID) -> BoardColumnRow | None:
        return self._db.get(BoardColumnRow, column_id)

    def list_for_project(self, project_id: UUID) -> list[BoardColumnRow]:
        return list(
            self._db.scalars(
                select(BoardColumnRow)
                .where(BoardColumnRow.project_id == project_id)
                .order_by(BoardColumnRow.position, BoardColumnRow.name)
            ).all()
        )

    def delete(self, column: BoardColumnRow) -> None:
        self._db.delete(column)
        self._db.flush()


class SqlAlchemyTaskRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, task: TaskRow) -> TaskRow:
        self._db.add(task)
        self._db.flush()
        return task

    def get(self, task_id: UUID) -> TaskRow | None:
        stmt = (
            select(TaskRow)
            .options(
                selectinload(TaskRow.tags),
                selectinload(TaskRow.subtasks),
                selectinload(TaskRow.project),
            )
            .where(TaskRow.id == task_id, TaskRow.deleted_at.is_(None))
        )
        return self._db.scalar(stmt)

    def list_for_project(self, project_id: UUID) -> list[TaskRow]:
        stmt = (
            select(TaskRow)
            .options(selectinload(TaskRow.tags), selectinload(TaskRow.subtasks))
            .where(TaskRow.project_id == project_id, TaskRow.deleted_at.is_(None))
            .order_by(TaskRow.position, TaskRow.created_at)
        )
        return list(self._db.scalars(stmt).all())

    def list_today(self, team_id: UUID, user_id: UUID | None) -> list[TaskRow]:
        today = date.today()
        stmt = (
            select(TaskRow)
            .join(ProjectRow, ProjectRow.id == TaskRow.project_id)
            .options(
                selectinload(TaskRow.tags),
                selectinload(TaskRow.subtasks),
                selectinload(TaskRow.project),
            )
            .where(
                ProjectRow.team_id == team_id,
                TaskRow.deleted_at.is_(None),
                (TaskRow.is_today.is_(True)) | (TaskRow.scheduled_for == today),
            )
            .order_by(TaskRow.position, TaskRow.created_at)
        )
        if user_id is not None:
            stmt = stmt.where((TaskRow.assignee_id == user_id) | (TaskRow.assignee_id.is_(None)))
        return list(self._db.scalars(stmt).all())

    def soft_delete(self, task: TaskRow) -> None:
        task.deleted_at = utcnow()
        self._db.flush()

    def reassign_column(self, from_column_id: UUID, to_column_id: UUID) -> None:
        tasks = self._db.scalars(
            select(TaskRow).where(TaskRow.column_id == from_column_id, TaskRow.deleted_at.is_(None))
        ).all()
        for task in tasks:
            task.column_id = to_column_id
        self._db.flush()


class SqlAlchemyActivityRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, event: ActivityEventRow) -> ActivityEventRow:
        self._db.add(event)
        self._db.flush()
        return event

    def list_for_team(self, team_id: UUID, limit: int = 50) -> list[ActivityEventRow]:
        return list(
            self._db.scalars(
                select(ActivityEventRow)
                .where(ActivityEventRow.team_id == team_id)
                .order_by(ActivityEventRow.created_at.desc())
                .limit(limit)
            ).all()
        )


class SqlAlchemyCommentRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, comment: CommentRow) -> CommentRow:
        self._db.add(comment)
        self._db.flush()
        return comment

    def list_for_task(self, task_id: UUID) -> list[CommentRow]:
        return list(
            self._db.scalars(
                select(CommentRow)
                .where(CommentRow.task_id == task_id)
                .order_by(CommentRow.created_at)
            ).all()
        )


class SqlAlchemyDrawingRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_for_task(self, task_id: UUID) -> TaskDrawingRow | None:
        return self._db.scalar(select(TaskDrawingRow).where(TaskDrawingRow.task_id == task_id))

    def upsert(self, drawing: TaskDrawingRow) -> TaskDrawingRow:
        existing = self.get_for_task(drawing.task_id)
        if existing is None:
            self._db.add(drawing)
            self._db.flush()
            return drawing
        existing.scene_json = drawing.scene_json
        existing.updated_by = drawing.updated_by
        existing.updated_at = datetime.now(UTC)
        self._db.flush()
        return existing


class SqlAlchemyFocusRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, session: FocusSessionRow) -> FocusSessionRow:
        self._db.add(session)
        self._db.flush()
        return session

    def get(self, session_id: UUID) -> FocusSessionRow | None:
        return self._db.get(FocusSessionRow, session_id)

    def list_for_user(self, user_id: UUID, limit: int = 20) -> list[FocusSessionRow]:
        return list(
            self._db.scalars(
                select(FocusSessionRow)
                .where(FocusSessionRow.user_id == user_id)
                .order_by(FocusSessionRow.started_at.desc())
                .limit(limit)
            ).all()
        )


class SqlAlchemyDailyNoteRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get(self, team_id: UUID, note_date: date) -> TeamDailyNoteRow | None:
        return self._db.scalar(
            select(TeamDailyNoteRow).where(
                TeamDailyNoteRow.team_id == team_id,
                TeamDailyNoteRow.note_date == note_date,
            )
        )

    def upsert(self, note: TeamDailyNoteRow) -> TeamDailyNoteRow:
        existing = self.get(note.team_id, note.note_date)
        if existing is None:
            self._db.add(note)
            self._db.flush()
            return note
        existing.body = note.body
        existing.author_id = note.author_id
        existing.updated_at = utcnow()
        self._db.flush()
        return existing


class SqlAlchemyTagRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_or_create(self, team_id: UUID, name: str) -> TagRow:
        normalized = name.strip().lower()
        existing = self._db.scalar(
            select(TagRow).where(TagRow.team_id == team_id, TagRow.name == normalized)
        )
        if existing:
            return existing
        tag = TagRow(team_id=team_id, name=normalized)
        self._db.add(tag)
        self._db.flush()
        return tag

    def list_for_team(self, team_id: UUID) -> list[TagRow]:
        return list(
            self._db.scalars(
                select(TagRow).where(TagRow.team_id == team_id).order_by(TagRow.name)
            ).all()
        )


class SqlAlchemySubtaskRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, subtask: SubtaskRow) -> SubtaskRow:
        self._db.add(subtask)
        self._db.flush()
        return subtask

    def get(self, subtask_id: UUID) -> SubtaskRow | None:
        return self._db.get(SubtaskRow, subtask_id)

    def list_for_task(self, task_id: UUID) -> list[SubtaskRow]:
        return list(
            self._db.scalars(
                select(SubtaskRow)
                .where(SubtaskRow.task_id == task_id)
                .order_by(SubtaskRow.position)
            ).all()
        )


class SqlAlchemyAttachmentRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, attachment: TaskAttachmentRow) -> TaskAttachmentRow:
        self._db.add(attachment)
        self._db.flush()
        return attachment

    def list_for_task(self, task_id: UUID) -> list[TaskAttachmentRow]:
        return list(
            self._db.scalars(
                select(TaskAttachmentRow)
                .where(TaskAttachmentRow.task_id == task_id)
                .order_by(TaskAttachmentRow.created_at.desc())
            ).all()
        )

    def get(self, attachment_id: UUID) -> TaskAttachmentRow | None:
        return self._db.get(TaskAttachmentRow, attachment_id)

    def delete(self, attachment: TaskAttachmentRow) -> None:
        self._db.delete(attachment)
        self._db.flush()


class SqlAlchemyRefreshTokenRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def add(self, token: RefreshTokenRow) -> RefreshTokenRow:
        self._db.add(token)
        self._db.flush()
        return token

    def get_by_hash(self, token_hash: str) -> RefreshTokenRow | None:
        return self._db.scalar(
            select(RefreshTokenRow).where(RefreshTokenRow.token_hash == token_hash)
        )

    def revoke(self, token: RefreshTokenRow) -> None:
        token.revoked_at = utcnow()
        self._db.flush()
