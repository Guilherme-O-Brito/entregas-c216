import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_index_users(client):
    response = client.get("/users/")

    assert response.status_code == 200
    assert response.json() == {"users": []}


def test_get_user(client):
    response = client.get("/users/1")

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Guilherme",
        "email": "guilherme@email.com",
        "admin": True,
    }


@pytest.mark.parametrize("user_id", [0, 2, 10])
def test_get_user_not_found(client, user_id):
    response = client.get(f"/users/{user_id}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Usuario n\u00e3o encontrado."}


def test_create_user(client):
    response = client.post(
        "/users/",
        json={
            "name": "Maria",
            "email": " MARIA@EMAIL.COM ",
            "password": "12345678",
            "admin": False,
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "name": "Maria",
        "email": "maria@email.com",
        "admin": False,
    }


def test_update_user(client):
    response = client.put(
        "/users/1",
        json={
            "name": "Maria",
            "email": "maria@email.com",
            "password": "12345678",
            "admin": False,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Maria",
        "email": "maria@email.com",
        "admin": False,
    }


def test_update_user_not_found(client):
    response = client.put(
        "/users/2",
        json={
            "name": "Maria",
            "email": "maria@email.com",
            "password": "12345678",
            "admin": False,
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Usuario n\u00e3o encontrado."}


def test_patch_user(client):
    response = client.patch(
        "/users/1",
        json={
            "name": "Maria",
            "email": "maria@email.com",
            "password": "12345678",
            "admin": False,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Maria",
        "email": "maria@email.com",
        "admin": False,
    }


def test_patch_user_without_changes(client):
    response = client.patch("/users/1", json={})

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Guilherme",
        "email": "guilherme@email.com",
        "admin": True,
    }


def test_patch_user_not_found(client):
    response = client.patch("/users/2", json={"name": "Maria"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Usuario n\u00e3o encontrado."}


def test_delete_user(client):
    response = client.delete("/users/1")

    assert response.status_code == 200
    assert response.json() == {"message": "Usuario deletado."}


def test_delete_user_not_found(client):
    response = client.delete("/users/2")

    assert response.status_code == 404
    assert response.json() == {"detail": "Usuario n\u00e3o encontrado."}


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "email": "user@email.com", "password": "12345678", "admin": False},
        {"name": "User", "email": "invalid", "password": "12345678", "admin": False},
        {"name": "User", "email": "user@email", "password": "12345678", "admin": False},
        {
            "name": "User",
            "email": "user@email.com",
            "password": "1234567",
            "admin": False,
        },
    ],
)
def test_create_user_invalid_payload(client, payload):
    response = client.post("/users/", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "",},
        {"email": "invalid"},
        {"password": "1234567"},
    ],
)
def test_patch_user_invalid_payload(client, payload):
    response = client.patch("/users/1", json=payload)

    assert response.status_code == 422
