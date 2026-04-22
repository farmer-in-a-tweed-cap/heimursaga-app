'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: 'popup' | 'redirect';
            callback?: (response: { code?: string; error?: string; error_description?: string }) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptLoadPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    // Remove any previous attempt. Attaching listeners to an already-errored
    // <script> never fires — they only catch future events. Starting fresh on
    // each attempt makes retry after a transient network failure work.
    document
      .querySelectorAll<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`)
      .forEach((s) => s.remove());

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
  /** Called with the OAuth authorization code after the user signs in via Google's popup. */
  onCode: (code: string) => void;
  /** Optional: called if the user cancels the popup or it errors out. */
  onCancel?: (reason: string) => void;
}

/**
 * OAuth 2.0 code-flow hook. Triggers Google's sign-in popup when `signIn()`
 * is called, then hands the returned authorization code to the caller so it
 * can be exchanged server-side (where the client_secret lives).
 *
 * This replaced the earlier `google.accounts.id.renderButton` flow so we can
 * ship a brand-matched button instead of Google's prebuilt UI.
 */
export function useGoogleSignIn({ onCode, onCancel }: UseGoogleSignInOptions) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeClientRef = useRef<{ requestCode: () => void } | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const configured = !!clientId;

  // Keep callbacks fresh without re-initializing the SDK
  const onCodeRef = useRef(onCode);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCodeRef.current = onCode;
    onCancelRef.current = onCancel;
  }, [onCode, onCancel]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled) return;
        codeClientRef.current = window.google!.accounts.oauth2.initCodeClient({
          client_id: clientId!,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (response) => {
            if (response?.code) {
              onCodeRef.current(response.code);
            } else if (response?.error) {
              onCancelRef.current?.(
                response.error_description || response.error,
              );
            }
          },
          error_callback: (err) => {
            // Typically `popup_closed`, `popup_failed_to_open`, etc.
            onCancelRef.current?.(err.message || err.type);
          },
        });
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Google Sign-In unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, configured]);

  const signIn = useCallback(() => {
    codeClientRef.current?.requestCode();
  }, []);

  const available = configured && !error;

  return { signIn, ready, configured, error, available };
}
