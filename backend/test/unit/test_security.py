from datetime import UTC, datetime

from jose import jwt

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    APP_KEY,
    JWT_ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_verifies_password_without_storing_plaintext() -> None:
    hashed_password = hash_password("password123")

    assert hashed_password != "password123"
    assert verify_password("password123", hashed_password)
    assert not verify_password("wrong-password", hashed_password)


def test_access_token_has_access_type_and_one_hour_expiration() -> None:
    issued_at = datetime.now(UTC)
    claims = decode_token(create_access_token(12))
    expires_at = datetime.fromtimestamp(claims["exp"], UTC)

    assert claims["sub"] == "12"
    assert claims["token_type"] == "access"
    token_lifetime = (expires_at - issued_at).total_seconds()
    assert 0 < token_lifetime <= ACCESS_TOKEN_EXPIRE_MINUTES * 60


def test_refresh_token_has_refresh_type_and_one_week_expiration() -> None:
    issued_at = datetime.now(UTC)
    claims = decode_token(create_refresh_token(12))
    expires_at = datetime.fromtimestamp(claims["exp"], UTC)

    assert claims["sub"] == "12"
    assert claims["token_type"] == "refresh"
    token_lifetime = (expires_at - issued_at).total_seconds()
    assert 0 < token_lifetime <= REFRESH_TOKEN_EXPIRE_DAYS * 86400


def test_decode_token_rejects_a_different_signing_key() -> None:
    token = jwt.encode(
        {"sub": "12", "token_type": "access"},
        f"{APP_KEY}-wrong",
        algorithm=JWT_ALGORITHM,
    )

    try:
        decode_token(token)
    except Exception as error:
        assert error.__class__.__name__ == "JWTError"
    else:
        raise AssertionError("Token assinado com outra chave deveria ser rejeitado.")
