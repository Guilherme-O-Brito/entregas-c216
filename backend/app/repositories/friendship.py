from sqlalchemy import case, delete, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.friendship import Friendship
from app.models.user import User


def _includes_user(user_id: int):
    return or_(Friendship.user_low_id == user_id, Friendship.user_high_id == user_id)


class FriendshipRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self, user_low_id: int, user_high_id: int, requested_by_id: int
    ) -> Friendship:
        friendship = Friendship(
            user_low_id=user_low_id,
            user_high_id=user_high_id,
            requested_by_id=requested_by_id,
        )
        self.db.add(friendship)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise
        self.db.refresh(friendship)
        return friendship

    def get_by_pair(self, user_low_id: int, user_high_id: int) -> Friendship | None:
        statement = select(Friendship).where(
            Friendship.user_low_id == user_low_id,
            Friendship.user_high_id == user_high_id,
        )
        return self.db.scalar(statement)

    def get_received_requests(self, user_id: int) -> list[dict]:
        statement = (
            select(
                Friendship.id,
                Friendship.requested_by_id,
                User.name.label("requested_by_name"),
            )
            .join(User, User.id == Friendship.requested_by_id)
            .where(
                _includes_user(user_id),
                Friendship.requested_by_id != user_id,
                Friendship.status == "pending",
            )
            .order_by(Friendship.id)
        )
        return [dict(row) for row in self.db.execute(statement).mappings()]

    def accept_received_request(
        self, user_id: int, request_id: int
    ) -> Friendship | None:
        statement = (
            update(Friendship)
            .where(
                Friendship.id == request_id,
                _includes_user(user_id),
                Friendship.requested_by_id != user_id,
                Friendship.status == "pending",
            )
            .values(status="accepted")
            .returning(Friendship)
        )
        friendship = self.db.scalar(statement)
        if friendship is not None:
            self.db.commit()
        return friendship

    def delete_pending_request(self, user_id: int, request_id: int) -> bool:
        statement = (
            delete(Friendship)
            .where(
                Friendship.id == request_id,
                _includes_user(user_id),
                Friendship.status == "pending",
            )
            .returning(Friendship.id)
        )
        deleted_id = self.db.scalar(statement)
        if deleted_id is not None:
            self.db.commit()
        return deleted_id is not None

    def get_friends(self, user_id: int) -> list[dict]:
        friend_id = case(
            (Friendship.user_low_id == user_id, Friendship.user_high_id),
            else_=Friendship.user_low_id,
        )
        statement = (
            select(User.id, User.name)
            .join(Friendship, User.id == friend_id)
            .where(_includes_user(user_id), Friendship.status == "accepted")
            .order_by(User.id)
        )
        return [dict(row) for row in self.db.execute(statement).mappings()]

    def delete_accepted_friendship(self, user_low_id: int, user_high_id: int) -> bool:
        statement = (
            delete(Friendship)
            .where(
                Friendship.user_low_id == user_low_id,
                Friendship.user_high_id == user_high_id,
                Friendship.status == "accepted",
            )
            .returning(Friendship.id)
        )
        deleted_id = self.db.scalar(statement)
        if deleted_id is not None:
            self.db.commit()
        return deleted_id is not None
