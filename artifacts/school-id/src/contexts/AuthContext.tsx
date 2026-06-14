import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { applyPalette, applyCustomPalette } from "@/lib/palettes";
import { getApiUrl } from "@/lib/api";

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: string;
  createdAt: string;
  schoolId?: number;
  schoolCode?: string;
  schoolName?: string;
  mustChangePassword?: boolean;
}

export interface BrandingInfo {
  logoUrl: string | null;
  colorPalette: string;
  schoolName: string;
  customPrimaryColor: string | null;
  customAccentColor: string | null;
  timezone: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  branding: BrandingInfo | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshBranding: () => Promise<void>;
  isAuthenticated: boolean;
  clearMustChangePassword: () => void;
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
  const [branding, setBranding] = useState<BrandingInfo | null>(() => {
    const stored = localStorage.getItem("school-id-branding");
    return stored ? JSON.parse(stored) : null;
  });
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  const fetchBranding = useCallback(async (currentToken: string): Promise<BrandingInfo | null> => {
    try {
      const res = await fetch(`${getApiUrl()}/school/branding`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
        return null;
      }
      const data: BrandingInfo = await res.json();
      return data;
    } catch {
      return null;
    }
  }, []);

  function applyBranding(data: BrandingInfo) {
    if (data.colorPalette === "custom" && data.customPrimaryColor && data.customAccentColor) {
      applyCustomPalette(data.customPrimaryColor, data.customAccentColor);
    } else {
      applyPalette(data.colorPalette);
    }
  }

  const refreshBranding = useCallback(async () => {
    if (!token) return;
    const data = await fetchBranding(token);
    if (data) {
      setBranding(data);
      localStorage.setItem("school-id-branding", JSON.stringify(data));
      applyBranding(data);
    }
  }, [token, fetchBranding]);

  useEffect(() => {
    if (branding) {
      applyBranding(branding);
    }
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem("school-id-token");
      localStorage.removeItem("school-id-user");
      localStorage.removeItem("school-id-branding");
      setToken(null);
      setUser(null);
      setBranding(null);
      setBrandingLoaded(false);
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    if (token && !brandingLoaded) {
      setBrandingLoaded(true);
      fetchBranding(token).then((data) => {
        if (data) {
          setBranding(data);
          localStorage.setItem("school-id-branding", JSON.stringify(data));
          applyBranding(data);
        }
      });
    }
  }, [token, brandingLoaded, fetchBranding]);

  function login(newToken: string, newUser: User) {
    localStorage.setItem("school-id-token", newToken);
    localStorage.setItem("school-id-user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setBrandingLoaded(false);
  }

  function logout() {
    localStorage.removeItem("school-id-token");
    localStorage.removeItem("school-id-user");
    localStorage.removeItem("school-id-branding");
    setToken(null);
    setUser(null);
    setBranding(null);
    setBrandingLoaded(false);
  }

  function clearMustChangePassword() {
    if (!user) return;
    const updated = { ...user, mustChangePassword: false };
    localStorage.setItem("school-id-user", JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, branding, login, logout, refreshBranding, isAuthenticated: !!token && !!user, clearMustChangePassword }}
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
