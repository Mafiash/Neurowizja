import numpy as np
import nibabel as nib
import io
import json

def generate_brain_outline(nifti_bytes: bytes, slice_idx: int, plane: str):
    """
    Generuje punkty obrysu dla danego przekroju przy użyciu prostego progowania.
    """
    # Załadowanie obrazu z bajtów
    fh = nib.FileHolder(fileobj=io.BytesIO(nifti_bytes))
    img = nib.Nifti1Image.from_file_map({'header': fh, 'image': fh})
    data = img.get_fdata()

    # Wybór odpowiedniego przekroju
    if plane in ["axial", "poprzeczna"]:
        slice_data = data[:, :, slice_idx]
    elif plane in ["coronal", "czolowa"]:
        slice_data = data[:, slice_idx, :]
    elif plane in ["sagittal", "strzalkowa"]:
        slice_data = data[slice_idx, :, :]
    else:
        # domyślnie axial
        slice_data = data[:, :, slice_idx]

    # Proste progowanie (Otsu lub stały próg)
    # Dla MRI mózgu często tło jest bliskie 0
    threshold = np.mean(slice_data) * 0.5
    binary = slice_data > threshold

    # Znajdowanie konturów (uproszczone - punkty krawędziowe)
    # W rzeczywistym systemie użylibyśmy skimage.measure.find_contours
    # Tutaj zrobimy prostą implementację punktów brzegowych
    points = []
    rows, cols = binary.shape
    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            if binary[r, c]:
                # Jeśli którykolwiek sąsiad jest tłem, to jest to krawędź
                if not (binary[r-1, c] and binary[r+1, c] and binary[r, c-1] and binary[r, c+1]):
                    points.append([float(c), float(r)])

    # Uproszczenie punktów (co 5-ty punkt dla wydajności)
    simplified_points = points[::5]
    
    return simplified_points
