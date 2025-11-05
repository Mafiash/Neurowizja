from fastapi import APIRouter, HTTPException
from brain_view_api.models.user import User
from brain_view_api.services.user_service import get_users

router = APIRouter()

@router.get("/users")
async def read_users():
    users = get_users()
    return users

@router.get("/users/{user_id}")
async def read_user(user_id: int):
    user = get_users(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# TODO: stworzyć endpointy do obsługi CRUD plików nifti