import axios from "axios";

// Dynamic API URL resolution:
// 1. Explicit VITE_API_URL if configured during build/deployment
// 2. Direct localhost:8000 if running in local Vite dev mode (port 5173)
// 3. Relative "/api" for Docker Compose / production reverse-proxy (avoiding all CORS issues)
const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
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
