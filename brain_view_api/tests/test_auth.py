from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from brain_view_api.db.database import Base
from brain_view_api.models.user import User, DBSession
from brain_view_api.utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    SECRET_KEY,
    ALGORITHM,
)


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_hash_and_verify_password():
    hashed = hash_password("secret")

    assert verify_password("secret", hashed) is True
    assert verify_password("wrong", hashed) is False
    assert verify_password("secret", "not-a-real-hash") is False


def test_create_access_token_contains_expected_claims():
    token = create_access_token({"sub": "user@example.com"}, expires_delta=timedelta(minutes=5))
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    assert payload["sub"] == "user@example.com"
    assert "exp" in payload


def test_get_current_user_valid_session(db_session):
    user = User(id=1, email="user@example.com", password_hash="hash")
    db_session.add(user)
    token = create_access_token({"sub": "user@example.com"}, expires_delta=timedelta(minutes=5))
    db_session.add(
        DBSession(
            user_id=1,
            token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
    )
    db_session.commit()

    result = get_current_user(authorization=f"Bearer {token}", db=db_session)

    assert result["user_id"] == 1
    assert result["username"] == "user@example.com"
    assert result["is_admin"] is False


def test_get_current_user_expired_session_removes_session(db_session):
    user = User(id=1, email="user@example.com", password_hash="hash")
    db_session.add(user)
    token = create_access_token({"sub": "user@example.com"}, expires_delta=timedelta(minutes=5))
    db_session.add(
        DBSession(
            user_id=1,
            token=token,
            expires_at=datetime.utcnow() - timedelta(minutes=1),
        )
    )
    db_session.commit()

    with pytest.raises(HTTPException) as excinfo:
        get_current_user(authorization=f"Bearer {token}", db=db_session)

    assert excinfo.value.status_code == 401
    assert excinfo.value.detail == "Sesja wygasła"
    assert db_session.query(DBSession).count() == 0
