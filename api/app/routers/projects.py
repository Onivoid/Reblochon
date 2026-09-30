from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import (
    ActivityOut,
    CreateProjectInput,
    DailyNoteInput,
    DailyNoteOut,
    ProjectOut,
    StatsOut,
    TaskOut,
)
from app.services.board_extras_service import ActivityService, DailyNoteService, StatsService
from app.services.project_service import ProjectService
from app.services.task_service import TaskService, serialize_tasks

projects_router = APIRouter(tags=["projects"])


@projects_router.post("/teams/{team_id}/projects", response_model=ProjectOut)
def create_project(
    team_id: UUID,
    body: CreateProjectInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProjectOut:
    return ProjectOut.model_validate(ProjectService(db).create(team_id, user.id, body))


@projects_router.get("/teams/{team_id}/projects", response_model=list[ProjectOut])
def list_projects(
    team_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProjectOut]:
    return [ProjectOut.model_validate(p) for p in ProjectService(db).list(team_id, user.id)]


@projects_router.get("/teams/{team_id}/today", response_model=list[TaskOut])
def list_today(
    team_id: UUID,
    mine_only: bool = Query(default=False),
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TaskOut]:
    return serialize_tasks(db, TaskService(db).list_today(team_id, user.id, mine_only))


@projects_router.get("/teams/{team_id}/activity", response_model=list[ActivityOut])
def list_activity(
    team_id: UUID,
    limit: int = Query(default=50, ge=1, le=100),
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ActivityOut]:
    return [
        ActivityOut.model_validate(e) for e in ActivityService(db).list(team_id, user.id, limit)
    ]


@projects_router.get("/teams/{team_id}/stats", response_model=StatsOut)
def team_stats(
    team_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StatsOut:
    return StatsOut(**StatsService(db).team_stats(team_id, user.id))


@projects_router.get("/teams/{team_id}/daily-note", response_model=DailyNoteOut | None)
def get_daily_note(
    team_id: UUID,
    note_date: date | None = None,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyNoteOut | None:
    note = DailyNoteService(db).get(team_id, user.id, note_date)
    return DailyNoteOut.model_validate(note) if note else None


@projects_router.put("/teams/{team_id}/daily-note", response_model=DailyNoteOut)
def upsert_daily_note(
    team_id: UUID,
    body: DailyNoteInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DailyNoteOut:
    return DailyNoteOut.model_validate(DailyNoteService(db).upsert(team_id, user.id, body))
