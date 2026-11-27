from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, name: str, email: str, password_hash: str) -> User:
        user = User(name=name, email=email, password_hash=password_hash)
        self.db.add(user)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def get_all(self, name: str | None, skip: int, limit: int) -> list[dict]:
        statement = select(User.id, User.name)
        if name is not None:
            statement = statement.where(User.name.icontains(name, autoescape=True))
        statement = statement.order_by(User.id).offset(skip).limit(limit)
        return [dict(row) for row in self.db.execute(statement).mappings()]
