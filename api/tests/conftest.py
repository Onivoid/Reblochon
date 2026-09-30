from collections.abc import Generator
from uuid import uuid4

import pytest
from app.db.session import engine, get_db
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture()
def db_session() -> Generator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, autoflush=False, expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient]:
    def override_get_db() -> Generator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def register_user(client: TestClient):
    def _register(
        *,
        email: str | None = None,
        password: str = "password123",
        display_name: str = "Test User",
        locale: str = "fr",
    ) -> dict:
        payload = {
            "email": email or f"user-{uuid4().hex[:10]}@example.com",
            "password": password,
            "display_name": display_name,
            "locale": locale,
        }
        response = client.post("/auth/register", json=payload)
        assert response.status_code == 200, response.text
        return response.json()

    return _register
