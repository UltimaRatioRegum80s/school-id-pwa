import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("school-id-token")
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("school-id-user");
    return stored ? JSON.parse(stored) : null;
  });

  function login(newToken: string, newUser: User) {
    localStorage.setItem("school-id-token", newToken);
    localStorage.setItem("school-id-user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("school-id-token");
    localStorage.removeItem("school-id-user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token && !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
