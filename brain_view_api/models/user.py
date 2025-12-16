
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
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
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # relacje
    scans = relationship("MedicalScan", back_populates="uploaded_by_user", cascade="all,delete-orphan")
    annotations = relationship("Annotation", back_populates="author", cascade="all,delete-orphan")