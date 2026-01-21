
from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from brain_view_api.db.database import Base
from brain_view_api.models.user import User  # tylko dla typów / relacji


class ScanModality(str, Enum):
    FLAIR = "FLAIR"
    T1W = "T1w"
    T1GD = "T1gd"
    T2W = "T2w"


class Plane(str, Enum):
    STRZALKOWA = "strzalkowa"   # sagittal
    CZOLOWA = "czolowa"         # coronal
    POPRZECZNA = "poprzeczna"   # axial


class MedicalScan(Base):
    __tablename__ = "MedicalScans"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(512), nullable=False, index=True)  # nazwa bloba w Azure
    modality = Column(SAEnum(ScanModality), nullable=False)

    # JSON jako string – np. {"shape": [256,256,120], "spacing": [1.0,1.0,1.0]}
    dimensions_json = Column(Text, nullable=False)

    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("Users.id"), nullable=False)

    uploaded_by_user = relationship("User", back_populates="scans")
    annotations = relationship("Annotation", back_populates="scan", cascade="all,delete-orphan")


class Annotation(Base):
    __tablename__ = "Annotations"

    id = Column(Integer, primary_key=True, index=True)

    scan_id = Column(Integer, ForeignKey("MedicalScans.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("Users.id"), nullable=False)

    slice_index = Column(Integer, nullable=False)
    plane = Column(SAEnum(Plane), nullable=False)

    # ścieżka/nazwa bloba JSON w Azure (z punktami obrysu)
    blob_path = Column(String(512), nullable=False)
    snapshot_path = Column(String(512), nullable=True)  # Path to screenshot in blob storage

    note_text = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    scan = relationship("MedicalScan", back_populates="annotations")
    author = relationship("User", back_populates="annotations")