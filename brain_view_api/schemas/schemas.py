
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
        from_attributes = True


class AnnotationCreateDTO(BaseModel):
    scan_id: int
    slice: int
    plane: Literal["strzalkowa", "czolowa", "poprzeczna", "axial", "coronal", "sagittal"]
    points: List[List[float]]  # [[x,y], [x,y], ...]
    note: Optional[str] = None


# ---------- AnnotationDTO ----------

class AnnotationDTO(BaseModel):
    id: int
    scan_id: int
    author_id: int
    author_name: Optional[str] = None # Nowa kolumna
    slice_index: int
    plane: str
    blob_path: str
    snapshot_path: Optional[str] = None # Sciezka do screenshota
    snapshot_url: Optional[str] = None # URL SAS do screenshota
    note_text: Optional[str]
    points: Optional[List[List[float]]] = None # Nowe pole z danymi obrysu
    created_at: datetime

    class Config:
        from_attributes = True


class AnnotationExtendedDTO(AnnotationDTO):
    scan_filename: Optional[str] = None


class BulkImportResponseDTO(BaseModel):
    total: int
    success: int
    failed: int
    errors: List[str]


# ---------- ScanResponseDTO ----------

class ScanResponseDTO(BaseModel):
    scan_id: int
    filename: str
    sas_url: str
    expires_at: datetime