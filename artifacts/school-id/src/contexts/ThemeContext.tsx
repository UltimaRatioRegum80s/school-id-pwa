import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Theme = "light" | "dim" | "dark";

export const THEMES: Theme[] = ["light", "dim", "dark"];

const STORAGE_KEY = "school-id-theme";

function readStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === "light" || t === "dim" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  return "light";
}

function applyThemeClass(theme: Theme) {
  const classList = document.documentElement.classList;
  classList.remove("light", "dim", "dark");
  if (theme === "dim") classList.add("dim");
  else if (theme === "dark") classList.add("dark");
  // "light" uses the base :root tokens, no class needed
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const persist = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      persist(next);
    },
    [persist]
  );

  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = THEMES[(THEMES.indexOf(prev) + 1) % THEMES.length];
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
