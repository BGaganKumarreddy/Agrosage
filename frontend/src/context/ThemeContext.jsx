import React, { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = {
  SOIL: 'soil',
  SUNLIT: 'sunlit',
  TERRACOTTA: 'terracotta',
};

const THEME_STORAGE_KEY = 'agrosage_appearance_theme';

const ThemeContext = createContext({
  theme: THEMES.SOIL,
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && Object.values(THEMES).includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage errors
    }
    return THEMES.SOIL;
  });

  const setTheme = (newTheme) => {
    if (Object.values(THEMES).includes(newTheme)) {
      setThemeState(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {
        // Ignore storage errors
      }
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
