import SimpleITK as sitk
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

path = Path(__file__).parent.resolve() / "Task01_BrainTumour"

# for directory in path.iterdir():
#     if directory.is_dir():
#         nii_files = list(directory.glob("*.nii.gz"))
#         for nii_file in nii_files:
#             image = sitk.ReadImage(nii_file)
#             array = sitk.GetArrayFromImage(image)
#             print(array.shape)

imageTr = sitk.ReadImage("./Task01_BrainTumour/imagesTr/BRATS_001.nii.gz")
labelTr = sitk.ReadImage("./Task01_BrainTumour/labelsTr/BRATS_001.nii.gz")

array = sitk.GetArrayFromImage(imageTr)
print(array.shape)

'''
    W danych BRATS zazwyczaj mamy 4 modality:
T1 - T1-weighted MRI (standardowy obraz anatomiczny)
T1c (T1ce) - T1-weighted with contrast enhancement (po kontraście, lepiej pokazuje guzy)
T2 - T2-weighted MRI (lepiej widoczny obrzęk)
FLAIR - Fluid Attenuated Inversion Recovery (tłumi sygnał płynu mózgowo-rdzeniowego)
Każda modality pokazuje te same struktury mózgu, 
ale w różny sposób - różne tkanki i patologie są lepiej widoczne w różnych sekwencjach MRI

modality = 0  # wybierasz pierwszą modalność (np. T1)
array[modality, slice_idx, :, :]  # [który typ MRI, który przekrój, wysokość, szerokość]

'''

# If shape is (4, 155, 240, 240) - 4 modalities
if len(array.shape) == 4:
    # Select first modality (T1, T1c, T2, or FLAIR)
    modality = 0  # Change 0-3 to select different modality
    slice_idx = array.shape[1] // 2
    plt.imshow(array[modality, slice_idx, :, :], cmap='gray')
    plt.title(f'Modality {modality}, Slice {slice_idx}')
# If shape is (155, 240, 240) - single channel
else:
    slice_idx = array.shape[0] // 2
    plt.imshow(array[slice_idx, :, :], cmap='gray')
    plt.title(f'Slice {slice_idx}')

plt.show()