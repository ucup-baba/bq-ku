'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type GenderTheme = 'IKHWAN' | 'AKHWAT';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  genderTheme: GenderTheme;
  setGenderTheme: (gender: GenderTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function getGenderThemeColors(genderTheme: GenderTheme, isDark: boolean): string {
  if (genderTheme === 'IKHWAN') {
    return isDark 
      ? 'bg-gradient-to-r from-teal-600 to-lime-500 text-white' 
      : 'bg-gradient-to-r from-emerald-600 to-lime-500 text-white';
  } else {
    return isDark 
      ? 'bg-gradient-to-r from-teal-500 to-rose-400 text-white' 
      : 'bg-gradient-to-r from-teal-500 to-rose-400 text-white';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [genderTheme, setGenderThemeState] = useState<GenderTheme>('IKHWAN');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setThemeState(storedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    }

    const storedGender = localStorage.getItem('genderTheme') as GenderTheme | null;
    if (storedGender) {
      setGenderThemeState(storedGender);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('genderTheme', genderTheme);
    }
  }, [genderTheme, mounted]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setGenderTheme = (newGender: GenderTheme) => {
    setGenderThemeState(newGender);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, genderTheme, setGenderTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
