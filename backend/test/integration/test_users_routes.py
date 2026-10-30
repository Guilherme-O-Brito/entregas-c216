from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.user import User  # noqa: F401


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False)

    def override_get_db() -> Iterator[Session]:
        with TestingSessionLocal() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def create_user(
    client: TestClient,
    *,
    name: str = "Alice",
    email: str = "alice@example.com",
    password: str = "password123",
    admin: bool = False,
) -> dict:
    response = client.post(
        "/users/",
        json={
            "name": name,
            "email": email,
            "password": password,
            "admin": admin,
        },
    )
    assert response.status_code == 201
    return response.json()


def public_user(user_id: int, name: str, email: str, admin: bool) -> dict:
    return {"id": user_id, "name": name, "email": email, "admin": admin}


def test_list_users_starts_empty(client: TestClient) -> None:
    response = client.get("/users/")

    assert response.status_code == 200
    assert response.json() == {"users": []}


def test_create_user_normalizes_email_and_persists_without_returning_password(
    client: TestClient,
) -> None:
    response = client.post(
        "/users/",
        json={
            "name": "Maria",
            "email": " MARIA@EMAIL.COM ",
            "password": "password123",
            "admin": False,
        },
    )

    expected = public_user(1, "Maria", "maria@email.com", False)
    assert response.status_code == 201
    assert response.json() == expected
    assert client.get("/users/").json() == {"users": [expected]}


def test_get_user_returns_persisted_user(client: TestClient) -> None:
    created = create_user(client, admin=True)

    response = client.get(f"/users/{created['id']}")

    assert response.status_code == 200
    assert response.json() == public_user(
        created["id"], "Alice", "alice@example.com", True
    )


@pytest.mark.parametrize("user_id", [0, 1, 42])
def test_get_user_returns_404_when_missing(client: TestClient, user_id: int) -> None:
    response = client.get(f"/users/{user_id}")

    assert response.status_code == 404
    assert response.json()["detail"]


def test_create_user_rejects_duplicate_email_case_insensitively(
    client: TestClient,
) -> None:
    create_user(client, email="alice@example.com")

    response = client.post(
        "/users/",
        json={
            "name": "Another Alice",
            "email": "ALICE@EXAMPLE.COM",
            "password": "password123",
            "admin": False,
        },
    )

    assert response.status_code == 409


def test_put_replaces_existing_user(client: TestClient) -> None:
    created = create_user(client)
    response = client.put(
        f"/users/{created['id']}",
        json={
            "name": "Maria",
            "email": "maria@example.com",
            "password": "newpassword123",
            "admin": True,
        },
    )

    assert response.status_code == 200
    assert response.json() == public_user(
        created["id"], "Maria", "maria@example.com", True
    )


def test_put_returns_404_when_user_is_missing(client: TestClient) -> None:
    response = client.put(
        "/users/1",
        json={
            "name": "Maria",
            "email": "maria@example.com",
            "password": "password123",
            "admin": False,
        },
    )

    assert response.status_code == 404


def test_put_rejects_an_email_used_by_another_user(client: TestClient) -> None:
    first = create_user(client, email="first@example.com")
    create_user(client, email="second@example.com")

    response = client.put(
        f"/users/{first['id']}",
        json={
            "name": "Alice",
            "email": "second@example.com",
            "password": "password123",
            "admin": False,
        },
    )

    assert response.status_code == 409


def test_patch_changes_only_submitted_fields_and_accepts_false(client: TestClient) -> None:
    created = create_user(client, admin=True)

    response = client.patch(
        f"/users/{created['id']}",
        json={"name": "Updated Alice", "admin": False},
    )

    assert response.status_code == 200
    assert response.json() == public_user(
        created["id"], "Updated Alice", "alice@example.com", False
    )


def test_patch_with_empty_payload_leaves_user_unchanged(client: TestClient) -> None:
    created = create_user(client, admin=True)

    response = client.patch(f"/users/{created['id']}", json={})

    assert response.status_code == 200
    assert response.json() == public_user(
        created["id"], "Alice", "alice@example.com", True
    )


def test_patch_returns_404_when_user_is_missing(client: TestClient) -> None:
    response = client.patch("/users/42", json={"name": "Maria"})

    assert response.status_code == 404


def test_patch_rejects_an_email_used_by_another_user(client: TestClient) -> None:
    first = create_user(client, email="first@example.com")
    create_user(client, email="second@example.com")

    response = client.patch(
        f"/users/{first['id']}", json={"email": "second@example.com"}
    )

    assert response.status_code == 409


def test_delete_removes_user(client: TestClient) -> None:
    created = create_user(client)

    response = client.delete(f"/users/{created['id']}")

    assert response.status_code == 200
    assert response.json() == {"message": "Usuario deletado."}
    assert client.get(f"/users/{created['id']}").status_code == 404


def test_delete_returns_404_when_user_is_missing(client: TestClient) -> None:
    response = client.delete("/users/42")

    assert response.status_code == 404


def test_list_users_supports_pagination(client: TestClient) -> None:
    create_user(client, name="First", email="first@example.com")
    second = create_user(client, name="Second", email="second@example.com")
    create_user(client, name="Third", email="third@example.com")

    response = client.get("/users/?skip=1&limit=1")

    assert response.status_code == 200
    assert response.json() == {
        "users": [
            public_user(second["id"], "Second", "second@example.com", False)
        ]
    }


@pytest.mark.parametrize(
    "payload",
    [
        {
            "name": "",
            "email": "user@example.com",
            "password": "password123",
            "admin": False,
        },
        {
            "name": "x" * 101,
            "email": "user@example.com",
            "password": "password123",
            "admin": False,
        },
        {
            "name": "User",
            "email": "invalid",
            "password": "password123",
            "admin": False,
        },
        {
            "name": "User",
            "email": "user@example",
            "password": "password123",
            "admin": False,
        },
        {
            "name": "User",
            "email": "user@example.com",
            "password": "short",
            "admin": False,
        },
        {
            "name": "User",
            "email": "user@example.com",
            "password": "p" * 33,
            "admin": False,
        },
        {"name": "User", "email": "user@example.com", "password": "password123"},
    ],
)
def test_create_user_rejects_invalid_payload(client: TestClient, payload: dict) -> None:
    response = client.post("/users/", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {"name": ""},
        {"name": "x" * 101},
        {"email": "invalid"},
        {"email": "user@example"},
        {"password": "short"},
        {"password": "p" * 33},
    ],
)
def test_patch_user_rejects_invalid_payload(client: TestClient, payload: dict) -> None:
    created = create_user(client)

    response = client.patch(f"/users/{created['id']}", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize("query", ["skip=-1", "limit=0"])
def test_list_users_rejects_invalid_pagination(client: TestClient, query: str) -> None:
    response = client.get(f"/users/?{query}")

    assert response.status_code == 422
