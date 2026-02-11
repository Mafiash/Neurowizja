import pytest
import nibabel as nib
import numpy as np
import io
from brain_view_api.services.nifti_and_storage import NiftiValidator

def create_mock_nifti():
    data = np.zeros((10, 10, 10), dtype=np.int16)
    img = nib.Nifti1Image(data, np.eye(4))
    fh = io.BytesIO()
    img.to_stream(fh)
    return fh.getvalue()

def test_validate_header_success():
    validator = NiftiValidator()
    nifti_bytes = create_mock_nifti()
    # Should not raise exception
    validator.validate_header(nifti_bytes)

def test_validate_header_failure():
    validator = NiftiValidator()
    with pytest.raises(ValueError):
        validator.validate_header(b"invalid data")

def test_extract_metadata():
    validator = NiftiValidator()
    nifti_bytes = create_mock_nifti()
    meta = validator.extract_metadata(nifti_bytes)
    
    assert meta["shape"] == [10, 10, 10]
    assert "voxel_spacing" in meta
    assert meta["dtype"] == "int16"
