"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const docTheme = document.documentElement.getAttribute("data-theme") as Theme;
        if (docTheme === "light" || docTheme === "dark") {
          return docTheme;
        }
        // Fallback to localStorage
        const storedTheme = window.localStorage.getItem("theme") as Theme;
        if (storedTheme === "light" || storedTheme === "dark") {
          return storedTheme;
        }
        // Fallback to system preference
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          return "dark";
        }
      } catch (e) {
        console.error("Failed to read theme from storage/document", e);
      }
    }
    return "light"; // Ultimate fallback
  });

  // Sync theme with html attribute and localStorage
  const toggleTheme = () => {
    const resolvedNext = theme === "light" ? "dark" : "light";
    setTheme(resolvedNext);
    
    if (typeof window !== "undefined") {
      try {
        document.documentElement.setAttribute("data-theme", resolvedNext);
        window.localStorage.setItem("theme", resolvedNext);
      } catch (e) {
        console.error("Failed to save theme choice", e);
      }
    }
  };

  useEffect(() => {
    // Ensure document reflects current state on mount
    if (typeof window !== "undefined") {
      try {
        document.documentElement.setAttribute("data-theme", theme);
      } catch (e) {
        console.error("Failed to sync theme to DOM", e);
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
