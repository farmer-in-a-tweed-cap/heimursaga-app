'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/app/context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#121212] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] flex items-center gap-2"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <>
          <Moon className="w-4 h-4 text-[#202020]" />
          <span className="text-xs font-bold hidden sm:inline text-[#202020]">DARK</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-[#e5e5e5]" />
          <span className="text-xs font-bold hidden sm:inline text-[#e5e5e5]">LIGHT</span>
        </>
      )}
    </button>
  );
}