from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models import Friendship, User, UserMovie  # noqa: F401


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


@pytest.fixture
def register_account(client: TestClient) -> Callable[[str, str], dict]:
    def register(name: str, email: str) -> dict:
        response = client.post(
            "/auth/register",
            json={"name": name, "email": email, "password": "password123"},
        )
        assert response.status_code == 201
        return response.json()

    return register


@pytest.fixture
def login_account(client: TestClient) -> Callable[[str], dict]:
    def login(email: str) -> dict:
        response = client.post(
            "/auth/login", json={"email": email, "password": "password123"}
        )
        assert response.status_code == 200
        return response.json()

    return login
