from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def headers(
    register_account: Callable[[str, str], dict],
    login_account: Callable[[str], dict],
) -> dict[str, str]:
    email = "alice@example.com"
    register_account("Alice", email)
    token = login_account(email)["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_index_users_returns_only_id_and_name_across_pages(
    client: TestClient,
    headers: dict[str, str],
    register_account: Callable[[str, str], dict],
) -> None:
    expected = [{"id": 1, "name": "Alice"}]
    for index in range(11):
        user = register_account(f"User {index}", f"user{index}@example.com")
        expected.append({"id": user["id"], "name": user["name"]})

    first = client.get("/users/", headers=headers)
    second = client.get("/users/?skip=10", headers=headers)
    limited = client.get("/users/?skip=1&limit=2", headers=headers)
    empty = client.get("/users/?skip=12", headers=headers)

    assert first.status_code == second.status_code == limited.status_code == 200
    assert empty.status_code == 200
    assert first.json() == {"users": expected[:10]}
    assert second.json() == {"users": expected[10:]}
    assert limited.json() == {"users": expected[1:3]}
    assert empty.json() == {"users": []}


def test_index_users_filters_by_partial_name_before_pagination(
    client: TestClient,
    headers: dict[str, str],
    register_account: Callable[[str, str], dict],
) -> None:
    ana = register_account("Ana", "ana@example.com")
    mariana = register_account("Mariana", "mariana@example.com")
    register_account("Bob", "bob@example.com")

    matches = client.get("/users/?name=aNA", headers=headers)
    page = client.get("/users/?name=aNA&skip=1&limit=1", headers=headers)
    empty = client.get("/users/?name=unknown", headers=headers)

    assert matches.status_code == page.status_code == empty.status_code == 200
    assert matches.json() == {
        "users": [
            {"id": ana["id"], "name": "Ana"},
            {"id": mariana["id"], "name": "Mariana"},
        ]
    }
    assert page.json() == {"users": [{"id": mariana["id"], "name": "Mariana"}]}
    assert empty.json() == {"users": []}


@pytest.mark.parametrize("character", ["%", "_"])
def test_index_users_treats_wildcards_as_literal_characters(
    client: TestClient,
    headers: dict[str, str],
    register_account: Callable[[str, str], dict],
    character: str,
) -> None:
    name = f"Name {character}"
    user = register_account(name, "special@example.com")
    register_account("Name X", "other@example.com")

    response = client.get("/users/", params={"name": character}, headers=headers)

    assert response.status_code == 200
    assert response.json() == {"users": [{"id": user["id"], "name": name}]}


@pytest.mark.parametrize(
    "query", ["skip=-1", "limit=0", "limit=11", "name=", "name=" + "x" * 101]
)
def test_index_users_rejects_invalid_query(
    client: TestClient, headers: dict[str, str], query: str
) -> None:
    response = client.get(f"/users/?{query}", headers=headers)

    assert response.status_code == 422
