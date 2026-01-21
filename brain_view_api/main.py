from fastapi import FastAPI
from brain_view_api.api.users_api import router as users_router, seed_admin
from brain_view_api.api.routes import api_router 
from brain_view_api.db.database import SessionLocal

app = FastAPI()

@app.on_event("startup")
def startup_event(): 
    try:
        db = SessionLocal()
        try:
            seed_admin(db)
        finally:
            db.close()
    except Exception as e:
        print(f"⚠️ Nie udało się zainicjować bazy danych (Azure) przy starcie: {e}")




app.include_router(api_router)