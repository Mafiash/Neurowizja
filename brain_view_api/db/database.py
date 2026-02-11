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

print(f"🔍 Startup Config: SERVER={server}, DB={database}, USER={username}")
print(f"🔍 Storage Config: CONTAINER={container_name}, STORAGE_ENV_SET={'Yes' if storage_conn_str else 'No'}")

# --- 2. KONFIGURACJA BAZY DANYCH ---
def create_app_engine():
    import urllib.parse
    driver = "ODBC Driver 18 for SQL Server"
    
    print(f"🔗 Łączenie z SQL: SERVER={server}, DB={database}, USER={username}")
    
    params = urllib.parse.quote_plus(
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={database};"
        f"UID={username};"
        f"PWD={password};"
        "Encrypt=yes;"
        "TrustServerCertificate=yes;"
        "Connection Timeout=30;"
    )
    conn_str = f"mssql+pyodbc:///?odbc_connect={params}"
    
    return create_engine(conn_str, pool_pre_ping=True)



# Globalne zmienne, które zainicjujemy później
_engine = None
_SessionLocal = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_app_engine()
    return _engine

def get_session_local():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal

Base = declarative_base()

def init_db():
    from brain_view_api.models import user, mri_image
    try:
        Base.metadata.create_all(bind=get_engine())
        print("📋 Tabele bazy danych (Users, Sessions, MedicalScans, Annotations) są gotowe.")
    except Exception as e:
        print(f"⚠️ Błąd podczas tworzenia tabel: {e}")

# Inicjalizacja przy imporcie modułu – usunięto automatyczne wywołanie init_db()
# init_db() 

def get_db():
    SessionLocal = get_session_local()
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


