import axios from "axios";

const API_BASE_URL = "/api"; // Adjust if your backend is on a different path

export async function fetchUserFiles(token: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/files/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data; // Expecting an array of files or file metadata
  } catch (error: any) {
    throw (
      error.response?.data || {
        message: "Błąd podczas pobierania plików użytkownika.",
      }
    );
  }
}
