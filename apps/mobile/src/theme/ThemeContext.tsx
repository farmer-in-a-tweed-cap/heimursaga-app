import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { surfaces, type ThemeMode, type SurfaceColors } from './tokens';

const THEME_PREF_KEY = 'heimursaga_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  dark: boolean;
  colors: SurfaceColors;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<ThemeMode | null>(null);

  // Restore persisted theme preference on mount
  useEffect(() => {
    SecureStore.getItemAsync(THEME_PREF_KEY)
      .then((val) => {
        if (val === 'light' || val === 'dark') setOverride(val);
      })
      .catch(() => {});
  }, []);

  const mode: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const dark = mode === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      dark,
      colors: surfaces[mode],
      toggleMode: () =>
        setOverride((prev) => {
          const next = (() => {
            if (prev === null) return systemScheme === 'dark' ? 'light' : 'dark';
            return prev === 'dark' ? 'light' : 'dark';
          })();
          SecureStore.setItemAsync(THEME_PREF_KEY, next).catch(() => {});
          return next;
        }),
    }),
    [mode, dark, systemScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
