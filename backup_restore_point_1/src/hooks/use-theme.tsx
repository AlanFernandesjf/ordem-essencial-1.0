import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

type ColorTheme = {
  name: string;
  primary: string;
  accent: string;
};

export const colorThemes: ColorTheme[] = [
  { name: "Verde Salvia", primary: "158 35% 45%", accent: "350 70% 60%" },
  { name: "Azul Oceano", primary: "210 80% 50%", accent: "45 90% 55%" },
  { name: "Roxo Lavanda", primary: "270 60% 55%", accent: "340 80% 60%" },
  { name: "Rosa Coral", primary: "350 70% 55%", accent: "210 80% 55%" },
  { name: "Laranja Sunset", primary: "25 90% 55%", accent: "270 60% 55%" },
  { name: "Teal Moderno", primary: "175 60% 45%", accent: "350 70% 60%" },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("colorTheme");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return colorThemes[0];
        }
      }
    }
    return colorThemes[0];
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty("--primary", colorTheme.primary);
    root.style.setProperty("--accent", colorTheme.accent);
    
    // Update related colors
    const [h, s, l] = colorTheme.primary.split(" ");
    root.style.setProperty("--primary-light", `${h} ${s} ${theme === "dark" ? "20%" : "92%"}`);
    root.style.setProperty("--ring", colorTheme.primary);
    root.style.setProperty("--sidebar-primary", colorTheme.primary);
    root.style.setProperty("--sidebar-ring", colorTheme.primary);
    
    const [ah, as, al] = colorTheme.accent.split(" ");
    root.style.setProperty("--accent-light", `${ah} ${as} ${theme === "dark" ? "20%" : "95%"}`);
    
    localStorage.setItem("colorTheme", JSON.stringify(colorTheme));
  }, [colorTheme, theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setColorTheme = (newColorTheme: ColorTheme) => {
    setColorThemeState(newColorTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
