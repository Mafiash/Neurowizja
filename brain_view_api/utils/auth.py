from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import secrets
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from datetime import datetime
from requests import Session
from sqlalchemy import text
from db.database import get_db


SECRET_KEY = secrets.token_urlsafe(32)
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
    """Porównuje hasło jawne z hasłem z bazy"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

# ==============================
# TOKEN JWT
# ==============================
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Tworzy token JWT"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Weryfikuje, czy token JWT jest prawidłowy i aktywny"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Brak tokena w nagłówku Authorization")

    token = authorization.replace("Bearer ", "")


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
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Niepoprawny token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Niepoprawny token")

    return {"user_id": session.user_id, "username": username}