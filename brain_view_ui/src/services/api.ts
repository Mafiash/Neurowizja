import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Sesja wygasła lub brak autoryzacji. Przekierowanie do logowania.");
      localStorage.removeItem("token");
      localStorage.removeItem("is_admin");
      localStorage.removeItem("profile_pic_url");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
