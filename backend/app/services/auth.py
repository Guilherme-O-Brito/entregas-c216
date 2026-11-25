from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserRepository


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def register(self, name: str, email: str, password: str) -> User:
        if self.repository.get_by_email(email):
            raise UserAlreadyExistsError
        try:
            return self.repository.create(name, email, hash_password(password))
        except IntegrityError:
            raise UserAlreadyExistsError from None

    def authenticate(self, email: str, password: str) -> User:
        user = self.repository.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError
        return user

    def get_user(self, user_id: int) -> User | None:
        return self.repository.get_by_id(user_id)
