import io
from enum import Enum
from PIL import Image
import nibabel as nib
import numpy as np
from pathlib import Path
import base64

class Plane(Enum):
    SAGITTAL = 0
    CORONAL = 1
    AXIAL = 2

# def load_nifti_image(path: str) -> np.ndarray:
#     if not Path(path).exists():
#         raise FileNotFoundError(f"The file {path} does not exist.")
#     return nib.load(path).get_fdata()

def load_nifti_image(nifti_bytes: bytes) -> np.ndarray:
    """
    Load NIfTI image from bytes and return as numpy array.

    Args:
        nifti_bytes: Binary data of .nii.gz file

    Returns:
        4D numpy array of image data

    Raises:
        ValueError: If bytes are empty or invalid NIfTI format
    """
    if not nifti_bytes:
        raise ValueError("Empty NIfTI data provided")

    try:
        nifti_img = nib.Nifti1Image.from_bytes(nifti_bytes)
        return nifti_img.get_fdata()
    except Exception as e:
        raise ValueError(f"Failed to load NIfTI image: {str(e)}")

def array_to_base64_png(array: np.ndarray) -> str:
    normalized = ((array - array.min()) / (array.max() - array.min()) * 255)
    img_array = normalized.astype(np.uint8)
    img = Image.fromarray(img_array, mode="L")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_base64}"

def get_brain_slice(image: np.ndarray, plane: Plane, slice_index: int, modality: int) -> np.ndarray:
    if plane == Plane.SAGITTAL:
        return image[slice_index, :, :, modality]
    elif plane == Plane.CORONAL:
        return image[:, slice_index, :, modality]
    elif plane == Plane.AXIAL:
        return image[:, :, slice_index, modality]
    else:
        raise ValueError("Invalid plane specified.")

def get_all_slices_for_plane(image: np.ndarray, plane: Plane, modality: int) -> list[dict]:
    """
    Returns a list of dictionaries with base64 PNG images for each slice.

    Args:
        image: 4D numpy array (x, y, z, modality)
        plane: Plane (SAGITTAL, CORONAL, AXIAL)
        modality: modality index

    Returns:
        List of dictionaries with slice index and base64 PNG image.
    """
    if plane == Plane.SAGITTAL:
        num_slices = image.shape[0]
    elif plane == Plane.CORONAL:
        num_slices = image.shape[1]
    elif plane == Plane.AXIAL:
        num_slices = image.shape[2]
    else:
        raise ValueError("Invalid plane specified.")

    slices = []
    for i in range(num_slices):
        slice_data = get_brain_slice(image, plane, i, modality)
        img_base64 = array_to_base64_png(slice_data)
        slices.append({
            "index": i,
            "image_base64": img_base64
        })

    return slices

