from pydantic import BaseModel, ConfigDict, Field, field_validator

class UserCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(min_length=1, max_length=100)
    email: str
    password: str = Field(min_length=8, max_length=32)
    admin: bool

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if len(email) > 254 or email.count("@") != 1:
            raise ValueError("Informe um e-mail válido.")
        local_part, domain = email.rsplit("@", 1)
        if not local_part or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Informe um e-mail válido.")
        return email

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    admin: bool

class UserListResponse(BaseModel):
    users: list[UserResponse]

class UserPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    email: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=32)
    admin: bool | None = Field(default=None)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if value is None:
            return None
        email = value.strip().lower()
        if len(email) > 254 or email.count("@") != 1:
            raise ValueError("Informe um e-mail válido.")
        local_part, domain = email.rsplit("@", 1)
        if not local_part or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("Informe um e-mail válido.")
        return email

class UserDelete(BaseModel):
    message: str