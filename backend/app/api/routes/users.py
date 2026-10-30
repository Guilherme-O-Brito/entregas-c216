from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.repositories.user import UserRepository
from app.schemas.users import (
    UserCreate,
    UserDelete,
    UserListResponse,
    UserPatch,
    UserResponse,
)
from app.services.user import (
    UserAlreadyExistsError,
    UserNotFoundError,
    UserService,
)

users_router = APIRouter(prefix="/users", tags=["users"])

NOT_FOUND = "Usuario não encontrado."
ALREADY_EXISTS = "Já existe um usuário com esse e-mail."


def get_user_service(db: Annotated[Session, Depends(get_db)]) -> UserService:
    return UserService(UserRepository(db))


ServiceDep = Annotated[UserService, Depends(get_user_service)]


@users_router.get("/", response_model=UserListResponse)
def index_users(
    service: ServiceDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1)] = 100,
):
    return {"users": service.list(skip, limit)}


@users_router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, service: ServiceDep):
    try:
        return service.get(user_id)
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from None


@users_router.post(
    "/", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def create_user(payload: UserCreate, service: ServiceDep):
    try:
        return service.create(payload.model_dump())
    except UserAlreadyExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_EXISTS) from None


@users_router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserCreate, service: ServiceDep):
    try:
        return service.update(user_id, payload.model_dump())
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from None
    except UserAlreadyExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_EXISTS) from None


@users_router.patch("/{user_id}", response_model=UserResponse)
def patch_user(user_id: int, payload: UserPatch, service: ServiceDep):
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    try:
        return service.update(user_id, changes)
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from None
    except UserAlreadyExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, ALREADY_EXISTS) from None


@users_router.delete("/{user_id}", response_model=UserDelete)
def delete_user(user_id: int, service: ServiceDep):
    try:
        service.delete(user_id)
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_FOUND) from None
    return {"message": "Usuario deletado."}
