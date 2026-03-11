// ─── Brand Colors ───
export const colors = {
  copper: '#ac6d46',
  blue: '#4676ac',
  green: '#598636',
  red: '#994040',
  black: '#202020',
  darkGray: '#616161',
  lightGray: '#b5bcc4',
  white: '#ffffff',
} as const;

// ─── Status Dot Colors ───
export const statusColors = {
  active: colors.copper,
  planned: colors.blue,
  completed: colors.darkGray,
  cancelled: colors.red,
} as const;

// ─── Surface Color Schema ───
export interface SurfaceColors {
  background: string;
  card: string;
  border: string;
  borderThin: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  inputBackground: string;
  statusBar: string;
  mapBackground: string;
}

export type ThemeMode = 'light' | 'dark';

// ─── Dark / Light Surface Colors ───
export const surfaces: Record<ThemeMode, SurfaceColors> = {
  light: {
    background: '#f5f5f5',
    card: colors.white,
    border: colors.black,
    borderThin: '#e5e5e5',
    text: colors.black,
    textSecondary: colors.darkGray,
    textTertiary: colors.lightGray,
    inputBackground: colors.white,
    statusBar: colors.lightGray,
    mapBackground: '#c8d8c0',
  },
  dark: {
    background: '#1a1a1a',
    card: colors.black,
    border: colors.darkGray,
    borderThin: '#3a3a3a',
    text: '#e5e5e5',
    textSecondary: colors.lightGray,
    textTertiary: colors.darkGray,
    inputBackground: '#2a2a2a',
    statusBar: '#3a3a3a',
    mapBackground: '#0d1a26',
  },
};

// ─── Typography ───
export const sans = 'Jost';
export const heading = 'Lora';
export const serif = heading;

// Backward-compatible alias — all existing import sites continue working
export const mono = sans;

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  title: 19,
} as const;

// ─── Spacing ───
export const spacing = {
  xs: 5,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

// ─── Borders ───
export const borders = {
  thick: 2,
  thin: 1,
  radius: 0,
} as const;

// ─── Stats Bar ───
export const statsBarColors = {
  even: { bg: colors.blue, text: colors.blue },
  odd: { bg: colors.copper, text: colors.copper },
} as const;
