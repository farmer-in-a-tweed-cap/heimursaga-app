'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

/**
 * Enhanced navigation hook with loading states
 * Prevents double-clicks and provides visual feedback
 */
export const useNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastNavigationTarget, setLastNavigationTarget] = useState<string | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  // Reset navigation state when pathname changes (navigation complete)
  useEffect(() => {
    // Always cleanup visual feedback when pathname changes
    setIsNavigating(false);
    setLastNavigationTarget(null);
    
    // Reset all visual feedback
    document.body.style.backgroundColor = '';
    
    // Remove loading banner
    const banner = document.getElementById('navigation-loading-banner');
    if (banner) {
      banner.remove();
    }
  }, [pathname]);

  const navigateTo = useCallback(
    (href: string, replace: boolean = false) => {
      // Prevent duplicate navigation attempts only while actively navigating
      if (isNavigating) {
        return;
      }

      // If we're already on the target page, refresh instead
      if (pathname === href) {
        router.refresh();
        return;
      }

      // Clear any previous errors
      setNavigationError(null);
      setIsNavigating(true);
      setLastNavigationTarget(href);

      // Add immediate visual feedback that persists
      document.body.style.backgroundColor = 'rgba(170, 108, 70, 0.02)';
      
      // Create subtle loading banner
      const banner = document.createElement('div');
      banner.id = 'navigation-loading-banner';
      banner.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 2px !important;
        background: rgb(170, 108, 70) !important;
        z-index: 999999 !important;
        pointer-events: none !important;
        animation: loadingPulse 1.5s ease-in-out infinite !important;
      `;
      document.body.appendChild(banner);

      try {
        if (replace) {
          router.replace(href);
        } else {
          router.push(href);
        }

        // Safety timeout: reset state after 5 seconds if navigation doesn't complete
        // This prevents the UI from getting stuck if navigation fails silently
        setTimeout(() => {
          setIsNavigating(false);
          setLastNavigationTarget(null);

          // Reset visual feedback
          document.body.style.backgroundColor = '';
          const banner = document.getElementById('navigation-loading-banner');
          if (banner) {
            banner.remove();
          }
        }, 5000);
      } catch (error) {
        console.error('Navigation failed:', error);
        setNavigationError(error instanceof Error ? error.message : 'Navigation failed');
        setIsNavigating(false);
        setLastNavigationTarget(null);

        // Reset all visual feedback on error
        document.body.style.backgroundColor = '';

        const banner = document.getElementById('navigation-loading-banner');
        if (banner) {
          banner.remove();
        }
        return;
      }

      // Navigation state will be reset by useEffect when pathname changes
    },
    [router, isNavigating, pathname]
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const clearError = useCallback(() => {
    setNavigationError(null);
  }, []);

  return {
    navigateTo,
    refresh,
    clearError,
    isNavigating,
    navigationError,
    router,
  };
};