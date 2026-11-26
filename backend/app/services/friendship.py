from sqlalchemy.exc import IntegrityError

from app.models.friendship import Friendship
from app.models.user_movie import UserMovie
from app.repositories.friendship import FriendshipRepository
from app.repositories.movie import MovieRepository
from app.repositories.user import UserRepository
from app.schemas.movies import MovieStatus
from app.services.user import UserNotFoundError


class SelfFriendshipError(Exception):
    pass


class FriendshipAlreadyExistsError(Exception):
    pass


class FriendshipRequestNotFoundError(Exception):
    pass


class FriendNotFoundError(Exception):
    pass


class FriendshipService:
    def __init__(
        self,
        repository: FriendshipRepository,
        users: UserRepository,
        movies: MovieRepository,
    ):
        self.repository = repository
        self.users = users
        self.movies = movies

    def send_request(self, sender_id: int, recipient_id: int) -> Friendship:
        if sender_id == recipient_id:
            raise SelfFriendshipError
        if self.users.get_by_id(recipient_id) is None:
            raise UserNotFoundError

        low_id, high_id = sorted((sender_id, recipient_id))
        try:
            return self.repository.create(low_id, high_id, sender_id)
        except IntegrityError:
            if self.repository.get_by_pair(low_id, high_id) is not None:
                raise FriendshipAlreadyExistsError from None
            if self.users.get_by_id(recipient_id) is None:
                raise UserNotFoundError from None
            raise

    def list_received_requests(self, user_id: int) -> list[dict]:
        return self.repository.get_received_requests(user_id)

    def accept_request(self, user_id: int, request_id: int) -> Friendship:
        friendship = self.repository.accept_received_request(user_id, request_id)
        if friendship is None:
            raise FriendshipRequestNotFoundError
        return friendship

    def remove_request(self, user_id: int, request_id: int) -> None:
        if not self.repository.delete_pending_request(user_id, request_id):
            raise FriendshipRequestNotFoundError

    def list_friends(self, user_id: int) -> list[dict]:
        return self.repository.get_friends(user_id)

    def list_friend_movies(
        self, user_id: int, friend_id: int, status: MovieStatus, skip: int, limit: int
    ) -> list[UserMovie]:
        low_id, high_id = sorted((user_id, friend_id))
        friendship = self.repository.get_by_pair(low_id, high_id)
        if friendship is None or friendship.status != "accepted":
            raise FriendNotFoundError
        return self.movies.get_all_by_status(friend_id, status, skip, limit)
