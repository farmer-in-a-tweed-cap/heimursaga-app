'use client';

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

type ThemeSetting = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ResolvedTheme;
  themeSetting: ThemeSetting;
  toggleTheme: () => void;
  setTheme: (theme: ThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeSetting, setThemeSetting] = useState<ThemeSetting>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('heimursaga-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeSetting === 'system') return systemTheme;
    return themeSetting;
  }, [themeSetting, systemTheme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('heimursaga-theme', themeSetting);
  }, [resolvedTheme, themeSetting]);

  const toggleTheme = () => {
    setThemeSetting(prev => {
      if (prev === 'system') return 'dark';
      return prev === 'light' ? 'dark' : 'light';
    });
  };

  const setTheme = (newTheme: ThemeSetting) => {
    setThemeSetting(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, themeSetting, toggleTheme, setTheme }}>
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
