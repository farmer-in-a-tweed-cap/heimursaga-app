'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

/**
 * Enhanced navigation hook with loading states
 * Prevents double-clicks and provides visual feedback
 */
export const useNavigation = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastNavigationTarget, setLastNavigationTarget] = useState<string | null>(null);

  const navigateTo = useCallback(
    (href: string, replace: boolean = false) => {
      // Prevent duplicate navigation attempts
      if (isNavigating || lastNavigationTarget === href) {
        return;
      }

      setIsNavigating(true);
      setLastNavigationTarget(href);

      try {
        if (replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
      } catch (error) {
        console.error('Navigation failed:', error);
        setIsNavigating(false);
        setLastNavigationTarget(null);
      }

      // Reset navigation state after a short delay
      setTimeout(() => {
        setIsNavigating(false);
        setLastNavigationTarget(null);
      }, 1000);
    },
    [router, isNavigating, lastNavigationTarget]
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return {
    navigateTo,
    refresh,
    isNavigating,
    router,
  };
};