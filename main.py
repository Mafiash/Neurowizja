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

def load_nifti_image(path: str) -> np.ndarray:
    if not Path(path).exists():
        raise FileNotFoundError(f"The file {path} does not exist.")
    return nib.load(path).get_fdata()

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


'''
Przykład użycia:

image_data = load_nifti_image("./Task01_BrainTumour/imagesTr/BRATS_001.nii.gz")
slice_data_axial = get_brain_slice(image_data, Plane.AXIAL, slice_index=75, modality=0)
slice_data_coronnal = get_brain_slice(image_data, Plane.CORONAL, slice_index=75, modality=0)
slice_data_sagittal = get_brain_slice(image_data, Plane.SAGITTAL, slice_index=75, modality=0)

img_base64_axial = array_to_base64_png(slice_data_axial)
img_base64_axial_string = img_base64_axial.split(",")[1]
image_data = base64.b64decode(img_base64_axial_string)
image = Image.open(io.BytesIO(image_data))
image.show()

array_to_base64_png służy do konwersji wielowymiarowej tablicy numpy do formaty base64 PNG, 
służy do przesyłania ich przez sieć.
'''
