from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.users import UserSummary


class FriendshipCreate(BaseModel):
    user_id: int = Field(gt=0)


class FriendshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_low_id: int
    user_high_id: int
    requested_by_id: int
    status: Literal["pending", "accepted"]


class ReceivedFriendshipRequest(BaseModel):
    id: int
    requested_by_id: int
    requested_by_name: str


class ReceivedFriendshipRequestList(BaseModel):
    requests: list[ReceivedFriendshipRequest]


class FriendListResponse(BaseModel):
    friends: list[UserSummary]
