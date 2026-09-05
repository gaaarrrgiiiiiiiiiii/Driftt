import axios from "axios";

// Dynamic API URL resolution:
// 1. Explicit full URL (http:// or https://) if set
// 2. Localhost:8000 if running in local Vite dev mode (port 5173)
// 3. Default: relative "/api" reverse-proxied by Nginx to the backend container
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    return envUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location.port === "5173") {
    return "http://localhost:8000";
  }
  return "/api";
};

const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("driftt_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("driftt_token");
      localStorage.removeItem("driftt_user");
      window.dispatchEvent(new Event("auth:logout"));
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
