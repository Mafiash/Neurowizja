from fastapi import FastAPI
from brain_view_api.api.users_api import router as users_router
from brain_view_api.api.routes import api_router 
app = FastAPI()
app.include_router(api_router)