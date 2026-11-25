from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.routes.auth import CurrentUserDep
from app.database.session import get_db
from app.repositories.movie import MovieRepository
from app.schemas.movies import (
    MovieCreate,
    MovieListResponse,
    MoviePatch,
    MovieResponse,
)
from app.services.movie import (
    InvalidMovieDataError,
    MovieNotFoundError,
    MovieService,
)

movies_router = APIRouter(prefix="/movies", tags=["movies"])


def get_movie_service(db: Annotated[Session, Depends(get_db)]) -> MovieService:
    return MovieService(MovieRepository(db))


ServiceDep = Annotated[MovieService, Depends(get_movie_service)]


@movies_router.get("/", response_model=MovieListResponse)
def index_movies(
    user: CurrentUserDep,
    service: ServiceDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=10)] = 10,
):
    return {"movies": service.list(user.id, skip, limit)}


@movies_router.post(
    "/", response_model=MovieResponse, status_code=status.HTTP_201_CREATED
)
def create_movie(payload: MovieCreate, user: CurrentUserDep, service: ServiceDep):
    try:
        return service.create(user.id, payload.model_dump())
    except InvalidMovieDataError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Filmes em 'quero_assistir' não podem ter nota ou review.",
        ) from None


@movies_router.get("/{movie_id}", response_model=MovieResponse)
def get_movie(movie_id: int, user: CurrentUserDep, service: ServiceDep):
    try:
        return service.get(user.id, movie_id)
    except MovieNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filme não encontrado.",
        ) from None


@movies_router.patch("/{movie_id}", response_model=MovieResponse)
def patch_movie(
    movie_id: int,
    payload: MoviePatch,
    user: CurrentUserDep,
    service: ServiceDep,
):
    changes = payload.model_dump(exclude_unset=True)
    try:
        return service.update(user.id, movie_id, changes)
    except MovieNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filme não encontrado.",
        ) from None
    except InvalidMovieDataError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Filmes em 'quero_assistir' não podem ter nota ou review.",
        ) from None


@movies_router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movie(movie_id: int, user: CurrentUserDep, service: ServiceDep):
    try:
        service.delete(user.id, movie_id)
    except MovieNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Filme não encontrado.",
        ) from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
