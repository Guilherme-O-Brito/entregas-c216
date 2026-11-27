from app.repositories.user import UserRepository


class UserNotFoundError(Exception):
    pass


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def list(self, name: str | None, skip: int, limit: int) -> list[dict]:
        return self.repository.get_all(name, skip, limit)
