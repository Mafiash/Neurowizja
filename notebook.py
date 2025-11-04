import nibabel as nib
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from nilearn import plotting

path = Path(__file__).parent.resolve() / "Task01_BrainTumour"

# for directory in path.iterdir():
#     if directory.is_dir():
#         nii_files = list(directory.glob("*.nii.gz"))
#         for nii_file in nii_files:
#             img = nib.load(nii_file)
#             data = img.get_fdata()
#             print(data.shape)

'''
W danych BRATS zazwyczaj mamy 4 modality:
T1 - T1-weighted MRI (standardowy obraz anatomiczny)
T1c (T1ce) - T1-weighted with contrast enhancement (po kontraście, lepiej pokazuje guzy)
T2 - T2-weighted MRI (lepiej widoczny obrzęk)
FLAIR - Fluid Attenuated Inversion Recovery (tłumi sygnał płynu mózgowo-rdzeniowego)
Każda modality pokazuje te same struktury mózgu, 
ale w różny sposób - różne tkanki i patologie są lepiej widoczne w różnych sekwencjach MRI

modality = 0  # wybierasz pierwszą modalność (np. T1)
data[:, :, slice_idx, modality]  # [szerokość, wysokość, który przekrój, który typ MRI]

"modality": { 
	 "0": "FLAIR", 
	 "1": "T1w", 
	 "2": "t1gd",
	 "3": "T2w"
}

"labels": { 
	 "0": "background", 
	 "1": "edema",
	 "2": "non-enhancing tumor",
	 "3": "enhancing tumour"
}
'''

# Wczytanie obrazów NIfTI
imageTr = nib.load("./Task01_BrainTumour/imagesTr/BRATS_001.nii.gz")  # Obraz MRI
labelTr = nib.load("./Task01_BrainTumour/labelsTr/BRATS_001.nii.gz")  # maska segmentacji

# Konwersja do NumPy arrays
image_data = imageTr.get_fdata()  # (240, 240, 155, 4) - [x, y, z, modality]
label_data = labelTr.get_fdata()  # (240, 240, 155) - [x, y, z]

print(f"Rozmiar obrazu: {image_data.shape}")  # [szerokość, wysokość, głębokość, modalność]
print(f"Rozmiar labeli: {label_data.shape}")
print("==============")
print(f"Spacing (voxel size): {imageTr.header.get_zooms()}")
print(f"Data type: {imageTr.header.get_data_dtype()}")
print(f"Affine matrix:\n{imageTr.affine}")
print("==============")
print(f"Unikalne wartości w labelach: {np.unique(label_data)}")

slice_idx = 77

fig, axes = plt.subplots(1, 5, figsize=(20, 4))

# nibabel zachowuje kolejność (x, y, z, modality)
# Używamy .T (transpozycja) i origin='lower' dla poprawnej orientacji anatomicznej
for i in range(4):
    slice_image = image_data[:, :, slice_idx, i]  # nibabel: [x, y, z, modality]
    axes[i].imshow(slice_image.T, cmap='gray', origin='lower')
    axes[i].set_title(['FLAIR', 'T1w', 'T1gd', 'T2w'][i])
    axes[i].set_xlabel('X (Lewo-Prawo)')
    axes[i].set_ylabel('Y (Tył-Przód)')
    axes[i].text(0.02, 0.98, f'Płaszczyzna osiowa\nZ = {slice_idx}',
                 transform=axes[i].transAxes, fontsize=8,
                 verticalalignment='top', bbox=dict(boxstyle='round',
                 facecolor='white', alpha=0.7))

# Label nie ma wymiaru modalności
label_slice = label_data[:, :, slice_idx]  # nibabel: [x, y, z]
im = axes[4].imshow(label_slice.T, cmap='tab10', origin='lower')
axes[4].set_title('Segmentacja (Label)')
axes[4].set_xlabel('X (Lewo-Prawo)')
axes[4].set_ylabel('Y (Tył-Przód)')
axes[4].text(0.02, 0.98, f'Płaszczyzna osiowa\nZ = {slice_idx}',
             transform=axes[4].transAxes, fontsize=8,
             verticalalignment='top', bbox=dict(boxstyle='round',
             facecolor='white', alpha=0.7))

