from collections.abc import Callable
from typing import NamedTuple

import pytest
from fastapi.testclient import TestClient


class Account(NamedTuple):
    id: int
    headers: dict[str, str]


@pytest.fixture
def accounts(
    register_account: Callable[[str, str], dict],
    login_account: Callable[[str], dict],
) -> dict[str, Account]:
    accounts = {}
    for name in ("Alice", "Bob", "Carol"):
        email = f"{name.lower()}@example.com"
        user = register_account(name, email)
        token = login_account(email)["access_token"]
        accounts[name] = Account(user["id"], {"Authorization": f"Bearer {token}"})
    return accounts


def send_request(client: TestClient, sender: Account, recipient: Account) -> dict:
    response = client.post(
        "/friendships/", headers=sender.headers, json={"user_id": recipient.id}
    )
    assert response.status_code == 201
    return response.json()


def accept_request(client: TestClient, recipient: Account, request_id: int) -> dict:
    response = client.patch(
        f"/friendships/requests/{request_id}/accept", headers=recipient.headers
    )
    assert response.status_code == 200
    return response.json()


def create_movie(client: TestClient, owner: Account, payload: dict) -> dict:
    response = client.post("/movies/", headers=owner.headers, json=payload)
    assert response.status_code == 201
    return response.json()


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("POST", "/friendships/", {"user_id": 2}),
        ("GET", "/friendships/requests", None),
        ("PATCH", "/friendships/requests/1/accept", None),
        ("DELETE", "/friendships/requests/1", None),
        ("GET", "/friendships/", None),
        ("GET", "/friendships/2/movies?status=assistido", None),
        ("GET", "/users/", None),
    ],
)
def test_routes_require_access_token(
    client: TestClient,
    register_account: Callable[[str, str], dict],
    login_account: Callable[[str], dict],
    method: str,
    path: str,
    payload: dict | None,
) -> None:
    register_account("Alice", "alice@example.com")
    refresh_token = login_account("alice@example.com")["refresh_token"]

    anonymous = client.request(method, path, json=payload)
    with_refresh = client.request(
        method, path, json=payload, headers={"Authorization": f"Bearer {refresh_token}"}
    )

    assert anonymous.status_code == with_refresh.status_code == 401


def test_request_is_pending_and_visible_only_to_recipient(
    client: TestClient, accounts: dict[str, Account]
) -> None:
    alice, bob, carol = (accounts[name] for name in ("Alice", "Bob", "Carol"))
    request = send_request(client, bob, alice)
    send_request(client, alice, carol)

    assert request["id"] > 0
    assert request == {
        "id": request["id"],
        "user_low_id": alice.id,
        "user_high_id": bob.id,
        "requested_by_id": bob.id,
        "status": "pending",
    }
    received = client.get("/friendships/requests", headers=alice.headers)
    assert received.status_code == 200
    assert received.json() == {
        "requests": [
            {
                "id": request["id"],
                "requested_by_id": bob.id,
                "requested_by_name": "Bob",
            }
        ]
    }
    assert client.get("/friendships/requests", headers=bob.headers).json() == {
        "requests": []
    }
    assert client.get("/friendships/", headers=alice.headers).json() == {"friends": []}


@pytest.mark.parametrize("payload", [{}, {"user_id": 0}, {"user_id": "invalid"}])
def test_send_request_rejects_invalid_payload(
    client: TestClient, accounts: dict[str, Account], payload: dict
) -> None:
    response = client.post(
        "/friendships/", headers=accounts["Alice"].headers, json=payload
    )

    assert response.status_code == 422


def test_send_request_rejects_self_and_unknown_recipient(
    client: TestClient, accounts: dict[str, Account]
) -> None:
    alice = accounts["Alice"]
    for user_id, expected_status in ((alice.id, 422), (999, 404)):
        response = client.post(
            "/friendships/", headers=alice.headers, json={"user_id": user_id}
        )

        assert response.status_code == expected_status


def test_request_cannot_be_duplicated_in_either_direction(
    client: TestClient, accounts: dict[str, Account]
) -> None:
    alice, bob = accounts["Alice"], accounts["Bob"]
    request = send_request(client, alice, bob)

    for sender, recipient in ((alice, bob), (bob, alice)):
        response = client.post(
            "/friendships/", headers=sender.headers, json={"user_id": recipient.id}
        )
        assert response.status_code == 409

    accept_request(client, bob, request["id"])
    response = client.post(
        "/friendships/", headers=alice.headers, json={"user_id": bob.id}
    )
    assert response.status_code == 409


def test_only_recipient_can_accept_and_friendship_is_mutual(
    client: TestClient, accounts: dict[str, Account]
) -> None:
    alice, bob, carol = (accounts[name] for name in ("Alice", "Bob", "Carol"))
    request = send_request(client, alice, bob)
    path = f"/friendships/requests/{request['id']}"

    for account in (alice, carol):
        assert (
            client.patch(f"{path}/accept", headers=account.headers).status_code == 404
        )
    assert client.delete(path, headers=carol.headers).status_code == 404
    assert accept_request(client, bob, request["id"]) == {
        **request,
        "status": "accepted",
    }

    assert client.get("/friendships/requests", headers=bob.headers).json() == {
        "requests": []
    }
    for account, expected in (
        (alice, [{"id": bob.id, "name": "Bob"}]),
        (bob, [{"id": alice.id, "name": "Alice"}]),
        (carol, []),
    ):
        response = client.get("/friendships/", headers=account.headers)
        assert response.status_code == 200
        assert response.json() == {"friends": expected}

    assert client.patch(f"{path}/accept", headers=bob.headers).status_code == 404
    assert client.delete(path, headers=alice.headers).status_code == 404
    assert client.delete(path, headers=bob.headers).status_code == 404


