import { useCallback, useEffect, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export const useRecaptcha = () => {
  const [isReady, setIsReady] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (!siteKey || isLocalhost) {
      if (!siteKey && !isLocalhost) {
        console.warn('NEXT_PUBLIC_RECAPTCHA_SITE_KEY not found');
      }
      return;
    }

    if (typeof window !== 'undefined' && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        setIsReady(true);
      });
    } else {
      // Wait for script to load
      const checkReady = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            setIsReady(true);
          });
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    }
  }, [siteKey]);

  const executeRecaptcha = useCallback(
    async (action: string = 'submit'): Promise<string | null> => {
      if (!siteKey || isLocalhost) {
        // Skip reCAPTCHA on localhost
        return null;
      }

      if (!isReady || !window.grecaptcha) {
        console.warn('reCAPTCHA not ready');
        return null;
      }

      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        return token;
      } catch (error) {
        console.error('reCAPTCHA execution failed:', error);
        return null;
      }
    },
    [siteKey, isReady]
  );

  return {
    isReady,
    executeRecaptcha,
    isConfigured: !!siteKey && !isLocalhost,
  };
};