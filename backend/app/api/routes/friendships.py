from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import CurrentUserDep
from app.database.session import get_db
from app.repositories.friendship import FriendshipRepository
from app.repositories.movie import MovieRepository
from app.repositories.user import UserRepository
from app.schemas.friendships import (
    FriendListResponse,
    FriendshipCreate,
    FriendshipResponse,
    ReceivedFriendshipRequestList,
)
from app.schemas.movies import MovieDetailsListResponse, MovieStatus
from app.services.friendship import (
    FriendNotFoundError,
    FriendshipAlreadyExistsError,
    FriendshipRequestNotFoundError,
    FriendshipService,
    SelfFriendshipError,
)
from app.services.user import UserNotFoundError

friendships_router = APIRouter(prefix="/friendships", tags=["friendships"])

REQUEST_NOT_FOUND = "Pedido de amizade não encontrado."
FRIEND_NOT_FOUND = "Amigo não encontrado."


def get_friendship_service(
    db: Annotated[Session, Depends(get_db)],
) -> FriendshipService:
    return FriendshipService(
        FriendshipRepository(db), UserRepository(db), MovieRepository(db)
    )


ServiceDep = Annotated[FriendshipService, Depends(get_friendship_service)]


@friendships_router.post(
    "/", response_model=FriendshipResponse, status_code=status.HTTP_201_CREATED
)
def send_friendship_request(
    payload: FriendshipCreate, user: CurrentUserDep, service: ServiceDep
):
    try:
        return service.send_request(user.id, payload.user_id)
    except SelfFriendshipError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Você não pode enviar um pedido de amizade para si mesmo.",
        ) from None
    except UserNotFoundError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Usuário não encontrado."
        ) from None
    except FriendshipAlreadyExistsError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe um pedido ou amizade entre os usuários.",
        ) from None


@friendships_router.get("/requests", response_model=ReceivedFriendshipRequestList)
def index_received_requests(user: CurrentUserDep, service: ServiceDep):
    return {"requests": service.list_received_requests(user.id)}


@friendships_router.patch(
    "/requests/{request_id}/accept", response_model=FriendshipResponse
)
def accept_friendship_request(
    request_id: Annotated[int, Path(gt=0)], user: CurrentUserDep, service: ServiceDep
):
    try:
        return service.accept_request(user.id, request_id)
    except FriendshipRequestNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, REQUEST_NOT_FOUND) from None


@friendships_router.delete(
    "/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_friendship_request(
    request_id: Annotated[int, Path(gt=0)], user: CurrentUserDep, service: ServiceDep
):
    try:
        service.remove_request(user.id, request_id)
    except FriendshipRequestNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, REQUEST_NOT_FOUND) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@friendships_router.get("/", response_model=FriendListResponse)
def index_friends(user: CurrentUserDep, service: ServiceDep):
    return {"friends": service.list_friends(user.id)}


@friendships_router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_friendship(
    friend_id: Annotated[int, Path(gt=0)], user: CurrentUserDep, service: ServiceDep
):
    try:
        service.remove_friend(user.id, friend_id)
    except FriendNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, FRIEND_NOT_FOUND) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@friendships_router.get(
    "/{friend_id}/movies", response_model=MovieDetailsListResponse
)
def index_friend_movies(
    friend_id: Annotated[int, Path(gt=0)],
    movie_status: Annotated[MovieStatus, Query(alias="status")],
    user: CurrentUserDep,
    service: ServiceDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=10)] = 10,
):
    try:
        return {
            "movies": service.list_friend_movies(
                user.id, friend_id, movie_status, skip, limit
            )
        }
    except FriendNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, FRIEND_NOT_FOUND) from None
