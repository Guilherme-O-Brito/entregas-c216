import pytest
from sqlalchemy.exc import IntegrityError

from app.models.friendship import Friendship
from app.models.user import User
from app.models.user_movie import UserMovie
from app.schemas.movies import MovieStatus
from app.services.friendship import (
    FriendNotFoundError,
    FriendshipAlreadyExistsError,
    FriendshipRequestNotFoundError,
    FriendshipService,
    SelfFriendshipError,
)
from app.services.user import UserNotFoundError


class FakeFriendshipRepository:
    def __init__(self):
        self.friendship: Friendship | None = None
        self.accept_result: Friendship | None = None
        self.delete_result = False
        self.requests = [{"id": 4, "requested_by_id": 1, "requested_by_name": "Alice"}]
        self.friends = [{"id": 1, "name": "Alice"}]

    def create(
        self, user_low_id: int, user_high_id: int, requested_by_id: int
    ) -> Friendship:
        if self.friendship is not None:
            raise IntegrityError(None, None, ValueError("Duplicate pair"))
        self.friendship = Friendship(
            id=1,
            user_low_id=user_low_id,
            user_high_id=user_high_id,
            requested_by_id=requested_by_id,
            status="pending",
        )
        return self.friendship

    def get_by_pair(self, user_low_id: int, user_high_id: int) -> Friendship | None:
        friendship = self.friendship
        if (
            friendship is not None
            and friendship.user_low_id == user_low_id
            and friendship.user_high_id == user_high_id
        ):
            return friendship
        return None

    def accept_received_request(
        self, user_id: int, request_id: int
    ) -> Friendship | None:
        self.accept_request_call = (user_id, request_id)
        return self.accept_result

    def delete_pending_request(self, user_id: int, request_id: int) -> bool:
        self.delete_request_call = (user_id, request_id)
        return self.delete_result

    def get_received_requests(self, user_id: int) -> list[dict]:
        self.received_requests_user_id = user_id
        return self.requests

    def get_friends(self, user_id: int) -> list[dict]:
        self.friends_user_id = user_id
        return self.friends


class FakeUserRepository:
    def get_by_id(self, user_id: int) -> User | None:
        if user_id in (1, 2):
            return User(id=user_id)
        return None


class FakeMovieRepository:
    def __init__(self):
        self.calls: list[tuple[int, str, int, int]] = []
        self.movies = [UserMovie(id=10, user_id=1, title="Alien", status="assistido")]

    def get_all_by_status(
        self, user_id: int, status: str, skip: int, limit: int
    ) -> list[UserMovie]:
        self.calls.append((user_id, status, skip, limit))
        return self.movies


@pytest.fixture
def repository() -> FakeFriendshipRepository:
    return FakeFriendshipRepository()


@pytest.fixture
def movies() -> FakeMovieRepository:
    return FakeMovieRepository()


@pytest.fixture
def service(
    repository: FakeFriendshipRepository, movies: FakeMovieRepository
) -> FriendshipService:
    return FriendshipService(repository, FakeUserRepository(), movies)


def test_send_request_orders_pair_and_preserves_sender(
    service: FriendshipService,
) -> None:
    request = service.send_request(2, 1)

    assert (request.user_low_id, request.user_high_id, request.requested_by_id) == (
        1,
        2,
        2,
    )
    assert request.status == "pending"


def test_send_request_rejects_sender_as_recipient(service: FriendshipService) -> None:
    with pytest.raises(SelfFriendshipError):
        service.send_request(1, 1)


def test_send_request_rejects_missing_recipient(service: FriendshipService) -> None:
    with pytest.raises(UserNotFoundError):
        service.send_request(1, 99)


def test_send_request_maps_duplicate_pair_to_conflict(
    service: FriendshipService,
) -> None:
    service.send_request(1, 2)

    with pytest.raises(FriendshipAlreadyExistsError):
        service.send_request(2, 1)


def test_accept_request_returns_updated_friendship(
    service: FriendshipService, repository: FakeFriendshipRepository
) -> None:
    repository.accept_result = Friendship(id=4, status="accepted")

    assert service.accept_request(2, 4) is repository.accept_result
    assert repository.accept_request_call == (2, 4)


def test_accept_request_rejects_inaccessible_request(
    service: FriendshipService,
) -> None:
    with pytest.raises(FriendshipRequestNotFoundError):
        service.accept_request(2, 99)


def test_remove_request_passes_request_and_actor_to_repository(
    service: FriendshipService, repository: FakeFriendshipRepository
) -> None:
    repository.delete_result = True

    service.remove_request(1, 4)

    assert repository.delete_request_call == (1, 4)


def test_remove_request_rejects_inaccessible_request(
    service: FriendshipService,
) -> None:
    with pytest.raises(FriendshipRequestNotFoundError):
        service.remove_request(1, 99)


def test_list_received_requests_uses_current_user(
    service: FriendshipService, repository: FakeFriendshipRepository
) -> None:
    assert service.list_received_requests(2) == repository.requests
    assert repository.received_requests_user_id == 2


def test_list_friends_uses_current_user(
    service: FriendshipService, repository: FakeFriendshipRepository
) -> None:
    assert service.list_friends(2) == repository.friends
    assert repository.friends_user_id == 2


@pytest.mark.parametrize("pending", [False, True], ids=["missing", "pending"])
def test_list_friend_movies_denies_access_without_acceptance(
    service: FriendshipService, movies: FakeMovieRepository, pending: bool
) -> None:
    if pending:
        service.send_request(1, 2)

    with pytest.raises(FriendNotFoundError):
        service.list_friend_movies(2, 1, "assistido", 0, 10)

    assert movies.calls == []


@pytest.mark.parametrize("status", ["assistido", "quero_assistir"])
def test_list_friend_movies_passes_friend_status_and_pagination(
    service: FriendshipService, movies: FakeMovieRepository, status: MovieStatus
) -> None:
    request = service.send_request(1, 2)
    request.status = "accepted"

    assert service.list_friend_movies(2, 1, status, 10, 5) == movies.movies
    assert movies.calls == [(1, status, 10, 5)]
