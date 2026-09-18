import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_home(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello World!"}


@pytest.mark.parametrize(
    "x,y,expected",
    [
        (2, 3, 6),
        (5, 4, 20),
        (10, 0.5, 5),
    ],
)
def test_multiply(client, x, y, expected):
    response = client.post(f"/mul?x={x}&y={y}")

    assert response.status_code == 200
    assert response.json() == expected


def test_multiply_negative(client):
    response = client.post("/mul?x=-2&y=3")

    assert response.status_code == 200
    assert response.json() == -6


def test_division(client):
    response = client.post("/div?x=10&y=2")

    assert response.status_code == 200
    assert response.json() == 5


@pytest.mark.parametrize("x", [1, 10, -5, 100])
def test_division_by_zero(client, x):
    response = client.post(f"/div?x={x}&y=0")

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Não se pode dividir por 0!"
    }