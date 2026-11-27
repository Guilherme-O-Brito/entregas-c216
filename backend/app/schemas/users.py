from pydantic import BaseModel


class UserSummary(BaseModel):
    id: int
    name: str


class UserListResponse(BaseModel):
    users: list[UserSummary]
