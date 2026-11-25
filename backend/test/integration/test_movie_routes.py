from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models import User, UserMovie  # noqa: F401


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    testing_session_local = sessionmaker(bind=engine, autoflush=False)

    def override_get_db() -> Iterator[Session]:
        with testing_session_local() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def register_user(
    client: TestClient,
    *,
    name: str = "Alice",
    email: str = "alice@example.com",
) -> None:
    response = client.post(
        "/auth/register",
        json={"name": name, "email": email, "password": "password123"},
    )
    assert response.status_code == 201


def authorization_header(
    client: TestClient,
    *,
    email: str = "alice@example.com",
) -> dict[str, str]:
    response = client.post(
        "/auth/login", json={"email": email, "password": "password123"}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_movie(
    client: TestClient,
    headers: dict[str, str],
    payload: dict | None = None,
) -> dict:
    response = client.post(
        "/movies/",
        headers=headers,
        json=payload or {"title": "Arrival", "status": "assistido"},
    )
    assert response.status_code == 201
    return response.json()


def test_create_movie_returns_all_movie_data(client: TestClient) -> None:
    register_user(client)
    headers = authorization_header(client)

    response = client.post(
        "/movies/",
        headers=headers,
        json={
            "title": " Arrival ",
            "status": "assistido",
            "rating": 9,
            "review": "Ótimo filme",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "user_id": 1,
        "title": "Arrival",
        "status": "assistido",
        "rating": 9,
        "review": "Ótimo filme",
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "", "status": "assistido"},
        {"title": "   ", "status": "assistido"},
        {"title": "x" * 256, "status": "assistido"},
        {"title": "Arrival"},
        {"title": "Arrival", "status": "invalid"},
        {"title": "Arrival", "status": "assistido", "rating": -1},
        {"title": "Arrival", "status": "assistido", "rating": 11},
        {"title": "Arrival", "status": "quero_assistir", "rating": 8},
        {
            "title": "Arrival",
            "status": "quero_assistir",
            "review": "Ainda não assisti",
        },
    ],
)
def test_create_movie_rejects_invalid_payload(
    client: TestClient, payload: dict
) -> None:
    register_user(client)

    response = client.post(
        "/movies/", headers=authorization_header(client), json=payload
    )

    assert response.status_code == 422


def test_create_movie_requires_login(client: TestClient) -> None:
    response = client.post(
        "/movies/", json={"title": "Arrival", "status": "assistido"}
    )

    assert response.status_code == 401


def test_get_movie_returns_all_fields_for_owner(client: TestClient) -> None:
    register_user(client)
    headers = authorization_header(client)
    created = create_movie(
        client,
        headers,
        {
            "title": "Arrival",
            "status": "assistido",
            "rating": 9,
            "review": "Ótimo filme",
        },
    )

    response = client.get(f"/movies/{created['id']}", headers=headers)

    assert response.status_code == 200
    assert response.json() == created


def test_get_movie_requires_login(client: TestClient) -> None:
    response = client.get("/movies/1")

    assert response.status_code == 401


def test_get_movie_returns_404_for_missing_movie(client: TestClient) -> None:
    register_user(client)

    response = client.get("/movies/1", headers=authorization_header(client))

    assert response.status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {"title": ""},
        {"title": "   "},
        {"title": "x" * 256},
        {"title": None},
        {"status": None},
        {"status": "invalid"},
        {"rating": -1},
        {"rating": 11},
    ],
)
def test_patch_movie_rejects_invalid_payload(
    client: TestClient, payload: dict
) -> None:
    register_user(client)
    headers = authorization_header(client)
    movie = create_movie(client, headers)

    response = client.patch(
        f"/movies/{movie['id']}", headers=headers, json=payload
    )

    assert response.status_code == 422


def test_patch_movie_changes_only_sent_fields(client: TestClient) -> None:
    register_user(client)
    headers = authorization_header(client)
    movie = create_movie(
        client,
        headers,
        {
            "title": "Arrival",
            "status": "assistido",
            "rating": 9,
            "review": "Ótimo filme",
        },
    )

    response = client.patch(
        f"/movies/{movie['id']}", headers=headers, json={"title": "A Chegada"}
    )

    assert response.status_code == 200
    assert response.json() == {
        **movie,
        "title": "A Chegada",
    }


