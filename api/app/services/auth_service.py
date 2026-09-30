from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import RefreshTokenRow, UserRow
from app.repositories import SqlAlchemyRefreshTokenRepository, SqlAlchemyUserRepository
from app.schemas import CreateUserInput, LocaleUpdateIn, LoginInput, TokenPair
from app.security.jwt import (
    create_access_token,
    create_refresh_token_value,
    hash_token,
    refresh_expiry,
)
from app.security.password import hash_password, verify_password
from app.services.team_service import TeamService


class AuthService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._users = SqlAlchemyUserRepository(db)
        self._tokens = SqlAlchemyRefreshTokenRepository(db)

    def register(self, data: CreateUserInput) -> tuple[UserRow, TokenPair]:
        if self._users.get_by_email(data.email):
            raise HTTPException(status.HTTP_409_CONFLICT, detail="email_taken")
        user = UserRow(
            email=data.email.lower(),
            password_hash=hash_password(data.password),
            display_name=data.display_name.strip(),
            locale=data.locale,
        )
        self._users.add(user)
        self._db.flush()
        from app.schemas.service_inputs import CreateProjectInput
        from app.services.project_service import ProjectService

        team = TeamService(self._db).create_team(
            user.id,
            "Default",
            description="Équipe de démarrage",
            commit=False,
        )
        ProjectService(self._db).create(
            team.id,
            user.id,
            CreateProjectInput(name="Général"),
            commit=False,
        )
        tokens = self._issue_tokens(user)
        self._db.commit()
        self._db.refresh(user)
        return user, tokens

    def login(self, data: LoginInput) -> tuple[UserRow, TokenPair]:
        user = self._users.get_by_email(data.email)
        if user is None or not verify_password(data.password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
        tokens = self._issue_tokens(user)
        self._db.commit()
        return user, tokens

    def refresh(self, raw_refresh: str) -> tuple[UserRow, TokenPair]:
        row = self._tokens.get_by_hash(hash_token(raw_refresh))
        now = datetime.now(UTC)
        if row is None or row.revoked_at is not None or row.expires_at < now:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_refresh")
        user = self._users.get_by_id(row.user_id)
        if user is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_refresh")
        self._tokens.revoke(row)
        tokens = self._issue_tokens(user)
        self._db.commit()
        return user, tokens

    def logout(self, raw_refresh: str) -> None:
        row = self._tokens.get_by_hash(hash_token(raw_refresh))
        if row is not None and row.revoked_at is None:
            self._tokens.revoke(row)
            self._db.commit()

    def update_profile(self, user: UserRow, body: LocaleUpdateIn) -> UserRow:
        data = body.model_dump(exclude_unset=True)
        if "locale" in data and data["locale"] is not None:
            user.locale = data["locale"]
        if "display_name" in data and data["display_name"] is not None:
            user.display_name = data["display_name"].strip()
        if "job_title" in data:
            raw = data["job_title"]
            user.job_title = raw.strip() if isinstance(raw, str) and raw.strip() else None
        if "avatar_seed" in data:
            raw = data["avatar_seed"]
            user.avatar_seed = raw.strip() if isinstance(raw, str) and raw.strip() else None
        if "avatar_config" in data:
            user.avatar_config = data["avatar_config"]
        self._db.commit()
        self._db.refresh(user)
        return user

    def _issue_tokens(self, user: UserRow) -> TokenPair:
        access = create_access_token(user.id, user.email)
        raw_refresh = create_refresh_token_value()
        self._tokens.add(
            RefreshTokenRow(
                user_id=user.id,
                token_hash=hash_token(raw_refresh),
                expires_at=refresh_expiry(),
            )
        )
        return TokenPair(access_token=access, refresh_token=raw_refresh)
