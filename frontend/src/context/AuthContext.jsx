import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  logout as logoutAPI,
} from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function refreshUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }

  async function logout() {
    await logoutAPI();
    setUser(null);
  }

  useEffect(() => {
    refreshUser().finally(() => {
      setAuthLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        logout,
        refreshUser,
        authLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}