import pytest

from app.services.user import UserService


class FakeUserRepository:
    def __init__(self):
        self.users = [{"id": 2, "name": "Ana"}]
        self.calls: list[tuple[str | None, int, int]] = []

    def get_all(self, name: str | None, skip: int, limit: int) -> list[dict]:
        self.calls.append((name, skip, limit))
        return self.users


@pytest.fixture
def repository() -> FakeUserRepository:
    return FakeUserRepository()


@pytest.mark.parametrize(("name", "skip", "limit"), [(None, 0, 10), ("aNA", 10, 2)])
def test_list_users_passes_filter_and_pagination_to_repository(
    repository: FakeUserRepository, name: str | None, skip: int, limit: int
) -> None:
    service = UserService(repository)

    assert service.list(name, skip, limit) == repository.users
    assert repository.calls == [(name, skip, limit)]
