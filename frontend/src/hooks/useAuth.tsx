import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "../lib/api";

interface AuthContextType {
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("staff_token")
  );

const login = async (email: string, password: string): Promise<string | null> => {
  const result = await api.auth.login(email, password);
  if (result.error) return result.error;
  if (!result.data) return "Unknown error";
  localStorage.setItem("staff_token", result.data.token);
  setIsLoggedIn(true);
  return null;
};

  const logout = () => {
    localStorage.removeItem("staff_token");
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}