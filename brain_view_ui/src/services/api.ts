import axios from "axios";

// Tworzymy instancję Axios z domyślnym URL i nagłówkami
const api = axios.create({
  baseURL: "https://example.com/api", // Twój backend
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Opcjonalnie: interceptor dla tokena
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // np. JWT w localStorage
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Opcjonalnie: interceptor dla odpowiedzi (globalna obsługa błędów)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("Nieautoryzowany! Przekierowanie do logowania.");
      // np. window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
