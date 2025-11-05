from sqlalchemy import Column, Integer, String, LargeBinary, DateTime
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

from brain_view_api.db.database import Base


class MRIImage(Base):
    __tablename__ = "mri_images"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    image = Column(LargeBinary, nullable=False)  # .nii.gz
    label = Column(LargeBinary, nullable=True)  # nii.gz
    image_filename = Column(String, nullable=False)
    label_filename = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


# Pydantic Models (API schemas)
class MRIImageBase(BaseModel):
    user_id: int
    image_filename: str


class MRIImageCreate(MRIImageBase):
    """Schema for creating a new MRI image"""
    pass


class MRIImageResponse(MRIImageBase):
    """Schema for MRI image response (without binary data)"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MRIImageWithData(MRIImageResponse):
    """Schema for MRI image with base64 encoded data"""
    image_base64: Optional[str] = None
    label_base64: Optional[str] = None

    class Config:
        from_attributes = True

