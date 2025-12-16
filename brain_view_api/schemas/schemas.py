
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ---------- ScanMetadataDTO ----------

class ScanMetadataDTO(BaseModel):
    scan_id: int
    filename: str

    # np. [256, 256, 120]
    shape: List[int] = Field(..., description="Wymiary skanu (x, y, z)")
    # np. [1.0, 1.0, 1.0]
    voxel_spacing: List[float] = Field(..., description="Rozdzielczość wokseli (mm)")
    # np. "RAS", "LPS" itd.
    orientation: str = Field(..., description="Orientacja przestrzenna skanu")
    modality: str

    class Config:
        orm_mode = True


# ---------- AnnotationCreateDTO ----------

class AnnotationCreateDTO(BaseModel):
    scan_id: int
    slice: int
    plane: Literal["strzalkowa", "czolowa", "poprzeczna", "axial", "coronal", "sagittal"]
    points: List[List[float]]  # [[x,y], [x,y], ...]
    note: Optional[str] = None


# ---------- ScanResponseDTO ----------

class ScanResponseDTO(BaseModel):
    scan_id: int
    filename: str
    sas_url: str
    expires_at: datetime