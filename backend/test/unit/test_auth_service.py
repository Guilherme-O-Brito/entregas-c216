import pytest

from app.core.security import verify_password
from app.models.user import User
from app.services.auth import (
    AuthService,
    InvalidCredentialsError,
    UserAlreadyExistsError,
)


class FakeUserRepository:
    def __init__(self):
        self.users: dict[int, User] = {}
        self.next_id = 1

    def create(self, name: str, email: str, password_hash: str) -> User:
        user = User(
            id=self.next_id,
            name=name,
            email=email,
            password_hash=password_hash,
        )
        self.users[user.id] = user
        self.next_id += 1
        return user

    def get_by_id(self, user_id: int) -> User | None:
        return self.users.get(user_id)

    def get_by_email(self, email: str) -> User | None:
        return next((user for user in self.users.values() if user.email == email), None)


@pytest.fixture
def service() -> AuthService:
    return AuthService(FakeUserRepository())


def test_register_hashes_password(service: AuthService) -> None:
    user = service.register("Alice", "alice@example.com", "password123")

    assert user.password_hash != "password123"
    assert verify_password("password123", user.password_hash)


def test_register_rejects_existing_email(service: AuthService) -> None:
    service.register("Alice", "alice@example.com", "password123")

    with pytest.raises(UserAlreadyExistsError):
        service.register("Another Alice", "alice@example.com", "password456")


def test_authenticate_returns_matching_user(service: AuthService) -> None:
    created = service.register("Alice", "alice@example.com", "password123")

    authenticated = service.authenticate("alice@example.com", "password123")

    assert authenticated.id == created.id


@pytest.mark.parametrize(
    ("email", "password"),
    [("missing@example.com", "password123"), ("alice@example.com", "wrongpass")],
)
def test_authenticate_rejects_invalid_credentials(
    service: AuthService, email: str, password: str
) -> None:
    service.register("Alice", "alice@example.com", "password123")

    with pytest.raises(InvalidCredentialsError):
        service.authenticate(email, password)


def test_get_user_returns_none_when_missing(service: AuthService) -> None:
    assert service.get_user(42) is None
