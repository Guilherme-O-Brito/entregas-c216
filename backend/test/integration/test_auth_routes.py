from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import APP_KEY, JWT_ALGORITHM
from app.core.security import decode_token


def register_user(client: TestClient, **overrides: str) -> dict:
    payload = {
        "name": "Alice",
        "email": "alice@example.com",
        "password": "password123",
    }
    payload.update(overrides)
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    return response.json()


def login_user(client: TestClient) -> dict:
    response = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    return response.json()


def test_register_persists_user_without_returning_password(
    client: TestClient,
) -> None:
    response = client.post(
        "/auth/register",
        json={
            "name": " Alice ",
            "email": " ALICE@EXAMPLE.COM ",
            "password": "password123",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
    }
    assert "password" not in response.json()
    assert "password_hash" not in response.json()


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    register_user(client)

    response = client.post(
        "/auth/register",
        json={
            "name": "Another Alice",
            "email": "ALICE@EXAMPLE.COM",
            "password": "password456",
        },
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"name": " ", "email": "alice@example.com", "password": "password123"},
        {"name": "Alice", "email": "invalid", "password": "password123"},
        {"name": "Alice", "email": "alice@example.com", "password": "short"},
    ],
)
def test_register_rejects_invalid_payload(
    client: TestClient, payload: dict
) -> None:
    assert client.post("/auth/register", json=payload).status_code == 422


def test_login_returns_access_and_refresh_tokens(client: TestClient) -> None:
    register_user(client)

    tokens = login_user(client)
    access_claims = decode_token(tokens["access_token"])
    refresh_claims = decode_token(tokens["refresh_token"])

    assert tokens["token_type"] == "bearer"
    assert access_claims["token_type"] == "access"
    assert refresh_claims["token_type"] == "refresh"
    assert access_claims["sub"] == refresh_claims["sub"]


@pytest.mark.parametrize(
    "credentials",
    [
        {"email": "missing@example.com", "password": "password123"},
        {"email": "alice@example.com", "password": "wrong-password"},
    ],
)
def test_login_rejects_invalid_credentials(
    client: TestClient, credentials: dict
) -> None:
    register_user(client)

    response = client.post("/auth/login", json=credentials)

    assert response.status_code == 401
    assert response.json()["detail"] == "E-mail ou senha inválidos."


def test_me_accepts_access_token(client: TestClient) -> None:
    register_user(client)
    tokens = login_user(client)

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


def test_me_rejects_refresh_token(client: TestClient) -> None:
    register_user(client)
    tokens = login_user(client)

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
    )

    assert response.status_code == 401


def test_refresh_returns_only_a_new_access_token(client: TestClient) -> None:
    register_user(client)
    tokens = login_user(client)

    response = client.post(
        "/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )

    assert response.status_code == 200
    assert set(response.json()) == {"access_token", "token_type"}
    assert response.json()["token_type"] == "bearer"
    assert decode_token(response.json()["access_token"])["token_type"] == "access"


def test_refresh_rejects_access_token(client: TestClient) -> None:
    register_user(client)
    tokens = login_user(client)

    response = client.post(
        "/auth/refresh", json={"refresh_token": tokens["access_token"]}
    )

    assert response.status_code == 401


def test_refresh_rejects_expired_refresh_token(client: TestClient) -> None:
    expired_token = jwt.encode(
        {
            "sub": "1",
            "token_type": "refresh",
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        APP_KEY,
        algorithm=JWT_ALGORITHM,
    )

    response = client.post(
        "/auth/refresh", json={"refresh_token": expired_token}
    )

    assert response.status_code == 401
