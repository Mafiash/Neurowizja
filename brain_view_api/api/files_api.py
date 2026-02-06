import io
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List

import nibabel as nib
import requests
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Form
from sqlalchemy.orm import Session

from brain_view_api.db.database import SessionLocal, get_db
from brain_view_api.models.mri_image import MedicalScan, Annotation, Plane, Comment
from brain_view_api.models.user import User
from brain_view_api.schemas.schemas import (
    AnnotationCreateDTO,
    AnnotationDTO,
    AnnotationExtendedDTO,
    BulkImportResponseDTO,
    ScanMetadataDTO,
    ScanResponseDTO,
    CommentCreateDTO,
    CommentDTO,
)
from brain_view_api.services.nifti_and_storage import (
    NiftiValidator,
    storage_service,
    AnnotationManager,
)
from brain_view_api.utils.auth import get_current_user
from brain_view_api.services.outline_service import generate_brain_outline


# ---------- A. NiftiValidator ----------






# ========== ROUTER I SERWISY ==========

router = APIRouter(prefix="/files", tags=["files"])

validator = NiftiValidator()
annotation_manager = AnnotationManager(storage_service)


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

    try:
        new_scan = MedicalScan(
            filename=unique_filename,
            modality=modality,
            dimensions_json=json.dumps(meta),
            uploaded_by=current_user["user_id"],
        )
        db.add(new_scan)
        db.commit()
        db.refresh(new_scan)
    except Exception as e:
        db.rollback()
        print(f"❌ DB Error during upload: {e}")
        raise HTTPException(status_code=503, detail="Baza danych nie odpowiedziała. Spróbuj ponownie później.")

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
    try:
        scan = (
            db.query(MedicalScan)
            .filter(MedicalScan.id == scan_id)
            .first()
        )
    except Exception as e:
        print(f"❌ DB Error during scan-url: {e}")
        raise HTTPException(status_code=503, detail="Problem z połączeniem z bazą danych.")
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
    try:
        scans = (
            db.query(MedicalScan)
            .order_by(MedicalScan.uploaded_at.desc())
            .all()
        )
    except Exception as e:
        print(f"❌ DB Error during user-scans: {e}")
        raise HTTPException(status_code=503, detail="Baza danych (SQL Server) jest niedostępna – sprawdź połączenie.")

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


# ========== ENDPOINT: zapis obrysu/notatki ==========

