import React, { createContext, useContext, useEffect, useState } from "react";

export type SocialTheme =
  | "facebook-dark"
  | "facebook-light"
  | "spotify"
  | "discord"
  | "cyberpunk"
  | "neon-green"
  | "midnight";

interface ThemeContextType {
  theme: SocialTheme;
  setTheme: (theme: SocialTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<SocialTheme>(() => {
    const saved = localStorage.getItem("fb-theme");
    return (saved as SocialTheme) || "facebook-dark";
  });

  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Sync theme to root class names
  useEffect(() => {
    localStorage.setItem("fb-theme", theme);
    const root = document.documentElement;
    
    // Remove all possible theme classes
    const themesList: SocialTheme[] = [
      "facebook-dark",
      "facebook-light",
      "spotify",
      "discord",
      "cyberpunk",
      "neon-green",
      "midnight",
    ];
    
    themesList.forEach((t) => root.classList.remove(t));
    
    // Add current theme class
    root.classList.add(theme);

    // Also support custom dark mode class toggling for general tailwind dark: selectors
    if (theme === "facebook-light") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }
  }, [theme]);

  const setTheme = async (newTheme: SocialTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("fb-theme", newTheme);

    // If there is an active user logged in, persist to db
    if (activeUserId) {
      try {
        const { supabase, isSupabaseConfigured, localDb } = await import("../supabase/client");
        if (isSupabaseConfigured && supabase) {
          await supabase.from("users").update({ theme: newTheme }).eq("uid", activeUserId);
        } else {
          const users = localDb.get<any[]>("users", []);
          const updated = users.map((u) => u.uid === activeUserId ? { ...u, theme: newTheme } : u);
          localDb.set("users", updated);
        }
      } catch (err) {
        console.warn("Failed to persist theme choice to Supabase:", err);
      }
    }
  };

  const toggleTheme = () => {
    const themes: SocialTheme[] = [
      "facebook-dark",
      "facebook-light",
      "spotify",
      "discord",
      "cyberpunk",
      "neon-green",
      "midnight",
    ];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Provide a way to listen or register the active user ID for server-side persistence
  useEffect(() => {
    // Listen for authentication changes or check AuthState to save
    // We can expose registration through an effect or context listeners
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
