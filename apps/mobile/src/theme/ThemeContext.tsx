import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { surfaces, type ThemeMode, type SurfaceColors } from './tokens';

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

  const mode: ThemeMode = override ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const dark = mode === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      dark,
      colors: surfaces[mode],
      toggleMode: () =>
        setOverride((prev) => {
          if (prev === null) return systemScheme === 'dark' ? 'light' : 'dark';
          return prev === 'dark' ? 'light' : 'dark';
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
