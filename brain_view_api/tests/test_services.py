import pytest
import numpy as np
import nibabel as nib
import io
from brain_view_api.services.outline_service import generate_brain_outline

def create_structured_mock_nifti():
    # Create a 10x10x10 cube with a 6x6x6 "brain" in the middle
    data = np.zeros((10, 10, 10), dtype=np.float32)
    data[2:8, 2:8, 2:8] = 100.0
    img = nib.Nifti1Image(data, np.eye(4))
    fh = io.BytesIO()
    img.to_stream(fh)
    return fh.getvalue()

def test_generate_brain_outline_axial():
    nifti_bytes = create_structured_mock_nifti()
    points = generate_brain_outline(nifti_bytes, 5, "axial")
    
    # Check if we got some points
    assert len(points) > 0
    # The points should be around the 2:8 range
    for p in points:
        assert 1.0 <= p[0] <= 9.0
        assert 1.0 <= p[1] <= 9.0

def test_generate_brain_outline_planes():
    nifti_bytes = create_structured_mock_nifti()
    
    points_axial = generate_brain_outline(nifti_bytes, 5, "axial")
    points_coronal = generate_brain_outline(nifti_bytes, 5, "coronal")
    points_sagittal = generate_brain_outline(nifti_bytes, 5, "sagittal")
    
    assert len(points_axial) > 0
    assert len(points_coronal) > 0
    assert len(points_sagittal) > 0