@pytest.mark.parametrize("actor_name", ["Alice", "Bob"], ids=["cancel", "decline"])
def test_remove_pending_request_allows_a_new_request(
    client: TestClient, accounts: dict[str, Account], actor_name: str
) -> None:
    alice, bob = accounts["Alice"], accounts["Bob"]
    request = send_request(client, alice, bob)
    path = f"/friendships/requests/{request['id']}"
    actor = accounts[actor_name]

    response = client.delete(path, headers=actor.headers)

    assert response.status_code == 204
    assert response.content == b""
    assert client.delete(path, headers=actor.headers).status_code == 404
    assert client.patch(f"{path}/accept", headers=bob.headers).status_code == 404
    assert client.get("/friendships/requests", headers=bob.headers).json() == {
        "requests": []
    }
    assert send_request(client, alice, bob)["status"] == "pending"


def test_friend_movies_require_an_accepted_friendship(
    client: TestClient, accounts: dict[str, Account]
) -> None:
    alice, bob, carol = (accounts[name] for name in ("Alice", "Bob", "Carol"))
    create_movie(client, bob, {"title": "Arrival", "status": "assistido"})
    path = f"/friendships/{bob.id}/movies?status=assistido"
    assert client.get(path, headers=alice.headers).status_code == 404

    request = send_request(client, alice, bob)
    assert client.get(path, headers=alice.headers).status_code == 404

    accept_request(client, bob, request["id"])
    assert client.get(path, headers=carol.headers).status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("PATCH", "/friendships/requests/0/accept"),
        ("DELETE", "/friendships/requests/invalid"),
        ("GET", "/friendships/0/movies?status=assistido"),
    ],
)
def test_routes_reject_invalid_path_ids(
    client: TestClient, accounts: dict[str, Account], method: str, path: str
) -> None:
    response = client.request(method, path, headers=accounts["Alice"].headers)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "query",
    ["", "?status=unknown", "?status=assistido&skip=-1", "?status=assistido&limit=11"],
)
def test_friend_movies_reject_invalid_query(
    client: TestClient, accounts: dict[str, Account], query: str
) -> None:
    alice, bob = accounts["Alice"], accounts["Bob"]
    accept_request(client, bob, send_request(client, alice, bob)["id"])

    response = client.get(f"/friendships/{bob.id}/movies{query}", headers=alice.headers)

    assert response.status_code == 422


def test_friends_can_read_each_others_movies_by_status_without_modifying_them(
    client: TestClient, accounts: dict[str, Account]
) -> None:
    alice, bob, carol = (accounts[name] for name in ("Alice", "Bob", "Carol"))
    accept_request(client, bob, send_request(client, alice, bob)["id"])
    watched = create_movie(
        client,
        bob,
        {"title": "Arrival", "status": "assistido", "rating": 9, "review": "Ótimo"},
    )
    watchlist = create_movie(
        client, bob, {"title": "Alien", "status": "quero_assistir"}
    )
    alice_movie = create_movie(client, alice, {"title": "Dune", "status": "assistido"})
    create_movie(client, carol, {"title": "Blade Runner", "status": "assistido"})

    for viewer, owner, movie in (
        (alice, bob, watched),
        (alice, bob, watchlist),
        (bob, alice, alice_movie),
    ):
        response = client.get(
            f"/friendships/{owner.id}/movies",
            headers=viewer.headers,
            params={"status": movie["status"]},
        )
        assert response.status_code == 200
        assert response.json() == {"movies": [movie]}

    path = f"/movies/{watched['id']}"
    assert (
        client.patch(path, headers=alice.headers, json={"rating": 1}).status_code == 404
    )
    assert client.delete(path, headers=alice.headers).status_code == 404
    assert client.get(path, headers=bob.headers).json() == watched


def test_friend_movies_paginate_after_filtering_by_status(
    client: TestClient, accounts: dict[str, Account]
) -> None:
    alice, bob = accounts["Alice"], accounts["Bob"]
    accept_request(client, bob, send_request(client, alice, bob)["id"])
    create_movie(client, bob, {"title": "Alien", "status": "quero_assistir"})
    watched = [
        create_movie(client, bob, {"title": f"Movie {index}", "status": "assistido"})
        for index in range(12)
    ]
    path = f"/friendships/{bob.id}/movies?status=assistido"

    first = client.get(path, headers=alice.headers)
    second = client.get(f"{path}&skip=10", headers=alice.headers)
    empty = client.get(f"{path}&skip=20", headers=alice.headers)

    assert first.status_code == second.status_code == empty.status_code == 200
    assert first.json() == {"movies": watched[:10]}
    assert second.json() == {"movies": watched[10:]}
    assert empty.json() == {"movies": []}
