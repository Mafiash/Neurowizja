from fastapi import APIRouter
from brain_view_api.api.users_api import router as users_router
from brain_view_api.api.files_api import router as files_router 

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(files_router)