@router.post("/annotations/", response_model=AnnotationDTO)
async def create_annotation(
    data_json: str = Form(..., description="JSON string of AnnotationCreateDTO"),
    screenshot: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from fastapi import Form
    import json
    
    # 1. Parse JSON payload
    try:
        data_dict = json.loads(data_json)
        data = AnnotationCreateDTO(**data_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON data: {e}")

    # 2. Pobierz uzytkownika
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

    # 3. Read screenshot bytes if present
    screenshot_bytes = None
    if screenshot:
        screenshot_bytes = await screenshot.read()

    try:
        # 4. Save annotation via manager
        ann = annotation_manager.save_annotation(user, data, db, screenshot_bytes=screenshot_bytes)
        
        snapshot_url = None
        if ann.snapshot_path:
            try:
                snapshot_url = storage_service.generate_sas_token(ann.snapshot_path)
            except Exception:
                pass

        dto = AnnotationDTO(
            id=ann.id,
            scan_id=ann.scan_id,
            author_id=ann.author_id,
            author_name=user.email,
            slice_index=ann.slice_index,
            plane=str(ann.plane),
            blob_path=ann.blob_path,
            snapshot_path=ann.snapshot_path,
            snapshot_url=snapshot_url,
            note_text=ann.note_text,
            points=data.points,
            comments=[],
            created_at=ann.created_at
        )
        return dto
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Błąd zapisu adnotacji: {str(e)}")


# ========== ENDPOINT: pobieranie adnotacji dla skanu ==========

@router.get("/annotations/{scan_id}", response_model=List[AnnotationDTO])
def get_annotations(scan_id: int, db: Session = Depends(get_db)):
    """Pobiera wszystkie adnotacje dla danego skanu (widoczne dla wszystkich)"""
    print(f"🔍 [BACKEND] Pobieranie adnotacji dla skanu ID: {scan_id}")
    
    results = db.query(Annotation, User.email).join(
        User, Annotation.author_id == User.id
    ).filter(Annotation.scan_id == scan_id).order_by(Annotation.created_at.desc()).all()

    print(f"🔍 [BACKEND] Znaleziono adnotacji: {len(results)}")
    
    dto_list = []
    for ann, email in results:
        snapshot_url = None
        if ann.snapshot_path:
            try:
                snapshot_url = storage_service.generate_sas_token(ann.snapshot_path)
            except Exception:
                pass

        dto = AnnotationDTO(
            id=ann.id,
            scan_id=ann.scan_id,
            author_id=ann.author_id,
            author_name=email,
            slice_index=ann.slice_index,
            plane=str(ann.plane),
            blob_path=ann.blob_path,
            snapshot_path=ann.snapshot_path,
            snapshot_url=snapshot_url,
            note_text=ann.note_text,
            points=None,
            comments=[
                CommentDTO(
                    id=c.id,
                    annotation_id=c.annotation_id,
                    author_id=c.author_id,
                    author_name=c.author.email,
                    text=c.text,
                    created_at=c.created_at
                ) for c in ann.comments
            ],
            created_at=ann.created_at
        )

        # Pobieramy punkty z bloba (z krótkim timeoutem, aby nie blokować)
        try:
            sas_url = storage_service.generate_sas_token(ann.blob_path)
            # Używamy sesji requests dla lepszej wydajności w pętli
            r = requests.get(sas_url, timeout=1.5) 
            if r.status_code == 200:
                dto.points = r.json().get("points")
            else:
                print(f"⚠️ Nie udało się pobrać punktów dla adnotacji {ann.id}: Status {r.status_code}")
        except Exception as e:
            print(f"⚠️ Błąd podczas pobierania bloba adnotacji {ann.id}: {e}")
            pass

        dto_list.append(dto)
        
    return dto_list


@router.get("/annotations/", response_model=List[AnnotationExtendedDTO])
def get_all_annotations(db: Session = Depends(get_db)):
    """Pobiera wszystkie adnotacje ze wszystkich skanów"""
    results = db.query(Annotation, User.email, MedicalScan.filename).join(
        User, Annotation.author_id == User.id
    ).join(
        MedicalScan, Annotation.scan_id == MedicalScan.id
    ).order_by(Annotation.created_at.desc()).all()

    dto_list = []
    for ann, email, scan_file in results:
        snapshot_url = None
        if ann.snapshot_path:
            try:
                snapshot_url = storage_service.generate_sas_token(ann.snapshot_path)
            except Exception:
                pass

        dto = AnnotationExtendedDTO(
            id=ann.id,
            scan_id=ann.scan_id,
            author_id=ann.author_id,
            author_name=email,
            scan_filename=scan_file,
            slice_index=ann.slice_index,
            plane=str(ann.plane),
            blob_path=ann.blob_path,
            snapshot_path=ann.snapshot_path,
            snapshot_url=snapshot_url,
            note_text=ann.note_text,
            points=None,
            comments=[
                CommentDTO(
                    id=c.id,
                    annotation_id=c.annotation_id,
                    author_id=c.author_id,
                    author_name=c.author.email,
                    text=c.text,
                    created_at=c.created_at
                ) for c in ann.comments
            ],
            created_at=ann.created_at
        )
        dto_list.append(dto)
    return dto_list


@router.post("/annotations/bulk/", response_model=BulkImportResponseDTO)
async def bulk_create_annotations(
    data: List[AnnotationCreateDTO],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

    success_count = 0
    errors = []
    total = len(data)

    for item in data:
        try:
            # Uzywamy annotation_manager.save_annotation
            # Zwróć uwagę, że save_annotation robi db.commit()
            annotation_manager.save_annotation(user, item, db)
            success_count += 1
        except Exception as e:
            errors.append(f"Scan ID {item.scan_id}, Slice {item.slice}: {str(e)}")

    return BulkImportResponseDTO(
        total=total,
        success=success_count,
        failed=total - success_count,
        errors=errors
    )


@router.delete("/annotations/{ann_id}")
def delete_annotation(
    ann_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # 1. Sprawdz czy adnotacja istnieje
    ann = db.query(Annotation).filter(Annotation.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Adnotacja nie znaleziona")

    # 2. Sprawdz uprawnienia (czy to autor?)
    # Opcjonalnie: mozna pozwolic adminowi usuwac wszystko? Na razie tylko autor.
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if ann.author_id != user.id:
        raise HTTPException(status_code=403, detail="Nie masz uprawnień do usunięcia tej adnotacji")

    # 3. Usun z Azure
    try:
        storage_service.delete_blob(ann.blob_path)
        if ann.snapshot_path:
            storage_service.delete_blob(ann.snapshot_path)
    except Exception as e:
        print(f"⚠️ Błąd usuwania pliku z Azure: {e}")
        # Kontynuujemy zeby usunac z bazy

    # 4. Usun z Bazy
    db.delete(ann)
    db.commit()

    return {"status": "deleted", "id": ann_id}



@router.post("/scans/{scan_id}/generate-outline", response_model=AnnotationDTO)
def generate_outline(
    scan_id: int,
    slice_idx: int,
    plane: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # 1. Pobierz skan
    scan = db.query(MedicalScan).filter(MedicalScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Skan nie znaleziony")

    # 2. Pobierz plik NIfTI z Azure
    sas_url = storage_service.generate_sas_token(scan.filename)
    try:
        response = requests.get(sas_url)
        response.raise_for_status()
        nifti_bytes = response.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd pobierania skanu z chmury: {e}")

    # 3. Wygeneruj obrys
    try:
        points = generate_brain_outline(nifti_bytes, slice_idx, plane)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd generowania obrysu: {e}")

    # 4. Zapisz jako adnotację
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

    create_data = AnnotationCreateDTO(
        scan_id=scan_id,
        slice=slice_idx,
        plane=plane,
        points=points,
        note="Automatycznie wygenerowany obrys"
    )

    try:
        ann = annotation_manager.save_annotation(user, create_data, db)
        return AnnotationDTO(
            id=ann.id,
            scan_id=ann.scan_id,
            author_id=ann.author_id,
            author_name=user.email,
            slice_index=ann.slice_index,
            plane=str(ann.plane),
            blob_path=ann.blob_path,
            note_text=ann.note_text,
            points=points, # Wygenerowane punkty
            created_at=ann.created_at,
            comments=[]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Błąd zapisu wygenerowanego obrysu: {e}")

@router.post("/annotations/{ann_id}/comments/", response_model=CommentDTO)
def create_comment(
    ann_id: int,
    data: CommentCreateDTO,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ann = db.query(Annotation).filter(Annotation.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Adnotacja nie znaleziona")

    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")

    new_comment = Comment(
        annotation_id=ann_id,
        author_id=user.id,
        text=data.text
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return CommentDTO(
        id=new_comment.id,
        annotation_id=new_comment.annotation_id,
        author_id=new_comment.author_id,
        author_name=user.email,
        text=new_comment.text,
        created_at=new_comment.created_at
    )