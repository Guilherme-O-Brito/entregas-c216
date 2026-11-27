from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.auth import CurrentUserDep
from app.database.session import get_db
from app.repositories.user import UserRepository
from app.schemas.users import UserListResponse
from app.services.user import UserService

users_router = APIRouter(prefix="/users", tags=["users"])


def get_user_service(db: Annotated[Session, Depends(get_db)]) -> UserService:
    return UserService(UserRepository(db))


ServiceDep = Annotated[UserService, Depends(get_user_service)]


@users_router.get("/", response_model=UserListResponse)
def index_users(
    _user: CurrentUserDep,
    service: ServiceDep,
    name: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=10)] = 10,
):
    return {"users": service.list(name, skip, limit)}