# Dodanie legendy dla kolorów w segmentacji
from matplotlib.patches import Patch
legend_elements = [
    Patch(facecolor='tab:blue', label='0: Background'),
    Patch(facecolor='tab:orange', label='1: Edema'),
    Patch(facecolor='tab:green', label='2: Non-enhancing tumor'),
    Patch(facecolor='tab:red', label='3: Enhancing tumor')
]
axes[4].legend(handles=legend_elements, loc='lower right', fontsize=8)

plt.tight_layout()
plt.show()

# ============================================
# PRZYGOTOWANIE DANYCH 3D
# ============================================
# Obraz imageTr ma 4 wymiary (4 modalności), ale nilearn potrzebuje obrazów 3D
# Wyodrębniamy poszczególne modalności jako osobne obrazy 3D

# Tworzymy obraz 3D dla każdej modalności
from nilearn.image import index_img

# Wyodrębnienie poszczególnych modalności (0=FLAIR, 1=T1w, 2=T1gd, 3=T2w)
flair_img = index_img(imageTr, 0)  # FLAIR
t1w_img = index_img(imageTr, 1)    # T1w
t1gd_img = index_img(imageTr, 2)   # T1gd (z kontrastem)
t2w_img = index_img(imageTr, 3)    # T2w

# Dla wizualizacji używamy głównie FLAIR (najczęściej używana do guzów)
# i T1gd (z kontrastem - najlepiej pokazuje aktywną część guza)

# ============================================
# WIZUALIZACJA 3D - Renderowanie powierzchniowe
# ============================================

# 1. Wizualizacja obrazu MRI w 3 płaszczyznach (ortogonalnych) - wszystkie modalności
fig, axes = plt.subplots(2, 2, figsize=(16, 16))

modalities = [
    (flair_img, 'FLAIR'),
    (t1w_img, 'T1w'),
    (t1gd_img, 'T1gd (z kontrastem)'),
    (t2w_img, 'T2w')
]

for idx, (img, nazwa) in enumerate(modalities):
    row = idx // 2
    col = idx % 2
    plotting.plot_anat(
        img,
        cut_coords=(0, 0, slice_idx),
        title=f'MRI - {nazwa} (ortho)',
        display_mode='ortho',
        dim=-1,
        cmap='gray',
        axes=axes[row, col],
        annotate=False
    )

plt.tight_layout()
plt.show()

# 2. Wizualizacja maski segmentacji nałożonej na obraz MRI (T1gd - z kontrastem)
print("\n2. Renderowanie segmentacji na tle MRI (T1gd)...")
fig = plt.figure(figsize=(16, 5))

display2 = plotting.plot_roi(
    labelTr,
    bg_img=t1gd_img,  # Używamy T1gd bo najlepiej pokazuje guzy
    title='Segmentacja guza na tle T1gd (z kontrastem) - widok ortogonalny',
    display_mode='ortho',
    cut_coords=(0, 0, slice_idx),
    cmap='Paired',
    alpha=0.6,
    figure=fig
)

plt.show()

# 3. Porównanie segmentacji na FLAIR i T1gd
print("\n3. Porównanie segmentacji na różnych modalościach...")
fig, axes = plt.subplots(1, 2, figsize=(20, 6))

plotting.plot_roi(
    labelTr,
    bg_img=flair_img,
    title='Segmentacja na FLAIR',
    display_mode='ortho',
    cut_coords=(0, 0, slice_idx),
    cmap='hot',
    alpha=0.7,
    axes=axes[0],
    annotate=False
)

