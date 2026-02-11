import api from "./api.ts";

const API_BASE_URL = "/files";

// Typy zgodne z backendowymi DTO:

// ScanMetadataDTO z backendu
export interface ScanMetadataDTO {
  scan_id: number;
  filename: string;
  shape: number[];
  voxel_spacing: number[];
  orientation: string;
  modality: string;
}

// ScanResponseDTO z backendu
export interface ScanResponseDTO {
  scan_id: number;
  filename: string;
  sas_url: string;
  expires_at: string;
}

export interface CommentDTO {
  id: number;
  annotation_id: number;
  author_id: number;
  author_name?: string;
  text: string;
  created_at: string;
}

// AnnotationDTO z backendu
export interface AnnotationDTO {
  id: number;
  scan_id: number;
  author_id: number;
  author_name?: string;
  slice_index: number;
  plane: string;
  blob_path: string;
  snapshot_path?: string;
  snapshot_url?: string;
  note_text: string | null;
  points?: number[][];
  viewer_state?: any;
  comments: CommentDTO[];
  created_at: string;
}

// AnnotationCreateDTO z backendu
export interface AnnotationCreateDTO {
  scan_id: number;
  slice: number;
  plane: string;
  points: number[][];
  note?: string;
  viewer_state?: any;
}

// AnnotationExtendedDTO z backendu
export interface AnnotationExtendedDTO extends AnnotationDTO {
  scan_filename?: string;
}

// BulkImportResponseDTO z backendu
export interface BulkImportResponseDTO {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

// Pomocniczo: odpowiedź z /files/user-scans/
export interface UserScansResponse {
  scans: ScanMetadataDTO[];
}

// =======================
// 1. Upload skanu NIfTI
// =======================
export async function uploadScan(file: File, modality: string = "FLAIR") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("modality", modality);

  const res = await api.post<ScanMetadataDTO>(`${API_BASE_URL}/upload-scan/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

// =======================
// 2. Lista skanów usera
// =======================
export async function getUserScans(): Promise<UserScansResponse> {
  const res = await api.get<UserScansResponse>(`${API_BASE_URL}/user-scans/`);
  return res.data;
}

// =======================
// 3. SAS URL do danego skanu
// =======================
export async function getScanUrl(scanId: number): Promise<ScanResponseDTO> {
  const res = await api.get<ScanResponseDTO>(`${API_BASE_URL}/scan-url/${scanId}`);
  return res.data;
}

// =======================
// 4. Zapis adnotacji (obrysu/notatki)
// =======================
// =======================
// 4. Zapis adnotacji (obrysu/notatki)
// =======================
export async function saveAnnotation(data: AnnotationCreateDTO, screenshot?: Blob | null): Promise<AnnotationDTO> {
  const formData = new FormData();
  formData.append("data_json", JSON.stringify(data));
  if (screenshot) {
    formData.append("screenshot", screenshot, "screenshot.png");
  }

  const res = await api.post<AnnotationDTO>(`${API_BASE_URL}/annotations/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

// =======================
// 5. Pobieranie adnotacji danego skanu
// =======================
export async function getScanAnnotations(scanId: number): Promise<AnnotationDTO[]> {
  const res = await api.get<AnnotationDTO[]>(`${API_BASE_URL}/annotations/${scanId}`);
  return res.data;
}

// =======================
// 6. Usuwanie adnotacji (Tylko Admin)
// =======================
export async function deleteAnnotation(annId: number): Promise<{ message: string }> {
  const res = await api.delete<{ message: string }>(`${API_BASE_URL}/annotations/${annId}`);
  return res.data;
}

// =======================
// 7. Generowanie obrysu
// =======================
export async function generateOutline(scanId: number, sliceIdx: number, plane: string): Promise<AnnotationDTO> {
  const res = await api.post<AnnotationDTO>(`${API_BASE_URL}/scans/${scanId}/generate-outline`, null, {
    params: { slice_idx: sliceIdx, plane },
  });
  return res.data;
}
// =======================
// 8. Pobieranie WSZYSTKICH adnotacji
// =======================
export async function getAllAnnotations(): Promise<AnnotationExtendedDTO[]> {
  const res = await api.get<AnnotationExtendedDTO[]>(`${API_BASE_URL}/annotations/`);
  return res.data;
}

// =======================
// 9. Bulk Upload adnotacji
// =======================
export async function bulkUploadAnnotations(data: AnnotationCreateDTO[]): Promise<BulkImportResponseDTO> {
  const res = await api.post<BulkImportResponseDTO>(`${API_BASE_URL}/annotations/bulk/`, data);
  return res.data;
}

// =======================
// 10. Dodawanie komentarza do adnotacji
// =======================
export async function addComment(annId: number, text: string): Promise<CommentDTO> {
  const res = await api.post<CommentDTO>(`${API_BASE_URL}/annotations/${annId}/comments/`, { text });
  return res.data;
}
