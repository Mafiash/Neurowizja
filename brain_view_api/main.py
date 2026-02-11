from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from brain_view_api.api.users_api import router as users_router, seed_admin
from brain_view_api.api.routes import api_router 
from brain_view_api.db.database import init_db

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
logger.info("🚀 Aplikacja Brain View startuje...")

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://brain-view-ui-214139693356.europe-central2.run.app",
        "http://localhost:3000" # Zostawiamy dla testów lokalnych
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event(): 
    try:
        init_db()
        import os
        admin_email = os.getenv("ADMIN_EMAIL", "lekarz-specjalista")
        logger.info(f"🔑 Próba zainicjowania admina dla: {admin_email}")
        
        from brain_view_api.db.database import get_session_local
        SessionLocal = get_session_local()
        db = SessionLocal()
        try:
            seed_admin(db)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"⚠️ Nie udało się zainicjować bazy danych (Azure) przy starcie: {e}", exc_info=True)




app.include_router(api_router)