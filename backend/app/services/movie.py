from app.models.user_movie import UserMovie
from app.repositories.movie import MovieRepository
from app.schemas.movies import MovieStatus


class MovieNotFoundError(Exception):
    pass


class InvalidMovieDataError(Exception):
    pass


class MovieService:
    def __init__(self, repository: MovieRepository):
        self.repository = repository

    def create(self, user_id: int, data: dict) -> UserMovie:
        self._validate_status_fields(
            data["status"], data.get("rating"), data.get("review")
        )
        return self.repository.create(user_id=user_id, **data)

    def list(self, user_id: int, skip: int = 0, limit: int = 10) -> list[dict]:
        return self.repository.get_all(user_id, skip, limit)

    def get(self, user_id: int, movie_id: int) -> UserMovie:
        movie = self.repository.get_by_id(user_id, movie_id)
        if movie is None:
            raise MovieNotFoundError
        return movie

    def update(self, user_id: int, movie_id: int, changes: dict) -> UserMovie:
        movie = self.get(user_id, movie_id)
        status: MovieStatus = changes.get("status", movie.status)
        rating = changes.get("rating", movie.rating)
        review = changes.get("review", movie.review)
        self._validate_status_fields(status, rating, review)
        return self.repository.update(movie, changes)

    def delete(self, user_id: int, movie_id: int) -> None:
        movie = self.get(user_id, movie_id)
        self.repository.delete(movie)

    @staticmethod
    def _validate_status_fields(
        status: MovieStatus, rating: int | None, review: str | None
    ) -> None:
        if status == "quero_assistir" and (rating is not None or review is not None):
            raise InvalidMovieDataError
