import axios from "axios";
import { Snackbars } from "../components/Snackbars.tsx";

export const login = async (username: string, password: string) => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    const res = await axios.post("/users/login", { username, password });
    console.log(res);
    localStorage.setItem("token", res.data.access_token);
    handleSnackbarSuccess(res.data.message || "Pomyślnie zalogowano.");
    window.location.href = "/home";
  } catch (err: any) {
    handleSnackbarError(
      err.response?.data?.detail || "Wystąpił błąd podczas logowania."
    );
  }
};
export const logout = async () => {
  const { handleSnackbarError, handleSnackbarSuccess } = Snackbars();
  try {
    await axios.post(
      "/users/logout",
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    handleSnackbarSuccess("Wylogowano pomyślnie.");
    window.location.href = "/login";
  } catch (err: any) {
    handleSnackbarError(
      err.response?.data?.detail || "Wystąpił błąd podczas wylogowania."
    );
  }
};
