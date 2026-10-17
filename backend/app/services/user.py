from app.models.user import User
from app.repositories.user import UserRepository


class UserNotFoundError(Exception):
    pass


class UserAlreadyExistsError(Exception):
    pass


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def create(self, data: dict) -> User:
        if self.repository.get_by_email(data["email"]):
            raise UserAlreadyExistsError
        return self.repository.create(**data)

    def list(self, skip: int = 0, limit: int = 100) -> list[User]:
        return self.repository.get_all(skip, limit)

    def get(self, user_id: int) -> User:
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError
        return user

    def update(self, user_id: int, changes: dict) -> User:
        user = self.get(user_id)
        email = changes.get("email")
        if email and email != user.email and self.repository.get_by_email(email):
            raise UserAlreadyExistsError
        return self.repository.update(user, changes)

    def delete(self, user_id: int) -> None:
        user = self.get(user_id)
        self.repository.delete(user)
