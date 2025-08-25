'use client';

import { cn } from '@repo/ui/lib/utils';
import React from 'react';

import { useNavigation } from '@/hooks';

type NavigationLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  replace?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
};

export const NavigationLink: React.FC<NavigationLinkProps> = ({
  href,
  children,
  className,
  disabled = false,
  replace = false,
  onClick,
  style,
}) => {
  const { navigateTo, isNavigating } = useNavigation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (disabled || isNavigating) {
      return;
    }

    if (onClick) {
      onClick();
    }

    navigateTo(href, replace);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      style={style}
      className={cn(
        className,
        (disabled || isNavigating) && 'opacity-60 transition-opacity pointer-events-none'
      )}
    >
      {children}
    </a>
  );
};