from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from brain_view_api.db.database import get_db
from pydantic import BaseModel, constr
from utils.auth import hash_password, verify_password, create_access_token; 
from pydantic import BaseModel, constr

router = APIRouter(prefix="/users", tags=["users"])
ACCESS_TOKEN_EXPIRE_MINUTES = 60  
class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/register", status_code=201)
def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    """Rejestracja nowego użytkownika"""
    hashed_pw = hash_password(data.password)

    try:
        db.execute(
            text("INSERT INTO dbo.Users (username, password) VALUES (:u, :p)"),
            {"u": data.username, "p": hashed_pw}
        )
        db.commit()
        return {"message": "Użytkownik został pomyślnie utworzony."}

    except Exception as e:
        db.rollback()
        print("❌ Błąd SQL:", e)
        raise HTTPException(status_code=400, detail="Nie można utworzyć użytkownika (być może istnieje).")

@router.post("/login", response_model=TokenResponse)
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    """Logowanie użytkownika"""
    result = db.execute(
        text("SELECT * FROM dbo.Users WHERE username=:u"),
        {"u": data.username}
    ).fetchone()

    if not result or not verify_password(data.password, result.password):
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")

    token = create_access_token({"sub": data.username})
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    db.execute(
        text("INSERT INTO dbo.Sessions (user_id, token, expires_at) VALUES (:uid, :tok, :exp)"),
        {"uid": result.id, "tok": token, "exp": expires_at}
    )
    db.commit()

    return {"access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Wylogowanie użytkownika (usunięcie tokena z bazy)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Brak tokena")

    token = authorization.replace("Bearer ", "")
    result = db.execute(
        text("DELETE FROM dbo.Sessions WHERE token = :tok"),
        {"tok": token}
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=400, detail="Sesja nie istnieje lub już wygasła")

    return {"message": "Wylogowano pomyślnie"}
