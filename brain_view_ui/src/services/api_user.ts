import api from "./api.ts";
import { Snackbars } from "../components/Snackbars.tsx";

export const login = async (username: string, password: string) => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    const res = await api.post("/users/login", { username, password });
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("is_admin", res.data.is_admin ? "true" : "false");
    if (res.data.profile_pic_url) {
      localStorage.setItem("profile_pic_url", res.data.profile_pic_url);
    } else {
      localStorage.removeItem("profile_pic_url");
    }
    handleSnackbarSuccess(res.data.message || "Pomyślnie zalogowano.");
    window.location.href = "/home";
  } catch (err: any) {
    handleSnackbarError(err.response?.data?.detail || "Wystąpił błąd podczas logowania.");
  }
};

export const logout = async () => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    await api.post("/users/logout", {});
    localStorage.removeItem("token");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("profile_pic_url");
    handleSnackbarSuccess("Wylogowano pomyślnie.");
    window.location.href = "/login";
  } catch (err: any) {
    handleSnackbarError(err.response?.data?.detail || "Wystąpił błąd podczas wylogowania.");
    // Even if logout fails on server, we should clear local state
    localStorage.removeItem("token");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("profile_pic_url");
    window.location.href = "/login";
  }
};

export const listUsers = async () => {
  try {
    const res = await api.get("/users/list");
    return res.data;
  } catch (err: any) {
    console.error("Błąd pobierania listy użytkowników:", err);
    return [];
  }
};

export const createUser = async (username: string, password: string) => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    const res = await api.post("/users/register", { username, password });
    handleSnackbarSuccess(res.data.message || "Użytkownik został stworzony.");
    return true;
  } catch (err: any) {
    handleSnackbarError(err.response?.data?.detail || "Wystąpił błąd podczas tworzenia użytkownika.");
    return false;
  }
};

export const promoteUser = async (userId: number) => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    await api.post(`/users/promote/${userId}`, {});
    handleSnackbarSuccess("Użytkownik został awansowany na administratora.");
    return true;
  } catch (err: any) {
    handleSnackbarError(err.response?.data?.detail || "Wystąpił błąd podczas nadawania uprawnień.");
    return false;
  }
};

export const deleteUser = async (userId: number) => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    const res = await api.delete(`/users/${userId}`);
    handleSnackbarSuccess(res.data.message || "Użytkownik został usunięty.");
    return true;
  } catch (err: any) {
    handleSnackbarError(err.response?.data?.detail || "Wystąpił błąd podczas usuwania użytkownika.");
    return false;
  }
};

export const resetUserPassword = async (userId: number, newPassword: string) => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    const res = await api.put(`/users/reset-password/${userId}`, { new_password: newPassword });
    handleSnackbarSuccess(res.data.message || "Hasło zostało zmienione.");
    return true;
  } catch (err: any) {
    handleSnackbarError(err.response?.data?.detail || "Wystąpił błąd podczas zmiany hasła.");
    return false;
  }
};

export const uploadProfilePicture = async (file: File) => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post("/users/profile-picture", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    localStorage.setItem("profile_pic_url", res.data.url);
    handleSnackbarSuccess("Zdjęcie profilowe zaktualizowane.");
    return res.data.url;
  } catch (err: any) {
    handleSnackbarError(err.response?.data?.detail || "Błąd podczas przesyłania zdjęcia.");
    return null;
  }
};
