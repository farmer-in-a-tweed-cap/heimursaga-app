'use client';

import { ThemeProvider } from '@/contexts';

type Props = {
  children: React.ReactNode;
};

export function ThemeProviderWrapper({ children }: Props) {
  return <ThemeProvider defaultTheme="light">{children}</ThemeProvider>;
}
