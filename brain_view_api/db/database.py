from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
# Importy dla Azure Blob Storage
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
import logging

app = FastAPI()

# --- 1. KONFIGURACJA ZMIENNYCH ŚRODOWISKOWYCH ---
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", ".env")
load_dotenv(dotenv_path)

# Zmienne SQL
server = os.getenv("SERVER_URL")
database = os.getenv("DB_NAME")
username = os.getenv("DB_USERNAME")
password = os.getenv("DB_USERNAME_PASSWORD")

# Zmienne Blob Storage
storage_conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
container_name = os.getenv("AZURE_CONTAINER_NAME")

# --- 2. KONFIGURACJA BAZY DANYCH (SQL) ---
driver = "ODBC Driver 18 for SQL Server"
connection_string = (
    f"mssql+pyodbc://{username}:{password}@{server}:1433/{database}"
    f"?driver={driver.replace(' ', '+')}&Encrypt=yes&TrustServerCertificate=no"
)

engine = create_engine(connection_string)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ScanMetadata(Base):
    __tablename__ = "Scans"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255))
    upload_date = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, nullable=False) 



Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 3. KONFIGURACJA BLOB STORAGE ---

# Konfiguracja loggera
logger = logging.getLogger(__name__)

class StorageManager:
    def __init__(self, connection_string: str, container_name: str):
        self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        self.container_name = container_name
        logger.info(f"StorageManager zainicjalizowany dla kontenera: {container_name}")

    def upload_file(self, file: UploadFile, filename: str) -> str:
        """Wgrywa plik do Azure i zwraca nazwę bloba."""
        try:
            logger.info(f"Rozpoczęcie uploadu pliku: {filename}")
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, blob=filename
            )
            file.file.seek(0)
            blob_client.upload_blob(file.file, overwrite=True)
            logger.info(f"Plik {filename} został pomyślnie wgrany do Azure Blob Storage")
            return filename
        except Exception as e:
            logger.error(f"Błąd uploadu pliku {filename}: {e}", exc_info=True)
            print(f"Błąd uploadu: {e}")
            raise HTTPException(status_code=500, detail="Błąd zapisu pliku w chmurze")

    def generate_sas_url(self, filename: str) -> str:
        """Generuje bezpieczny link (SAS) ważny przez 1h."""
        try:
            logger.info(f"Generowanie SAS URL dla pliku: {filename}")
            sas_token = generate_blob_sas(
                account_name=self.blob_service_client.account_name,
                container_name=self.container_name,
                blob_name=filename,
                account_key=self.blob_service_client.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(hours=1)
            )
            sas_url = f"https://{self.blob_service_client.account_name}.blob.core.windows.net/{self.container_name}/{filename}?{sas_token}"
            logger.info(f"SAS URL wygenerowany pomyślnie dla pliku: {filename}")
            logger.debug(f"SAS URL: {sas_url}")
            return sas_url
        except Exception as e:
            logger.error(f"Błąd generowania SAS URL dla pliku {filename}: {e}", exc_info=True)
            print(f"Błąd SAS: {e}")
            raise HTTPException(status_code=500, detail="Błąd generowania linku")

def get_storage():
    if not storage_conn_str or not container_name:
        raise HTTPException(status_code=500, detail="Brak konfiguracji Azure Storage w .env")
    return StorageManager(storage_conn_str, container_name)


