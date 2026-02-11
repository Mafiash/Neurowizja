from datetime import datetime, timedelta
import os

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from brain_view_api.db.database import get_db
from pydantic import BaseModel
from brain_view_api.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from brain_view_api.models.user import User, DBSession, UserRole # Import modeli
from brain_view_api.services.nifti_and_storage import storage_service
from fastapi import UploadFile, File
import uuid

def seed_admin(db: Session):
    admin_email = os.getenv("ADMIN_EMAIL", "lekarz-specjalista")
    admin_password = os.getenv("ADMIN_PASSWORD", "BardzoTrudneHaslo123!") # Hasło domyślne jeśli zapomnisz ustawić env
    
    # 1. Usuwamy starego, niebezpiecznego admina jeśli istnieje
    old_admin = db.query(User).filter(User.email == "admin").first()
    if old_admin and old_admin.email != admin_email:
        print("🗑️ Usuwanie starego konta 'admin' oraz jego sesji...")
        # Usuwamy sesje powiązane ze starym adminem
        db.query(DBSession).filter(DBSession.user_id == old_admin.id).delete()
        db.delete(old_admin)
        db.commit()

    # 2. Tworzymy lub aktualizujemy bezpiecznego użytkownika
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        print(f"👤 Tworzenie bezpiecznego konta: {admin_email}...")
        admin = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            role=UserRole.LEKARZ,
            is_admin=True
        )
        db.add(admin)
    else:
        print(f"🔄 Aktualizacja hasła dla konta: {admin_email}...")
        admin.password_hash = hash_password(admin_password)
        admin.is_admin = True
    
    db.commit()

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
    is_admin: bool = False
    profile_pic_url: str | None = None

@router.post("/register", status_code=201)
def register_user(
    data: RegisterRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Rejestracja nowego użytkownika - TYLKO DLA ADMINÓW"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Tylko administrator może tworzyć użytkowników")
        
    hashed_pw = hash_password(data.password)

    try:
        new_user = User(
            email=data.username,
            password_hash=hashed_pw,
            is_admin=False # Domyślnie nie admin
        )
        db.add(new_user)
        db.commit()
        return {"message": f"Użytkownik {data.username} został utworzony."}
    except Exception as e:
        db.rollback()
        print("❌ Rejestracja błąd:", e)
        raise HTTPException(status_code=400, detail="Nie można utworzyć użytkownika.")

@router.post("/login", response_model=TokenResponse)
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    """Logowanie użytkownika"""
    user = db.query(User).filter(User.email == data.username).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Nieprawidłowy login lub hasło")

    token = create_access_token({"sub": data.username})
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    new_session = DBSession(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    db.add(new_session)
    db.commit()

    return {
        "access_token": token, 
        "token_type": "bearer", 
        "is_admin": user.is_admin,
        "profile_pic_url": user.profile_pic_url
    }



@router.get("/list")
def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Lista użytkowników - TYLKO DLA ADMINÓW"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Brak uprawnień")
        
    users = db.query(User).all()
    return [{
        "id": u.id, 
        "email": u.email, 
        "is_admin": u.is_admin, 
        "role": u.role,
        "profile_pic_url": u.profile_pic_url
    } for u in users]


@router.post("/promote/{user_id}")
def promote_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Nadawanie uprawnień admina - TYLKO DLA ADMINÓW"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Brak uprawnień")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
        
    user.is_admin = True
    db.commit()
    return {"message": f"Użytkownik {user.email} jest teraz administratorem"}

class ResetPasswordRequest(BaseModel):
    new_password: str

@router.put("/reset-password/{user_id}")
def reset_password(
    user_id: int,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Zmiana hasła użytkownika przez admina"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Brak uprawnień")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
        
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": f"Hasło użytkownika {user.email} zostało zmienione"}

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Usunięcie użytkownika - TYLKO DLA ADMINÓW"""
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Brak uprawnień")
        
    if current_user.get("user_id") == user_id:
        raise HTTPException(status_code=400, detail="Nie możesz usunąć samego siebie")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
        
    db.delete(user)
    db.commit()
    return {"message": f"Użytkownik {user.email} został usunięty"}

@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Przesyłanie zdjęcia profilowego do Azure Blob Storage"""
    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")

    file_bytes = await file.read()
    extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"profiles/{uuid.uuid4()}.{extension}"
    
    # Przesyłamy
    storage_service.upload_scan(file_bytes, unique_filename) # używamy generycznego uploadu
    
    # Generujemy SAS URL
    sas_url = storage_service.generate_sas_token(unique_filename, minutes=525600) # Rok ważności dla uproszczenia
    
    user.profile_pic_url = sas_url
    db.commit()
    
    return {"message": "Zdjęcie profilowe zaktualizowane", "url": sas_url}


@router.post("/logout")
def logout_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Wylogowanie użytkownika (usunięcie tokena z bazy)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Brak tokena")

    token = authorization.replace("Bearer ", "")
    session = db.query(DBSession).filter(DBSession.token == token).first()
    
    if not session:
        raise HTTPException(status_code=400, detail="Sesja nie istnieje")

    db.delete(session)
    db.commit()

    return {"message": "Wylogowano pomyślnie"}
