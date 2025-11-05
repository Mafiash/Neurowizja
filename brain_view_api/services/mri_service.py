from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import UploadFile

from brain_view_api.models.mri_image import MRIImage


def create_mri_image(
    db: Session,
    user_id: int,
    image_file: UploadFile,
    label_file: Optional[UploadFile] = None
) -> MRIImage:
    """
    Save MRI image (.nii.gz) and optional label to database.

    Args:
        db: Database session
        user_id: User ID
        image_file: Uploaded .nii.gz image file
        label_file: Optional uploaded .nii.gz label file

    Returns:
        Created MRIImage object
    """

    image_content = image_file.file.read()

    label_content = None
    label_filename = None
    if label_file:
        label_content = label_file.file.read()
        label_filename = label_file.filename

    db_image = MRIImage(
        user_id=user_id,
        image=image_content,
        label=label_content,
        image_filename=image_file.filename,
        label_filename=label_filename
    )

    db.add(db_image)
    db.commit()
    db.refresh(db_image)

    return db_image


def get_mri_image_by_id(db: Session, image_id: int) -> Optional[MRIImage]:
    """
    Get MRI image by ID.

    Args:
        db: Database session
        image_id: Image ID

    Returns:
        MRIImage object or None
    """
    return db.query(MRIImage).filter(MRIImage.id == image_id).first()


def get_mri_images_by_user(db: Session, user_id: int) -> List[MRIImage]:
    """
    Get all MRI images for a specific user.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        List of MRIImage objects
    """
    return db.query(MRIImage).filter(MRIImage.user_id == user_id).all()



def delete_mri_image(db: Session, image_id: int) -> bool:
    """
    Delete MRI image by ID.

    Args:
        db: Database session
        image_id: Image ID

    Returns:
        True if deleted, False if not found
    """
    db_image = get_mri_image_by_id(db, image_id)
    if db_image:
        db.delete(db_image)
        db.commit()
        return True
    return False


def update_mri_image_label(db: Session, image_id: int, label_file: UploadFile) -> Optional[MRIImage]:
    """
    Update label file for MRI image.

    Args:
        db: Database session
        image_id: Image ID
        label_file: New label .nii.gz file

    Returns:
        Updated MRIImage object or None
    """
    db_image = get_mri_image_by_id(db, image_id)
    if db_image:
        label_content = label_file.file.read()
        db_image.label = label_content
        db_image.label_filename = label_file.filename
        db.commit()
        db.refresh(db_image)
        return db_image
    return None


def get_mri_image_nifti(db: Session, image_id: int) -> Optional[bytes]:
    """
    Get nifti format of MRI image.

    Args:
        db: Database session
        image_id: Image ID

    Returns:
        nifti data
    """
    db_image = get_mri_image_by_id(db, image_id)
    if db_image:
        return db_image.image
    return None


def get_mri_label_nifti(db: Session, image_id: int) -> Optional[bytes]:
    """
    Get nifti format of MRI label.

    Args:
        db: Database session
        image_id: Image ID

    Returns:
        nifti data
    """
    db_image = get_mri_image_by_id(db, image_id)
    if db_image:
        return db_image.label
    return None



