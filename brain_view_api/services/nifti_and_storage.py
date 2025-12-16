import io
import json
from datetime import datetime, timedelta
from typing import Any, Dict

import nibabel as nib
from azure.storage.blob import BlobServiceClient, BlobSasPermissions, generate_blob_sas

from brain_view_api.db.database import storage_conn_str, container_name, SessionLocal
from brain_view_api.models.mri_image import MedicalScan, Annotation, Plane
from brain_view_api.models.user import User
from brain_view_api.schemas.schemas import AnnotationCreateDTO


# ---------- A. NiftiValidator ----------

class NiftiValidator:
    def _load_img_from_bytes(self, file_bytes: bytes) -> nib.Nifti1Image:
        """
        Ładuje obraz NIfTI z bajtów. Używa FileHolder zamiast ścieżki pliku.
        """
        
        fh = nib.FileHolder(fileobj=io.BytesIO(file_bytes))
        img = nib.Nifti1Image.from_file_map({"header": fh, "image": fh})
        return img

    def validate_header(self, file_bytes: bytes) -> None:
        """
        Sprawdza, czy plik NIfTI jest poprawny (nagłówek, magic number).
        Rzuca wyjątek, jeśli plik jest uszkodzony.
        """
        try:
            img = self._load_img_from_bytes(file_bytes)
            _ = img.header  
        except Exception as e:
            raise ValueError(f"Niepoprawny plik NIfTI: {e}") from e

    def extract_metadata(self, file_bytes: bytes) -> Dict[str, Any]:
        """
        Wyciąga wymiary, voxel spacing i orientację.
        Zwraca słownik, który można zserializować do JSON i zapisać w SQL.
        """
        img = self._load_img_from_bytes(file_bytes)
        shape = [int(x) for x in img.shape]
        header = img.header

        voxel_spacing = [float(x) for x in header.get_zooms()[:3]]  # <- rzutowanie na float

        orientation = "unknown"

        return {
            "shape": shape,
            "voxel_spacing": voxel_spacing,
            "orientation": orientation,
            "dtype": str(img.get_data_dtype()),
        }


# ---------- B. StorageService ----------

class StorageService:
    def __init__(self, connection_string: str, container: str):
        self._blob_service = BlobServiceClient.from_connection_string(connection_string)
        self._container_name = container

        parts = dict(
            kv.split("=", 1)
            for kv in connection_string.split(";")
            if "=" in kv
        )
        self._account_name = parts.get("AccountName")
        self._account_key = parts.get("AccountKey")

        if not self._account_name or not self._account_key:
            raise RuntimeError(
                "Brak AccountName lub AccountKey w storage_conn_str. "
                "Upewnij się, że connection string jest pełnym 'Access keys' connection stringiem."
            )

    def upload_scan(self, file_bytes: bytes, filename: str) -> str:
        blob_client = self._blob_service.get_blob_client(self._container_name, filename)
        blob_client.upload_blob(file_bytes, overwrite=True)
        return filename

    def upload_annotation(self, json_data: dict, filename: str) -> str:
        blob_client = self._blob_service.get_blob_client(self._container_name, filename)
        blob_client.upload_blob(json.dumps(json_data).encode("utf-8"), overwrite=True)
        return filename

    def generate_sas_token(self, blob_name: str, minutes: int = 60) -> str:
        """
        Generuje SAS URL do pojedynczego bloba, korzystając z AccountName + AccountKey
        sparsowanych z connection stringa.
        """
        if not self._account_key or not self._account_name:
            raise RuntimeError("Brak danych konta (AccountName/AccountKey) do wygenerowania SAS.")

        expiry = datetime.utcnow() + timedelta(minutes=minutes)

        
        print(
            f"[StorageService.generate_sas_token] account={self._account_name}, "
            f"container={self._container_name}, blob={blob_name}, expiry={expiry}"
        )

        sas_token = generate_blob_sas(
            account_name=self._account_name,
            container_name=self._container_name,
            blob_name=blob_name,
            account_key=self._account_key,
            permission=BlobSasPermissions(read=True),
            expiry=expiry,
        )

        url = (
            f"https://{self._account_name}.blob.core.windows.net/"
            f"{self._container_name}/{blob_name}?{sas_token}"
        )
        return url


storage_service = StorageService(storage_conn_str, container_name)


# ---------- C. AnnotationManager ----------

class AnnotationManager:
    """
    Łączy dane SQL (MedicalScan, Annotation) z plikami JSON w Blob Storage.
    """

    def __init__(self, storage: StorageService):
        self.storage = storage

    def save_annotation(self, user: User, data: AnnotationCreateDTO) -> Annotation:
        """
        - tworzy JSON z punktami obrysu,
        - wysyła do Azure Blob Storage,
        - zapisuje rekord Annotation w SQL.
        """
        # 1. przygotuj JSON
        json_payload = {
            "scan_id": data.scan_id,
            "slice": data.slice,
            "plane": data.plane,
            "points": data.points,
            "note": data.note,
            "author": getattr(user, "email", None) or getattr(user, "username", None),
            "created_at": datetime.utcnow().isoformat(),
        }

        # 2. nazwa pliku dla bloba
        filename = (
            f"annotations/"
            f"{data.scan_id}_{user.id}_{data.slice}_{data.plane}_"
            f"{int(datetime.utcnow().timestamp())}.json"
        )
        self.storage.upload_annotation(json_payload, filename)

        db: SessionLocal = SessionLocal()
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