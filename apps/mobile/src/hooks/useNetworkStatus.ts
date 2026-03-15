import { useState, useEffect } from 'react';

/**
 * Lightweight online/offline detection using fetch-based connectivity check.
 * Falls back to assuming online if check fails due to CORS or other non-network issues.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch('https://api.heimursaga.com/v1/health', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!cancelled) setIsOnline(true);
      } catch {
        if (!cancelled) setIsOnline(false);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}
