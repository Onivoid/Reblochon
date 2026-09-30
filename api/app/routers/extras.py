from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import FocusOut
from app.schemas.service_inputs import FocusStartInput
from app.services.board_extras_service import FocusService

extras_router = APIRouter(tags=["extras"])


@extras_router.post("/focus", response_model=FocusOut)
def start_focus(
    body: FocusStartInput,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FocusOut:
    return FocusOut.model_validate(FocusService(db).start(user.id, body))


@extras_router.post("/focus/{session_id}/end", response_model=FocusOut)
def end_focus(
    session_id: UUID,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FocusOut:
    return FocusOut.model_validate(FocusService(db).end(session_id, user.id))


@extras_router.get("/focus", response_model=list[FocusOut])
def list_focus(
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FocusOut]:
    return [FocusOut.model_validate(s) for s in FocusService(db).list_mine(user.id)]
