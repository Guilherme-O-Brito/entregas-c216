from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, name: str, email: str, password: str, admin: bool) -> User:
        user = User(name=name, email=email, password=password, admin=admin)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def get_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        statement = select(User).order_by(User.id).offset(skip).limit(limit)
        return list(self.db.scalars(statement))

    def update(self, user: User, changes: dict) -> User:
        for field, value in changes.items():
            setattr(user, field, value)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()