def test_patch_movie_can_clear_optional_fields(client: TestClient) -> None:
    register_user(client)
    headers = authorization_header(client)
    movie = create_movie(
        client,
        headers,
        {
            "title": "Arrival",
            "status": "assistido",
            "rating": 9,
            "review": "Ótimo filme",
        },
    )

    response = client.patch(
        f"/movies/{movie['id']}",
        headers=headers,
        json={"rating": None, "review": None},
    )

    assert response.status_code == 200
    assert response.json()["rating"] is None
    assert response.json()["review"] is None


def test_patch_movie_rejects_inconsistent_watchlist_status(
    client: TestClient,
) -> None:
    register_user(client)
    headers = authorization_header(client)
    movie = create_movie(
        client,
        headers,
        {"title": "Arrival", "status": "assistido", "rating": 9},
    )

    response = client.patch(
        f"/movies/{movie['id']}",
        headers=headers,
        json={"status": "quero_assistir"},
    )

    assert response.status_code == 422


def test_patch_movie_requires_login(client: TestClient) -> None:
    response = client.patch("/movies/1", json={"title": "Updated"})

    assert response.status_code == 401


def test_patch_movie_returns_404_for_missing_movie(client: TestClient) -> None:
    register_user(client)

    response = client.patch(
        "/movies/1",
        headers=authorization_header(client),
        json={"title": "Updated"},
    )

    assert response.status_code == 404


def test_index_returns_only_owner_movies_and_only_summary_fields(
    client: TestClient,
) -> None:
    register_user(client)
    owner_headers = authorization_header(client)
    create_movie(client, owner_headers)
    create_movie(client, owner_headers, {"title": "Alien", "status": "assistido"})
    register_user(client, name="Bob", email="bob@example.com")
    other_headers = authorization_header(client, email="bob@example.com")

    response = client.get("/movies/", headers=owner_headers)
    other_response = client.get("/movies/", headers=other_headers)

    assert response.status_code == 200
    assert response.json() == {
        "movies": [{"id": 1, "title": "Arrival"}, {"id": 2, "title": "Alien"}]
    }
    assert other_response.json() == {"movies": []}


def test_index_supports_ten_item_pages(client: TestClient) -> None:
    register_user(client)
    headers = authorization_header(client)
    for index in range(12):
        create_movie(
            client,
            headers,
            {"title": f"Movie {index + 1}", "status": "assistido"},
        )

    first_page = client.get("/movies/", headers=headers)
    second_page = client.get("/movies/?skip=10", headers=headers)

    assert len(first_page.json()["movies"]) == 10
    assert len(second_page.json()["movies"]) == 2
    assert second_page.json()["movies"][0] == {"id": 11, "title": "Movie 11"}


@pytest.mark.parametrize("query", ["skip=-1", "limit=0", "limit=11"])
def test_index_rejects_invalid_pagination(client: TestClient, query: str) -> None:
    register_user(client)

    response = client.get(f"/movies/?{query}", headers=authorization_header(client))

    assert response.status_code == 422


def test_index_requires_login(client: TestClient) -> None:
    assert client.get("/movies/").status_code == 401


def test_delete_physically_removes_movie(client: TestClient) -> None:
    register_user(client)
    headers = authorization_header(client)
    movie = create_movie(client, headers)

    response = client.delete(f"/movies/{movie['id']}", headers=headers)

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/movies/{movie['id']}", headers=headers).status_code == 404


def test_delete_requires_login(client: TestClient) -> None:
    response = client.delete("/movies/1")

    assert response.status_code == 401


def test_delete_returns_404_for_missing_movie(client: TestClient) -> None:
    register_user(client)

    response = client.delete("/movies/1", headers=authorization_header(client))

    assert response.status_code == 404


def test_another_user_cannot_read_update_or_delete_movie(
    client: TestClient,
) -> None:
    register_user(client)
    owner_headers = authorization_header(client)
    movie = create_movie(client, owner_headers)
    register_user(client, name="Bob", email="bob@example.com")
    other_headers = authorization_header(client, email="bob@example.com")

    read_response = client.get(f"/movies/{movie['id']}", headers=other_headers)
    update_response = client.patch(
        f"/movies/{movie['id']}",
        headers=other_headers,
        json={"title": "Stolen"},
    )
    delete_response = client.delete(
        f"/movies/{movie['id']}", headers=other_headers
    )

    assert read_response.status_code == 404
    assert update_response.status_code == 404
    assert delete_response.status_code == 404
    assert client.get(f"/movies/{movie['id']}", headers=owner_headers).json() == movie
