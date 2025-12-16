from datetime import datetime, timedelta
import os

from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import text

from brain_view_api.db.database import get_db

# ==============================
# KONFIGURACJA JWT
# ==============================

# Użyj stałego klucza – najlepiej z .env
# np. w config/.env dodaj:
# JWT_SECRET_KEY=jakis_bardzo_tajny_klucz
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "DEV_ONLY_CHANGE_ME")  # ZMIEŃ NA BEZPIECZNY W PROD
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ==============================
# HASŁA
# ==============================

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hashuje hasło."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Porównuje hasło jawne z hasłem z bazy."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

# ==============================
# TOKEN JWT
# ==============================


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Tworzy token JWT."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Weryfikuje, czy token JWT jest prawidłowy i aktywny."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Brak tokena w nagłówku Authorization")

    token = authorization.replace("Bearer ", "").strip()

    # DEBUG: wszystkie sesje
    log = db.execute(text("SELECT * FROM dbo.Sessions")).fetchall()
    print("🔑 Weryfikacja tokena:", token, log)
    print("SECRET_KEY:", SECRET_KEY, "ALG:", ALGORITHM)

    session = db.execute(
        text("SELECT * FROM dbo.Sessions WHERE token = :t"),
        {"t": token}
    ).fetchone()

    if not session:
        raise HTTPException(status_code=401, detail="Sesja nieaktywna lub wylogowana")

    if session.expires_at < datetime.utcnow():
        db.execute(text("DELETE FROM dbo.Sessions WHERE token=:t"), {"t": token})
        db.commit()
        raise HTTPException(status_code=401, detail="Sesja wygasła")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("DECODED PAYLOAD:", payload)
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Niepoprawny token")
    except JWTError as e:
        print("JWTError:", repr(e))
        raise HTTPException(status_code=401, detail="Niepoprawny token " + repr(e))

    return {"user_id": session.user_id, "username": username}