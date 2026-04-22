'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              logo_alignment?: 'left' | 'center';
            },
          ) => void;
          prompt: () => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptLoadPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GSI script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('GSI script failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

interface UseGoogleSignInOptions {
  onCredential: (idToken: string) => void;
}

/**
 * Loads the Google Identity Services script and renders the official
 * Google Sign-In button into the provided ref. Returns a ref + a state
 * indicating whether Google is configured/ready.
 */
export function useGoogleSignIn({ onCredential }: UseGoogleSignInOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const configured = !!clientId;

  // Keep the callback fresh without re-initializing the SDK
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled) return;
        window.google!.accounts.id.initialize({
          client_id: clientId!,
          callback: (response) => {
            if (response?.credential) {
              onCredentialRef.current(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });

        if (containerRef.current) {
          // Clear in case of re-render
          containerRef.current.innerHTML = '';
          window.google!.accounts.id.renderButton(containerRef.current, {
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width: Math.min(containerRef.current.clientWidth || 400, 400),
            logo_alignment: 'center',
          });
        }
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Google Sign-In unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, configured]);

  return { containerRef, ready, configured, error };
}
