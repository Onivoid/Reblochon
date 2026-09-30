from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models import (
    ActivityEventRow,
    InviteRow,
    TeamMemberRow,
    TeamRow,
)
from app.domain.enums import ActivityType, InviteStatus, MemberRole
from app.repositories import (
    SqlAlchemyActivityRepository,
    SqlAlchemyInviteRepository,
    SqlAlchemyTeamRepository,
)


def slugify(name: str) -> str:
    base = "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return f"{base}-{uuid4().hex[:6]}"


def normalize_optional_text(text: str | None) -> str | None:
    if text is None:
        return None
    stripped = text.strip()
    return stripped or None


class TeamService:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._teams = SqlAlchemyTeamRepository(db)
        self._invites = SqlAlchemyInviteRepository(db)
        self._activity = SqlAlchemyActivityRepository(db)

    def create_team(
        self,
        user_id: UUID,
        name: str,
        *,
        description: str | None = None,
        commit: bool = True,
    ) -> TeamRow:
        team = TeamRow(
            name=name.strip(),
            slug=slugify(name),
            description=normalize_optional_text(description),
            created_by=user_id,
        )
        self._teams.add(team)
        self._teams.add_member(
            TeamMemberRow(team_id=team.id, user_id=user_id, role=MemberRole.OWNER)
        )
        self._activity.add(
            ActivityEventRow(
                team_id=team.id,
                actor_id=user_id,
                event_type=ActivityType.MEMBER_JOINED,
                payload={"team_name": team.name},
            )
        )
        if commit:
            self._db.commit()
            self._db.refresh(team)
        return team

    def update_team(
        self,
        team_id: UUID,
        user_id: UUID,
        *,
        name: str | None = None,
        description: str | None = None,
        description_set: bool = False,
    ) -> TeamRow:
        self.require_owner(team_id, user_id)
        team = self._teams.get(team_id)
        if team is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="team_not_found")
        if name is not None:
            team.name = name.strip()
        if description_set:
            team.description = normalize_optional_text(description)
        self._db.commit()
        self._db.refresh(team)
        return team

    def delete_team(self, team_id: UUID, user_id: UUID) -> None:
        self.require_owner(team_id, user_id)
        team = self._teams.get(team_id)
        if team is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="team_not_found")
        self._db.execute(delete(TeamRow).where(TeamRow.id == team_id))
        self._db.commit()

    def list_teams(self, user_id: UUID) -> list[TeamRow]:
        return self._teams.list_for_user(user_id)

    def require_member(self, team_id: UUID, user_id: UUID) -> TeamMemberRow:
        membership = self._teams.get_membership(team_id, user_id)
        if membership is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="team_not_found")
        return membership

    def require_owner(self, team_id: UUID, user_id: UUID) -> TeamMemberRow:
        membership = self.require_member(team_id, user_id)
        if membership.role != MemberRole.OWNER:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="owner_required")
        return membership

    def list_members(self, team_id: UUID, user_id: UUID) -> list[TeamMemberRow]:
        self.require_member(team_id, user_id)
        return self._teams.list_members(team_id)

    def create_invite(self, team_id: UUID, user_id: UUID, email: str) -> InviteRow:
        self.require_owner(team_id, user_id)
        invite = InviteRow(
            email=email.lower(),
            team_id=team_id,
            invited_by=user_id,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
        self._invites.add(invite)
        self._db.commit()
        self._db.refresh(invite)
        return invite

    def list_invites(self, team_id: UUID, user_id: UUID) -> list[InviteRow]:
        self.require_owner(team_id, user_id)
        return self._invites.list_for_team(team_id)

    def accept_invite(self, token: UUID, user_id: UUID, user_email: str) -> TeamRow:
        invite = self._invites.get_by_token(token)
        if invite is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="invite_not_found")
        now = datetime.now(UTC)
        if invite.status != InviteStatus.PENDING or invite.expires_at < now:
            invite.status = InviteStatus.EXPIRED
            self._db.commit()
            raise HTTPException(status.HTTP_410_GONE, detail="invite_expired")
        if invite.email.lower() != user_email.lower():
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="invite_email_mismatch")
        existing = self._teams.get_membership(invite.team_id, user_id)
        if existing is None:
            self._teams.add_member(
                TeamMemberRow(team_id=invite.team_id, user_id=user_id, role=MemberRole.MEMBER)
            )
            self._activity.add(
                ActivityEventRow(
                    team_id=invite.team_id,
                    actor_id=user_id,
                    event_type=ActivityType.MEMBER_JOINED,
                    payload={"via_invite": True},
                )
            )
        invite.status = InviteStatus.ACCEPTED
        team = self._teams.get(invite.team_id)
        if team is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="team_not_found")
        self._db.commit()
        return team
