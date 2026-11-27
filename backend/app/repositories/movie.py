from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user_movie import UserMovie


class MovieRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, **data) -> UserMovie:
        movie = UserMovie(user_id=user_id, **data)
        self.db.add(movie)
        self.db.commit()
        self.db.refresh(movie)
        return movie

    def get_by_id(self, user_id: int, movie_id: int) -> UserMovie | None:
        statement = select(UserMovie).where(
            UserMovie.id == movie_id,
            UserMovie.user_id == user_id,
        )
        return self.db.scalar(statement)

    def get_all(self, user_id: int, skip: int, limit: int) -> list[dict]:
        statement = (
            select(UserMovie.id, UserMovie.title, UserMovie.movie_cover)
            .where(UserMovie.user_id == user_id)
            .order_by(UserMovie.id)
            .offset(skip)
            .limit(limit)
        )
        return [dict(row._mapping) for row in self.db.execute(statement)]

    def get_all_by_status(
        self, user_id: int, status: str, skip: int, limit: int
    ) -> list[UserMovie]:
        statement = (
            select(UserMovie)
            .where(UserMovie.user_id == user_id, UserMovie.status == status)
            .order_by(UserMovie.id)
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(statement))

    def update(self, movie: UserMovie, changes: dict) -> UserMovie:
        if not changes:
            return movie
        for field, value in changes.items():
            setattr(movie, field, value)
        self.db.commit()
        self.db.refresh(movie)
        return movie

    def delete(self, movie: UserMovie) -> None:
        self.db.delete(movie)
        self.db.commit()
