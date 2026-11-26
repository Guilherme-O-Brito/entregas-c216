from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MovieStatus = Literal["quero_assistir", "assistido"]


class MovieCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    status: MovieStatus
    rating: int | None = Field(default=None, ge=0, le=10)
    review: str | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        title = value.strip()
        if not title:
            raise ValueError("O título é obrigatório.")
        return title

    @model_validator(mode="after")
    def validate_watchlist_fields(self):
        if self.status == "quero_assistir" and (
            self.rating is not None or self.review is not None
        ):
            raise ValueError(
                "Filmes em 'quero_assistir' não podem ter nota ou review."
            )
        return self


class MoviePatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    status: MovieStatus | None = None
    rating: int | None = Field(default=None, ge=0, le=10)
    review: str | None = None

    @field_validator("title", "status", mode="before")
    @classmethod
    def reject_null_required_fields(cls, value):
        if value is None:
            raise ValueError("O campo não pode ser nulo.")
        return value

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        title = value.strip()
        if not title:
            raise ValueError("O título é obrigatório.")
        return title


class MovieResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    status: MovieStatus
    rating: int | None
    review: str | None


class MovieSummary(BaseModel):
    id: int
    title: str


class MovieListResponse(BaseModel):
    movies: list[MovieSummary]


class MovieDetailsListResponse(BaseModel):
    movies: list[MovieResponse]
