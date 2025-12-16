
from brain_view_api.db.database import engine, Base
from brain_view_api.models.user import User  # noqa: F401
from brain_view_api.models.mri_image import MedicalScan, Annotation  # noqa: F401

if __name__ == "__main__":
    print("Tworzenie tabel w bazie na podstawie modeli...")
    Base.metadata.create_all(bind=engine)
    print("Gotowe.")