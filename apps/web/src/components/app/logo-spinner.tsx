'use client';

import { useState, useEffect } from 'react';
import { cn } from '@repo/ui/lib/utils';
import { useTheme } from '@/contexts';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  color?: 'dark' | 'light';
  className?: string;
};

export const LogoSpinner: React.FC<Props> = ({
  color,
  size = 'sm',
  className
}) => {
  const { resolvedTheme } = useTheme();

  // Get initial theme by checking the dark class on html element
  const [initialTheme, setInitialTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';

    try {
      // Check if dark class is already on html element (set by blocking script)
      const isDark = document.documentElement.classList.contains('dark');
      return isDark ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  });

  // Auto-detect color based on theme if not explicitly provided
  // Use initialTheme if resolvedTheme hasn't loaded yet
  const currentTheme = resolvedTheme || initialTheme;
  const logoColor = color || (currentTheme === 'dark' ? 'light' : 'dark');
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12 lg:w-16 lg:h-16'; // 48px mobile, 64px desktop
      case 'md':
        return 'w-16 h-16 lg:w-20 lg:h-20'; // 64px mobile, 80px desktop
      case 'lg':
        return 'w-20 h-20 lg:w-28 lg:h-28'; // 80px mobile, 112px desktop
      default:
        return 'w-12 h-12 lg:w-16 lg:h-16';
    }
  };

  return (
    <div
      className={cn(
        getSizeClasses(),
        'animate-spin relative',
        className
      )}
      style={{
        animationDuration: '2s',
      }}
    >
      {/* Light logo - show in dark mode */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-sm-light.svg"
        alt=""
        className="absolute inset-0 hidden dark:block"
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'crisp-edges',
        }}
      />
      {/* Dark logo - show in light mode */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-sm-dark.svg"
        alt=""
        className="absolute inset-0 block dark:hidden"
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'crisp-edges',
        }}
      />
    </div>
  );
};