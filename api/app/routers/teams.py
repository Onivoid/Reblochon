from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import (
    InviteCreateIn,
    InviteOut,
    MemberOut,
    MessageOut,
    TeamCreateIn,
    TeamOut,
    TeamUpdateIn,
)
from app.services.team_service import TeamService

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamOut)
def create_team(
    body: TeamCreateIn,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamOut:
    team = TeamService(db).create_team(user.id, body.name, description=body.description)
    return TeamOut.model_validate(team)


@router.get("", response_model=list[TeamOut])
def list_teams(
    user: UserRow = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[TeamOut]:
    return [TeamOut.model_validate(t) for t in TeamService(db).list_teams(user.id)]


@router.patch("/{team_id}", response_model=TeamOut)
def update_team(
    team_id: UUID,
    body: TeamUpdateIn,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamOut:
    data = body.model_dump(exclude_unset=True)
    team = TeamService(db).update_team(
        team_id,
        user.id,
        name=data.get("name"),
        description=data.get("description"),
        description_set="description" in data,
    )
    return TeamOut.model_validate(team)


@router.delete("/{team_id}", response_model=MessageOut)
def delete_team(
    team_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageOut:
    TeamService(db).delete_team(team_id, user.id)
    return MessageOut(detail="ok")


@router.get("/{team_id}/members", response_model=list[MemberOut])
def list_members(
    team_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MemberOut]:
    members = TeamService(db).list_members(team_id, user.id)
    return [
        MemberOut(
            id=m.id,
            user_id=m.user_id,
            role=m.role,
            display_name=m.user.display_name,
            email=m.user.email,
            job_title=m.user.job_title,
            avatar_seed=m.user.avatar_seed,
            avatar_config=m.user.avatar_config,
        )
        for m in members
    ]


@router.post("/{team_id}/invites", response_model=InviteOut)
def create_invite(
    team_id: UUID,
    body: InviteCreateIn,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InviteOut:
    invite = TeamService(db).create_invite(team_id, user.id, body.email)
    return InviteOut.model_validate(invite)


@router.get("/{team_id}/invites", response_model=list[InviteOut])
def list_invites(
    team_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InviteOut]:
    return [InviteOut.model_validate(i) for i in TeamService(db).list_invites(team_id, user.id)]


@router.post("/invites/{token}/accept", response_model=TeamOut)
def accept_invite(
    token: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TeamOut:
    team = TeamService(db).accept_invite(token, user.id, user.email)
    return TeamOut.model_validate(team)
