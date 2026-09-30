from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import BoardColumnRow, ProjectRow
from app.domain.enums import TaskStatus
from app.repositories import (
    SqlAlchemyColumnRepository,
    SqlAlchemyProjectRepository,
    SqlAlchemyTaskRepository,
)
from app.schemas.service_inputs import CreateColumnInput, CreateProjectInput, UpdateColumnInput
from app.services.team_service import TeamService

DEFAULT_COLUMNS = (
    ("À faire", 0.0, "accent", False),
    ("En cours", 1.0, "cyan", False),
    ("Terminé", 2.0, "mint", True),
)


def seed_default_columns(db: Session, project_id: UUID) -> list[BoardColumnRow]:
    repo = SqlAlchemyColumnRepository(db)
    columns: list[BoardColumnRow] = []
    for name, position, color_token, is_done in DEFAULT_COLUMNS:
        columns.append(
            repo.add(
                BoardColumnRow(
                    project_id=project_id,
                    name=name,
                    position=position,
                    color_token=color_token,
                    is_done=is_done,
                )
            )
        )
    return columns


def status_for_column(column: BoardColumnRow | None, columns: list[BoardColumnRow]) -> TaskStatus:
    if column is None:
        return TaskStatus.TODO
    if column.is_done:
        return TaskStatus.DONE
    ordered = sorted(columns, key=lambda c: c.position)
    open_cols = [c for c in ordered if not c.is_done]
    if not open_cols:
        return TaskStatus.TODO
    if column.id == open_cols[0].id:
        return TaskStatus.TODO
    return TaskStatus.DOING


class ProjectService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._projects = SqlAlchemyProjectRepository(db)
        self._columns = SqlAlchemyColumnRepository(db)
        self._teams = TeamService(db)

    def create(
        self,
        team_id: UUID,
        user_id: UUID,
        data: CreateProjectInput,
        *,
        commit: bool = True,
    ) -> ProjectRow:
        self._teams.require_member(team_id, user_id)
        project = ProjectRow(team_id=team_id, name=data.name.strip(), color_token=data.color_token)
        self._projects.add(project)
        seed_default_columns(self._db, project.id)
        if commit:
            self._db.commit()
            self._db.refresh(project)
        return project

    def list(self, team_id: UUID, user_id: UUID) -> list[ProjectRow]:
        self._teams.require_member(team_id, user_id)
        return self._projects.list_for_team(team_id)

    def get_for_member(self, project_id: UUID, user_id: UUID) -> ProjectRow:
        project = self._projects.get(project_id)
        if project is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="project_not_found")
        self._teams.require_member(project.team_id, user_id)
        return project


class ColumnService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._columns = SqlAlchemyColumnRepository(db)
        self._tasks = SqlAlchemyTaskRepository(db)
        self._projects = ProjectService(db)

    def list(self, project_id: UUID, user_id: UUID) -> list[BoardColumnRow]:
        self._projects.get_for_member(project_id, user_id)
        return self._columns.list_for_project(project_id)

    def create(self, project_id: UUID, user_id: UUID, data: CreateColumnInput) -> BoardColumnRow:
        self._projects.get_for_member(project_id, user_id)
        existing = self._columns.list_for_project(project_id)
        position = data.position if data.position is not None else float(len(existing))
        column = self._columns.add(
            BoardColumnRow(
                project_id=project_id,
                name=data.name.strip(),
                description=data.description,
                position=position,
                color_token=data.color_token,
                is_done=data.is_done,
            )
        )
        self._db.commit()
        self._db.refresh(column)
        return column

    def update(self, column_id: UUID, user_id: UUID, data: UpdateColumnInput) -> BoardColumnRow:
        column = self._columns.get(column_id)
        if column is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="column_not_found")
        self._projects.get_for_member(column.project_id, user_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            if key == "name" and isinstance(value, str):
                value = value.strip()
            setattr(column, key, value)
        self._db.commit()
        self._db.refresh(column)
        return column

    def reorder(self, project_id: UUID, user_id: UUID, items: list[dict]) -> list[BoardColumnRow]:
        self._projects.get_for_member(project_id, user_id)
        columns = {c.id: c for c in self._columns.list_for_project(project_id)}
        for item in items:
            raw_id = item.get("id")
            position = item.get("position")
            if raw_id is None or position is None:
                continue
            cid = raw_id if isinstance(raw_id, UUID) else UUID(str(raw_id))
            column = columns.get(cid)
            if column is not None:
                column.position = float(position)
        self._db.commit()
        return self._columns.list_for_project(project_id)

    def delete(self, column_id: UUID, user_id: UUID) -> None:
        column = self._columns.get(column_id)
        if column is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="column_not_found")
        self._projects.get_for_member(column.project_id, user_id)
        siblings = self._columns.list_for_project(column.project_id)
        if len(siblings) <= 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="last_column")
        fallback = next(c for c in siblings if c.id != column.id)
        self._tasks.reassign_column(column.id, fallback.id)
        self._columns.delete(column)
        self._db.commit()
