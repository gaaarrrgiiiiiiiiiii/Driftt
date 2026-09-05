import axios from "axios";

// Dynamic API URL resolution:
// 1. Explicit VITE_API_URL environment variable if set
// 2. Render cloud production: connect directly to driftt-backend.onrender.com
// 3. Local Vite dev mode: connect to localhost:8000
// 4. Default: relative "/api" for Docker Compose reverse proxy
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://"))) {
    return envUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    if (window.location.hostname.includes("onrender.com")) {
      return "https://driftt-backend.onrender.com";
    }
    if (window.location.port === "5173") {
      return "http://localhost:8000";
    }
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
