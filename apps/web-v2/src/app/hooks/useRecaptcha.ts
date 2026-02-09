'use client';

import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function useRecaptcha() {
  const [isReady, setIsReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (!siteKey || isLocalhost) return;

    const checkReady = () => {
      if (typeof window !== 'undefined' && window.grecaptcha) {
        window.grecaptcha.ready(() => setIsReady(true));
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  }, [siteKey, isLocalhost]);

  const executeRecaptcha = useCallback(
    async (action: string = 'submit'): Promise<string | null> => {
      if (!siteKey || isLocalhost) return null;
      if (!isReady || !window.grecaptcha) return null;

      try {
        return await window.grecaptcha.execute(siteKey, { action });
      } catch {
        return null;
      }
    },
    [siteKey, isReady, isLocalhost],
  );

  return { isReady, executeRecaptcha, isConfigured: !!siteKey && !isLocalhost };
}
