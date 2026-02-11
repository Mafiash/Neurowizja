import io
import json
from datetime import datetime, timedelta
from typing import Any, Dict

import nibabel as nib
from azure.storage.blob import BlobServiceClient, BlobSasPermissions, generate_blob_sas
from sqlalchemy.orm import Session

from brain_view_api.db.database import storage_conn_str, container_name, get_session_local
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
    def __init__(self, connection_string: str | None, container: str | None):
        if not connection_string or not container:
            print("⚠️ Warning: Azure Storage connection string or container name is missing. Storage functionality will be disabled.")
            self._blob_service = None
            self._container_name = container
            self._account_name = None
            self._account_key = None
            return

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

    def delete_blob(self, filename: str) -> None:
        blob_client = self._blob_service.get_blob_client(self._container_name, filename)
        if blob_client.exists():
            blob_client.delete_blob()

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

    def save_annotation(self, user: User, data: AnnotationCreateDTO, db: Session, screenshot_bytes: bytes = None) -> Annotation:
        """
        - tworzy JSON z punktami obrysu,
        - wysyła do Azure Blob Storage,
        - wysyła screenshot (jesli jest) do Azure Blob Storage,
        - zapisuje rekord Annotation w SQL.
        """
        # 1. przygotuj JSON
        json_payload = {
            "scan_id": data.scan_id,
            "slice": data.slice,
            "plane": data.plane,
            "points": data.points,
            "note": data.note,
            "viewer_state": data.viewer_state,
            "author": getattr(user, "email", None) or getattr(user, "username", None),
            "created_at": datetime.utcnow().isoformat(),
        }

        timestamp = int(datetime.utcnow().timestamp())
        base_filename = f"{data.scan_id}_{user.id}_{data.slice}_{data.plane}_{timestamp}"

        # 2. nazwa pliku dla bloba (JSON)
        json_filename = f"annotations/{base_filename}.json"
        self.storage.upload_annotation(json_payload, json_filename)

        # 3. upload screenshot (jesli jest)
        snapshot_path = None
        if screenshot_bytes:
            png_filename = f"annotations/{base_filename}.png"
            # Uzywamy upload_scan bo to generic upload bajtów
            self.storage.upload_scan(screenshot_bytes, png_filename)
            snapshot_path = png_filename

        # 4. Zapis do DB
        # Uzywamy przekazanej sesji db zamiast tworzyc nowa jesli to mozliwe,
        # ale w kodzie wyzej bylo SessionLocal().
        # Skoro tutaj dostajemy db w argumencie (w poprzedniej wersji bylo db: Session w sygnaturze ale nie uzywane w ciele metody,
        # tworzyl nowa sesje SessionLocal. Poprawmy to zeby uzywac przekazanej sesji jesli jest.
        # W files_api przekazujemy db.

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
                slice=data.slice,
                plane=plane_enum,
                blob_path=json_filename,
                snapshot_path=snapshot_path,
                note_text=data.note,
            )
            db.add(ann)
            db.commit()
            db.refresh(ann)
            return ann
        except Exception as e:
            db.rollback()
            raise e