import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import MagicMock

from brain_view_api.main import app
from brain_view_api.db.database import Base, get_db
from brain_view_api.models.mri_image import MedicalScan, ScanModality
from brain_view_api.models.user import User
from brain_view_api.utils.auth import get_current_user, hash_password


SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user():
    return {"user_id": 1, "username": "admin@example.com", "is_admin": True}


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        if not db.query(User).filter(User.id == 1).first():
            db.add(
                User(
                    id=1,
                    email="admin@example.com",
                    password_hash=hash_password("secret"),
                    is_admin=True,
                )
            )
        if not db.query(User).filter(User.id == 2).first():
            db.add(
                User(
                    id=2,
                    email="user@example.com",
                    password_hash=hash_password("password"),
                    is_admin=False,
                )
            )
        if not db.query(MedicalScan).filter(MedicalScan.id == 1).first():
            db.add(
                MedicalScan(
                    id=1,
                    filename="scan1.nii",
                    modality=ScanModality.FLAIR,
                    dimensions_json=json.dumps(
                        {"shape": [10, 10, 10], "voxel_spacing": [1.0, 1.0, 1.0], "orientation": "unknown"}
                    ),
                    uploaded_by=1,
                )
            )
        db.commit()
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_user_returns_token(client):
    response = client.post(
        "/users/login",
        json={"username": "user@example.com", "password": "password"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert "access_token" in payload
    assert payload["is_admin"] is False


def test_scan_url_returns_sas_url(client, monkeypatch):
    from brain_view_api.api import files_api

    mock_storage = MagicMock()
    mock_storage.generate_sas_token.return_value = "https://example.com/mock-sas"
    monkeypatch.setattr(files_api, "storage_service", mock_storage)

    response = client.get("/files/scan-url/1")
    assert response.status_code == 200
    payload = response.json()
    assert payload["scan_id"] == 1
    assert payload["filename"] == "scan1.nii"
    assert payload["sas_url"] == "https://example.com/mock-sas"


def test_user_scans_returns_seeded_scan(client):
    response = client.get("/files/user-scans/")
    assert response.status_code == 200
    payload = response.json()
    assert "scans" in payload
    assert len(payload["scans"]) == 1
    assert payload["scans"][0]["filename"] == "scan1.nii"


def test_admin_list_users_returns_seeded_users(client):
    response = client.get("/users/list")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    emails = {user["email"] for user in payload}
    assert "admin@example.com" in emails
    assert "user@example.com" in emails
