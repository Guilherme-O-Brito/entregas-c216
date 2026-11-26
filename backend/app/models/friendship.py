from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint(
            "user_low_id", "user_high_id", name="uq_friendships_user_pair"
        ),
        CheckConstraint(
            "user_low_id < user_high_id", name="ck_friendships_user_order"
        ),
        CheckConstraint(
            "requested_by_id IN (user_low_id, user_high_id)",
            name="ck_friendships_requester",
        ),
        CheckConstraint(
            "status IN ('pending', 'accepted')", name="ck_friendships_status"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_low_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    user_high_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    requested_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(8), nullable=False, server_default="pending"
    )
