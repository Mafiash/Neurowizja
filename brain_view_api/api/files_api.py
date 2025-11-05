from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from brain_view_api.db.database import get_db
from brain_view_api.utils.auth import get_current_user  

router = APIRouter(
    prefix="/files",
    tags=["files"],
    dependencies=[Depends(get_current_user)]  
)

@router.get("/get_user_files", status_code=200)
def get_user_files(user_id: int, db: Session = Depends(get_db)):
    """Pobiera wszystkie pliki przypisane do użytkownika"""
    try:
        result = db.execute(
            text("SELECT * FROM dbo.UserFiles WHERE user_id = :user_id"),
            {"user_id": user_id}
        ).fetchall()

        if not result:
            raise HTTPException(status_code=404, detail="Brak plików dla podanego użytkownika.")

        files = [dict(row) for row in result]
        return {"files": files}

    except Exception as e:
        print("❌ Błąd SQL:", e)
        raise HTTPException(status_code=400, detail="Nie można pobrać plików użytkownika.")

@router.post("/upload_user_file", status_code=201)
async def upload_user_file(
    user_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Wgrywa plik binarnie do tabeli UserFiles"""
    try:
        file_bytes = await file.read()

        db.execute(
            text("INSERT INTO dbo.UserFiles (user_id, file_) VALUES (:user_id, :file_)"),
            {"user_id": user_id, "file_": file_bytes}
        )
        db.commit()
        return {"message": "Plik został pomyślnie przesłany."}

    except Exception as e:
        db.rollback()
        print("❌ Błąd SQL:", e)
        raise HTTPException(status_code=400, detail="Nie można przesłać pliku użytkownika.")