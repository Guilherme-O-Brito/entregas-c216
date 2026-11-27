import pytest
from pydantic import ValidationError

from app.schemas.movies import MovieCreate, MoviePatch

COVER_URL = "https://Images.Example.com/Arrival.jpg?token=AbC%2F123"


@pytest.mark.parametrize("schema", [MovieCreate, MoviePatch])
def test_movie_cover_preserves_the_original_url(
    schema: type[MovieCreate] | type[MoviePatch],
) -> None:
    movie = schema(title="Arrival", status="quero_assistir", movie_cover=COVER_URL)

    assert movie.model_dump()["movie_cover"] == COVER_URL


@pytest.mark.parametrize("schema", [MovieCreate, MoviePatch])
def test_movie_cover_rejects_non_http_urls(
    schema: type[MovieCreate] | type[MoviePatch],
) -> None:
    with pytest.raises(ValidationError, match="movie_cover"):
        schema.model_validate(
            {
                "title": "Arrival",
                "status": "assistido",
                "movie_cover": "ftp://images.example.com/arrival.jpg",
            }
        )


def test_patch_distinguishes_an_omitted_cover_from_null() -> None:
    assert MoviePatch().model_dump(exclude_unset=True) == {}
    assert MoviePatch(movie_cover=None).model_dump(exclude_unset=True) == {
        "movie_cover": None
    }
