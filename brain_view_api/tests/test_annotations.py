import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from brain_view_api.main import app
from brain_view_api.db.database import Base, get_db
from brain_view_api.utils.auth import get_current_user
from unittest.mock import MagicMock, patch

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_brain.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_user():
    return {"user_id": 1, "username": "testuser", "is_admin": False}

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    # Seed a test user
    from brain_view_api.models.user import User
    db = TestingSessionLocal()
    if not db.query(User).filter(User.id == 1).first():
        db.add(User(id=1, email="test@example.com", password_hash="hash"))
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@patch("brain_view_api.api.files_api.storage_service")
@patch("brain_view_api.api.files_api.annotation_manager")
def test_create_annotation(mock_manager, mock_storage):
    # Setup mock
    mock_manager.save_annotation.return_value = MagicMock(
        id=1, scan_id=1, author_id=1, slice=10.0, plane="axial", 
        blob_path="path", snapshot_path=None, note_text="Test", created_at="2024-01-01"
    )
    
    payload = {
        "scan_id": 1,
        "slice": 10,
        "plane": "axial",
        "points": [[1, 2, 3]],
        "note": "Test annotation"
    }
    
    response = client.post(
        "/files/annotations/",
        data={"data_json": json.dumps(payload)},
    )
    
    assert response.status_code == 200
    assert response.json()["note_text"] == "Test"

def test_get_user_scans_empty():
    response = client.get("/files/user-scans/")
    assert response.status_code == 200
    assert "scans" in response.json()
    assert len(response.json()["scans"]) == 0

import json
