from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.database.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import (
    AccessTokenResponse,
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth import (
    AuthService,
    InvalidCredentialsError,
    UserAlreadyExistsError,
)

auth_router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(db: Annotated[Session, Depends(get_db)]) -> AuthService:
    return AuthService(UserRepository(db))


ServiceDep = Annotated[AuthService, Depends(get_auth_service)]
CredentialsDep = Annotated[
    HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
]


def get_current_user(
    credentials: CredentialsDep,
    service: ServiceDep,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de acesso inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("token_type") != "access":
            raise unauthorized
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise unauthorized from None
    user = service.get_user(user_id)
    if user is None:
        raise unauthorized
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


@auth_router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register_user(payload: UserCreate, service: ServiceDep):
    try:
        return service.register(**payload.model_dump())
    except UserAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário com esse e-mail.",
        ) from None


@auth_router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, service: ServiceDep):
    try:
        user = service.authenticate(payload.email, payload.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
    }


@auth_router.post("/refresh", response_model=AccessTokenResponse)
def refresh_access_token(payload: RefreshRequest, service: ServiceDep):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = decode_token(payload.refresh_token)
        if claims.get("token_type") != "refresh":
            raise unauthorized
        user_id = int(claims["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise unauthorized from None
    if service.get_user(user_id) is None:
        raise unauthorized
    return {"access_token": create_access_token(user_id)}


@auth_router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: CurrentUserDep):
    return user
