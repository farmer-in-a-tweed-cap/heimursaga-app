'use client';

import Link from 'next/link';
import { ComponentProps, useState } from 'react';
import { cn } from '@repo/ui/lib/utils';

interface EnhancedLinkProps extends ComponentProps<typeof Link> {
  showLoadingState?: boolean;
  loadingClassName?: string;
}

/**
 * Enhanced Link component that prevents double-clicks and shows loading states
 */
export const EnhancedLink: React.FC<EnhancedLinkProps> = ({
  children,
  className,
  showLoadingState = true,
  loadingClassName,
  onClick,
  ...props
}) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Prevent double clicks
    if (isClicked) {
      e.preventDefault();
      return;
    }

    setIsClicked(true);
    
    // Reset after navigation attempt
    setTimeout(() => {
      setIsClicked(false);
    }, 1000);

    // Call original onClick if provided
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link
      {...props}
      className={cn(
        className,
        isClicked && showLoadingState && (loadingClassName || 'opacity-70 pointer-events-none')
      )}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};