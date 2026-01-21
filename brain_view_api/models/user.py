
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import relationship

from brain_view_api.db.database import Base


class UserRole(str, Enum):
    LEKARZ = "Lekarz"
    STUDENT = "Student"
    BADACZ = "Badacz"


class User(Base):
    __tablename__ = "Users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    is_admin = Column(Boolean, default=False, nullable=False)
    profile_pic_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # relacje
    scans = relationship("MedicalScan", back_populates="uploaded_by_user", cascade="all,delete-orphan")
    annotations = relationship("Annotation", back_populates="author", cascade="all,delete-orphan")


class DBSession(Base):
    __tablename__ = "Sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    token = Column(String(512), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)