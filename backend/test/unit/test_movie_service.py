import pytest

from app.models.user_movie import UserMovie
from app.services.movie import (
    InvalidMovieDataError,
    MovieNotFoundError,
    MovieService,
)


class FakeMovieRepository:
    def __init__(self):
        self.movies: dict[int, UserMovie] = {}
        self.next_id = 1

    def create(self, user_id: int, **data) -> UserMovie:
        movie = UserMovie(id=self.next_id, user_id=user_id, **data)
        self.movies[movie.id] = movie
        self.next_id += 1
        return movie

    def get_by_id(self, user_id: int, movie_id: int) -> UserMovie | None:
        movie = self.movies.get(movie_id)
        if movie is None or movie.user_id != user_id:
            return None
        return movie

    def get_all(self, user_id: int, skip: int, limit: int) -> list[dict]:
        movies = sorted(
            (movie for movie in self.movies.values() if movie.user_id == user_id),
            key=lambda movie: movie.id,
        )
        return [
            {"id": movie.id, "title": movie.title, "movie_cover": movie.movie_cover}
            for movie in movies[skip : skip + limit]
        ]

    def update(self, movie: UserMovie, changes: dict) -> UserMovie:
        for field, value in changes.items():
            setattr(movie, field, value)
        return movie

    def delete(self, movie: UserMovie) -> None:
        del self.movies[movie.id]


@pytest.fixture
def repository() -> FakeMovieRepository:
    return FakeMovieRepository()


@pytest.fixture
def service(repository: FakeMovieRepository) -> MovieService:
    return MovieService(repository)


def test_create_movie_assigns_owner(service: MovieService) -> None:
    cover = "https://images.example.com/arrival.jpg"
    movie = service.create(
        7,
        {
            "title": "Arrival",
            "status": "assistido",
            "rating": 9,
            "review": "Ótimo filme",
            "movie_cover": cover,
        },
    )

    assert movie.user_id == 7
    assert movie.title == "Arrival"
    assert movie.rating == 9
    assert movie.movie_cover == cover


def test_create_rejects_review_fields_for_watchlist(service: MovieService) -> None:
    with pytest.raises(InvalidMovieDataError):
        service.create(
            7,
            {
                "title": "Arrival",
                "status": "quero_assistir",
                "rating": None,
                "review": "Ainda não assisti",
            },
        )


def test_list_returns_only_the_requested_users_movies(
    service: MovieService,
) -> None:
    cover = "https://images.example.com/arrival.jpg"
    service.create(7, {"title": "Arrival", "status": "assistido", "movie_cover": cover})
    service.create(8, {"title": "Alien", "status": "assistido"})
    service.create(7, {"title": "Dune", "status": "quero_assistir"})

    assert service.list(7) == [
        {"id": 1, "title": "Arrival", "movie_cover": cover},
        {"id": 3, "title": "Dune", "movie_cover": None},
    ]


def test_get_rejects_a_movie_owned_by_another_user(service: MovieService) -> None:
    movie = service.create(7, {"title": "Arrival", "status": "assistido"})

    with pytest.raises(MovieNotFoundError):
        service.get(8, movie.id)


def test_update_changes_only_submitted_fields(service: MovieService) -> None:
    cover = "https://images.example.com/arrival.jpg"
    movie = service.create(
        7,
        {
            "title": "Arrival",
            "status": "assistido",
            "rating": 9,
            "review": "Ótimo filme",
            "movie_cover": cover,
        },
    )

    updated = service.update(7, movie.id, {"title": "A Chegada"})

    assert updated.title == "A Chegada"
    assert updated.status == "assistido"
    assert updated.rating == 9
    assert updated.review == "Ótimo filme"
    assert updated.movie_cover == cover


def test_update_can_move_movie_to_watchlist_after_clearing_review_fields(
    service: MovieService,
) -> None:
    movie = service.create(
        7,
        {
            "title": "Arrival",
            "status": "assistido",
            "rating": 9,
            "review": "Ótimo filme",
        },
    )

    updated = service.update(
        7,
        movie.id,
        {"status": "quero_assistir", "rating": None, "review": None},
    )

    assert updated.status == "quero_assistir"
    assert updated.rating is None
    assert updated.review is None


def test_update_rejects_inconsistent_watchlist_fields(
    service: MovieService,
) -> None:
    movie = service.create(
        7,
        {"title": "Arrival", "status": "assistido", "rating": 9},
    )

    with pytest.raises(InvalidMovieDataError):
        service.update(7, movie.id, {"status": "quero_assistir"})


def test_update_rejects_a_movie_owned_by_another_user(
    service: MovieService,
) -> None:
    movie = service.create(7, {"title": "Arrival", "status": "assistido"})

    with pytest.raises(MovieNotFoundError):
        service.update(8, movie.id, {"title": "Alterado"})


def test_delete_removes_movie(service: MovieService) -> None:
    movie = service.create(7, {"title": "Arrival", "status": "assistido"})

    service.delete(7, movie.id)

    with pytest.raises(MovieNotFoundError):
        service.get(7, movie.id)


def test_delete_rejects_a_movie_owned_by_another_user(
    service: MovieService,
) -> None:
    movie = service.create(7, {"title": "Arrival", "status": "assistido"})

    with pytest.raises(MovieNotFoundError):
        service.delete(8, movie.id)

    assert service.get(7, movie.id) is movie
