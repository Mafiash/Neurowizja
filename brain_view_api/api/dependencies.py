from fastapi import Depends
from sqlalchemy.orm import Session
from brain_view_api.db.database import get_db
from brain_view_api.models.user import User

def get_current_user(db: Session = Depends(get_db), user_id: int = Depends(get_user_id)):
    return db.query(User).filter(User.id == user_id).first()

def get_user_id():

    pass

