import axios from "axios";

const API_BASE_URL = "/files"; // Adjust if your backend is on a different path

// ...existing code...

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

// Pomocniczo: odpowiedź z /files/user-scans/
export interface UserScansResponse {
  scans: ScanMetadataDTO[];
}

// pobieranie tokena JWT (np. z localStorage)
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

// =======================
// 1. Upload skanu NIfTI
// =======================
export async function uploadScan(file: File, modality: string = "FLAIR") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("modality", modality);

  const res = await axios.post<ScanMetadataDTO>(
    `${API_BASE_URL}/upload-scan/`,
    formData,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
}

// =======================
// 2. Lista skanów usera
// =======================
export async function getUserScans(): Promise<UserScansResponse> {
  console.log("a", `${API_BASE_URL}/user-scans/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  const res = await axios.get<UserScansResponse>(
    `${API_BASE_URL}/user-scans/`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
  return res.data;
}

// =======================
// 3. SAS URL do danego skanu
// =======================
export async function getScanUrl(scanId: number): Promise<ScanResponseDTO> {
  const res = await axios.get<ScanResponseDTO>(
    `${API_BASE_URL}/scan-url/${scanId}`,
    {
      headers: {
        ...getAuthHeaders(),
      },
    }
  );
  return res.data;
}
