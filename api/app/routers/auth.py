from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import UserRow
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import (
    AuthResponse,
    CreateUserInput,
    LocaleUpdateIn,
    LoginInput,
    MessageOut,
    RefreshInput,
    UserOut,
)
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=AuthResponse)
def register(body: CreateUserInput, db: Session = Depends(get_db)) -> AuthResponse:
    user, tokens = AuthService(db).register(body)
    return AuthResponse(user=UserOut.model_validate(user), **tokens.model_dump())


@router.post("/auth/login", response_model=AuthResponse)
def login(body: LoginInput, db: Session = Depends(get_db)) -> AuthResponse:
    user, tokens = AuthService(db).login(body)
    return AuthResponse(user=UserOut.model_validate(user), **tokens.model_dump())


@router.post("/auth/refresh", response_model=AuthResponse)
def refresh(body: RefreshInput, db: Session = Depends(get_db)) -> AuthResponse:
    user, tokens = AuthService(db).refresh(body.refresh_token)
    return AuthResponse(user=UserOut.model_validate(user), **tokens.model_dump())


@router.post("/auth/logout", response_model=MessageOut)
def logout(body: RefreshInput, db: Session = Depends(get_db)) -> MessageOut:
    AuthService(db).logout(body.refresh_token)
    return MessageOut(detail="ok")


@router.get("/me", response_model=UserOut)
def me(user: UserRow = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(
    body: LocaleUpdateIn,
    user: UserRow = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    updated = AuthService(db).update_profile(user, body)
    return UserOut.model_validate(updated)
