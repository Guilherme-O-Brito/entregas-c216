from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserMovie(Base):
    __tablename__ = "user_movies"
    __table_args__ = (
        CheckConstraint(
            "status IN ('quero_assistir', 'assistido')", name="ck_user_movies_status"
        ),
        CheckConstraint(
            "rating IS NULL OR rating BETWEEN 0 AND 10",
            name="ck_user_movies_rating_range",
        ),
        CheckConstraint(
            "status = 'assistido' OR (rating IS NULL AND review IS NULL)",
            name="ck_user_movies_watchlist_review",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    rating: Mapped[int | None] = mapped_column(SmallInteger)
    review: Mapped[str | None] = mapped_column(Text)
    movie_cover: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="movies")
