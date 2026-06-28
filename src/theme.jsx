import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export const THEME_COLORS = {
  green: { primary: "#6cffbd", secondary: "#72c9ff", glow: "rgba(108,255,189,0.78)" },
  purple: { primary: "#b98cff", secondary: "#ff8ce1", glow: "rgba(185,140,255,0.78)" },
  blue: { primary: "#72c9ff", secondary: "#9af0ff", glow: "rgba(114,201,255,0.78)" },
  orange: { primary: "#ffb472", secondary: "#ff875f", glow: "rgba(255,180,114,0.78)" },
  pink: { primary: "#ff9ac6", secondary: "#c9a0ff", glow: "rgba(255,154,198,0.78)" },
};

const detectMode = () => {
  const stored = window.localStorage?.getItem("mosu-mode");
  if (stored === "light" || stored === "dark") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "light";
  return "dark";
};

const detectColor = () => {
  const stored = window.localStorage?.getItem("mosu-color");
  if (stored && THEME_COLORS[stored]) return stored;
  return "green";
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => detectMode());
  const [color, setColor] = useState(() => detectColor());

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mode = mode;
    root.dataset.color = color;
    window.localStorage?.setItem("mosu-mode", mode);
    window.localStorage?.setItem("mosu-color", color);
  }, [mode, color]);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  const cycleColor = useCallback(() => {
    const keys = Object.keys(THEME_COLORS);
    setColor((c) => {
      const idx = keys.indexOf(c);
      return keys[(idx + 1) % keys.length];
    });
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, toggleMode, color, setColor, cycleColor, colors: THEME_COLORS }),
    [mode, toggleMode, color, cycleColor],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
