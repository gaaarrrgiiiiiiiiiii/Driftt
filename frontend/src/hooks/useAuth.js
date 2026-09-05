import React, { useState, useEffect, useContext, createContext } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("driftt_token") || null);
  const [userName, setUserName] = useState(localStorage.getItem("driftt_user") || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthChange = () => {
      const currentToken = localStorage.getItem("driftt_token");
      const currentUser = localStorage.getItem("driftt_user");
      setToken(currentToken);
      setUserName(currentUser);
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("auth:logout", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("auth:logout", handleAuthChange);
    };
  }, []);

  const saveAuth = (data) => {
    localStorage.setItem("driftt_token", data.access_token);
    localStorage.setItem("driftt_user", data.user_name);
    setToken(data.access_token);
    setUserName(data.user_name);
    setError(null);
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      saveAuth(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid email or password";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, name, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/register", { email, name, password });
      saveAuth(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/demo-login");
      saveAuth(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Demo login failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("driftt_token");
    localStorage.removeItem("driftt_user");
    setToken(null);
    setUserName(null);
    window.dispatchEvent(new Event("auth:logout"));
    window.location.href = "/login";
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        token,
        userName,
        isAuthenticated: !!token,
        loading,
        error,
        login,
        register,
        demoLogin,
        logout,
      },
    },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    const token = localStorage.getItem("driftt_token") || null;
    const userName = localStorage.getItem("driftt_user") || null;
    return {
      token,
      userName,
      isAuthenticated: !!token,
      loading: false,
      error: null,
      login: async () => {},
      register: async () => {},
      demoLogin: async () => {},
      logout: () => {
        localStorage.removeItem("driftt_token");
        localStorage.removeItem("driftt_user");
        window.dispatchEvent(new Event("auth:logout"));
        window.location.href = "/login";
      },
    };
  }
  return context;
}
