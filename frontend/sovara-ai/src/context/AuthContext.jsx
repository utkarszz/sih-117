import { createContext, useContext, useEffect, useState } from "react";
import {
  authAPI,
  getToken,
  setToken,
  clearToken,
  getUser,
  setUser,
  clearUser,
  projectsAPI,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, _setUser] = useState(() => getUser());
  const [token, _setToken] = useState(() => getToken());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active project for project-scoped API calls
  const [activeProject, setActiveProject] = useState(null);

  // Persist helpers
  function persistAuth(userData, tokenValue) {
    setToken(tokenValue);
    setUser(userData);
    _setToken(tokenValue);
    _setUser(userData);
  }

  function logout() {
    clearToken();
    clearUser();
    _setToken(null);
    _setUser(null);
    setActiveProject(null);
  }

  async function login(email, password) {
    setError(null);
    try {
      const res = await authAPI.login(email, password);
      if (res.success && res.data) {
        persistAuth(res.data.user, res.data.token);

        // Fetch user projects for project-scoped actions
        try {
          const projRes = await projectsAPI.list();
          const projects = projRes.data?.projects || projRes.data || [];
          if (projects.length > 0) setActiveProject(projects[0]);
        } catch (pErr) {
          console.warn("[AuthContext] Projects fetch warning:", pErr.message);
        }
        return res.data;
      } else {
        throw new Error(res.message || "Login failed");
      }
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    }
  }

  // Check auth state on mount
  useEffect(() => {
    async function checkAuth() {
      const existingToken = getToken();
      if (existingToken) {
        try {
          const res = await projectsAPI.list();
          if (res.success) {
            const projects = res.data?.projects || res.data || [];
            if (projects.length > 0) setActiveProject(projects[0]);
            setLoading(false);
            return;
          }
        } catch {
          // Token expired or invalid
          clearToken();
          clearUser();
          _setToken(null);
          _setUser(null);
        }
      }
      setLoading(false);
    }

    checkAuth();
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    setError,
    activeProject,
    setActiveProject,
    login,
    logout,
    isAdmin: user?.role === "ADMIN",
    isSupervisor: user?.role === "SUPERVISOR",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