plotting.plot_roi(
    labelTr,
    bg_img=t1gd_img,
    title='Segmentacja na T1gd (z kontrastem)',
    display_mode='ortho',
    cut_coords=(0, 0, slice_idx),
    cmap='hot',
    alpha=0.7,
    axes=axes[1],
    annotate=False
)

plt.tight_layout()
plt.show()

# 4. Wizualizacja szkieletowa (mosaic) - wiele przekrojów
print("\n4. Renderowanie mozaiki przekrojów (FLAIR)...")
fig = plt.figure(figsize=(15, 10))

display4 = plotting.plot_anat(
    flair_img,
    display_mode='mosaic',
    title='Mozaika przekrojów MRI - FLAIR',
    cmap='gray',
    figure=fig
)

plt.show()

# 5. Wizualizacja w różnych pojedynczych płaszczyznach
print("\n5. Renderowanie w różnych płaszczyznach (x, y, z)...")
fig, axes_views = plt.subplots(1, 3, figsize=(18, 5))

# Widok strzałkowy (sagittal) - X
plotting.plot_roi(
    labelTr,
    bg_img=flair_img,
    title='Przekrój strzałkowy (Sagittal - X)',
    display_mode='x',
    cut_coords=5,
    cmap='hot',
    alpha=0.7,
    axes=axes_views[0],
    annotate=False
)

# Widok czołowy (coronal) - Y
plotting.plot_roi(
    labelTr,
    bg_img=flair_img,
    title='Przekrój czołowy (Coronal - Y)',
    display_mode='y',
    cut_coords=5,
    cmap='hot',
    alpha=0.7,
    axes=axes_views[1],
    annotate=False
)

# Widok osiowy (axial) - Z
plotting.plot_roi(
    labelTr,
    bg_img=flair_img,
    title='Przekrój osiowy (Axial - Z)',
    display_mode='z',
    cut_coords=5,
    cmap='hot',
    alpha=0.7,
    axes=axes_views[2],
    annotate=False
)

plt.tight_layout()
plt.show()

# INTERAKTYWNA WIZUALIZACJA 3D (w przeglądarce)
# trzy rzuty na raz
# ============================================
# ============================================

# Interaktywny widok obrazu MRI - FLAIR
view_flair = plotting.view_img(
    flair_img,
    bg_img=None,
    title='Interaktywny widok 3D - MRI FLAIR',
    cmap='gray',
    symmetric_cmap=False,
    threshold=None
)

output_path_flair = Path(__file__).parent.resolve() / "mri_flair_3d_view.html"
view_flair.save_as_html(str(output_path_flair))

# Interaktywny widok obrazu MRI - T1gd (z kontrastem)
view_t1gd = plotting.view_img(
    t1gd_img,
    bg_img=None,
    title='Interaktywny widok 3D - MRI T1gd (z kontrastem)',
    cmap='gray',
    symmetric_cmap=False,
    threshold=None
)

output_path_t1gd = Path(__file__).parent.resolve() / "mri_t1gd_3d_view.html"
view_t1gd.save_as_html(str(output_path_t1gd))

view_roi_flair = plotting.view_img(
    labelTr,
    bg_img=flair_img,
    title='Interaktywny widok 3D - Segmentacja na FLAIR',
    cmap='Paired',
    symmetric_cmap=False,
    opacity=0.6,
    threshold=0.5
)

output_path_roi_flair = Path(__file__).parent.resolve() / "segmentation_flair_3d_view.html"
view_roi_flair.save_as_html(str(output_path_roi_flair))

# Interaktywny widok segmentacji na tle T1gd
view_roi_t1gd = plotting.view_img(
    labelTr,
    bg_img=t1gd_img,
    title='Interaktywny widok 3D - Segmentacja na T1gd',
    cmap='Paired',
    symmetric_cmap=False,
    opacity=0.6,
    threshold=0.5
)

output_path_roi_t1gd = Path(__file__).parent.resolve() / "segmentation_t1gd_3d_view.html"
view_roi_t1gd.save_as_html(str(output_path_roi_t1gd))

