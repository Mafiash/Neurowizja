import io
import json
from datetime import datetime, timedelta
from typing import Any, Dict

import nibabel as nib
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from brain_view_api.db.database import SessionLocal, get_db
from brain_view_api.models.mri_image import MedicalScan, Annotation, Plane
from brain_view_api.models.user import User
from brain_view_api.schemas.schemas import (
    AnnotationCreateDTO,
    ScanMetadataDTO,
    ScanResponseDTO,
)
from brain_view_api.services.nifti_and_storage import (
    NiftiValidator,
    storage_service,
    AnnotationManager,
)
from brain_view_api.utils.auth import get_current_user


# ---------- A. NiftiValidator (lokalny wariant używany przez endpointy) ----------

class LocalNiftiValidator:
    def _load_img_from_bytes(self, file_bytes: bytes) -> nib.Nifti1Image:
        fh = nib.FileHolder(fileobj=io.BytesIO(file_bytes))
        img = nib.Nifti1Image.from_file_map({"header": fh, "image": fh})
        return img

    def validate_header(self, file_bytes: bytes) -> None:
        try:
            img = self._load_img_from_bytes(file_bytes)
            _ = img.header
        except Exception as e:
            raise ValueError(f"Niepoprawny plik NIfTI: {e}") from e

    def extract_metadata(self, file_bytes: bytes) -> Dict[str, Any]:
        img = self._load_img_from_bytes(file_bytes)
        shape = [int(x) for x in img.shape]
        header = img.header
        voxel_spacing = [float(x) for x in header.get_zooms()[:3]]
        orientation = "unknown"
        return {
            "shape": shape,
            "voxel_spacing": voxel_spacing,
            "orientation": orientation,
            "dtype": str(img.get_data_dtype()),
        }


# ---------- C. AnnotationManager (używa StorageService z services/nifti_and_storage) ----------

class LocalAnnotationManager:
    def __init__(self, storage):
        self.storage = storage

    def save_annotation(self, user: User, data: AnnotationCreateDTO) -> Annotation:
        json_payload = {
            "scan_id": data.scan_id,
            "slice": data.slice,
            "plane": data.plane,
            "points": data.points,
            "note": data.note,
            "author": getattr(user, "email", None) or getattr(user, "username", None),
            "created_at": datetime.utcnow().isoformat(),
        }

        filename = (
            f"annotations/"
            f"{data.scan_id}_{user.id}_{data.slice}_{data.plane}_"
            f"{int(datetime.utcnow().timestamp())}.json"
        )

        self.storage.upload_annotation(json_payload, filename)

        db: Session = SessionLocal()
        try:
            scan = db.query(MedicalScan).filter(MedicalScan.id == data.scan_id).first()
            if not scan:
                raise ValueError("Skan nie istnieje")

            try:
                plane_enum = Plane(data.plane)
            except ValueError:
                plane_enum = Plane.POPRZECZNA

            ann = Annotation(
                scan_id=data.scan_id,
                author_id=user.id,
                slice_index=data.slice,
                plane=plane_enum,
                blob_path=filename,
                note_text=data.note,
            )
            db.add(ann)
            db.commit()
            db.refresh(ann)
            return ann
        finally:
            db.close()


# ========== ROUTER I SERWISY ==========

router = APIRouter(prefix="/files", tags=["files"])

# możesz korzystać z NiftiValidator z services, ale masz też LocalNiftiValidator powyżej;
# dla spójności użyj jednego – tutaj użyjemy LocalNiftiValidator
validator = LocalNiftiValidator()
annotation_manager = LocalAnnotationManager(storage_service)


# ========== ENDPOINT: upload skanu ==========

@router.post("/upload-scan/", response_model=ScanMetadataDTO)
async def upload_scan(
    file: UploadFile = File(...),
    modality: str = "FLAIR",
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()

    try:
        validator.validate_header(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    meta = validator.extract_metadata(content)

    unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    storage_service.upload_scan(content, unique_filename)

    new_scan = MedicalScan(
        filename=unique_filename,
        modality=modality,
        dimensions_json=json.dumps(meta),
        uploaded_by=current_user["user_id"],
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    return ScanMetadataDTO(
        scan_id=new_scan.id,
        filename=new_scan.filename,
        shape=meta["shape"],
        voxel_spacing=meta["voxel_spacing"],
        orientation=meta["orientation"],
        modality=str(modality),
    )


# ========== ENDPOINT: SAS URL do skanu ==========

@router.get("/scan-url/{scan_id}", response_model=ScanResponseDTO)
def get_scan_url(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    scan = (
        db.query(MedicalScan)
        .filter(
            MedicalScan.id == scan_id,
            MedicalScan.uploaded_by == current_user["user_id"],
        )
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Skan nie znaleziony")

    print(f"Generowanie SAS URL dla skanu ID: {scan_id}")
    sas_url = storage_service.generate_sas_token(scan.filename)

    return ScanResponseDTO(
        scan_id=scan.id,
        filename=scan.filename,
        sas_url=sas_url,
        expires_at=datetime.utcnow() + timedelta(minutes=60),
    )


# ========== ENDPOINT: lista skanów użytkownika ==========

@router.get("/user-scans/")
def get_user_scans(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    scans = (
        db.query(MedicalScan)
        .filter(MedicalScan.uploaded_by == current_user["user_id"])
        .order_by(MedicalScan.uploaded_at.desc())
        .all()
    )

    result: list[ScanMetadataDTO] = []
    for scan in scans:
        try:
            meta = json.loads(scan.dimensions_json)
        except Exception:
            meta = {"shape": [], "voxel_spacing": [], "orientation": "unknown"}

        result.append(
            ScanMetadataDTO(
                scan_id=scan.id,
                filename=scan.filename,
                shape=meta.get("shape", []),
                voxel_spacing=meta.get("voxel_spacing", []),
                orientation=meta.get("orientation", "unknown"),
                modality=str(scan.modality),
            )
        )

    return {"scans": result}