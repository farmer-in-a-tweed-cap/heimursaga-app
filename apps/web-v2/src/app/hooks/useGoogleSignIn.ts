'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
 * Loads Google Identity Services and renders the official Google Sign-In
 * button into whichever DOM node is attached via the returned `setButtonRef`
 * ref callback. Using a callback ref (instead of a stable ref object) means
 * the button re-renders correctly when the host element remounts — e.g. when
 * the user switches between login and register tabs on the auth page.
 */
export function useGoogleSignIn({ onCredential }: UseGoogleSignInOptions) {
  const buttonElRef = useRef<HTMLDivElement | null>(null);
  // Counter incremented on every ref-attach/detach; kicks the render effect
  // whenever the DOM node changes (e.g. user switches between login/register
  // tabs). Using useRef for the element (instead of useState) avoids
  // react-hooks/immutability complaints about DOM mutations.
  const [refTick, setRefTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const configured = !!clientId;

  // Keep the callback fresh without re-initializing the SDK
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  // Load + initialize GSI once
  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled) return;
        if (!initializedRef.current) {
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
          initializedRef.current = true;
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

  // (Re)render the button whenever the target element or ready state changes.
  // This is what makes tab-switching work: when the old host node unmounts
  // the ref callback fires with null, then with the new node when the new
  // tab mounts, bumping refTick and re-triggering this effect.
  useEffect(() => {
    const el = buttonElRef.current;
    if (!el || !ready) return;
    el.replaceChildren();
    const parentWidth = el.parentElement?.clientWidth ?? 400;
    const width = Math.min(Math.max(parentWidth - 8, 200), 400);
    window.google!.accounts.id.renderButton(el, {
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width,
      logo_alignment: 'center',
    });
  }, [refTick, ready]);

  const setButtonRef = useCallback((el: HTMLDivElement | null) => {
    if (el === buttonElRef.current) return;
    buttonElRef.current = el;
    setRefTick((n) => n + 1);
  }, []);

  // `available` = should the Google section render at all. False if not
  // configured (no client_id) or if the GSI script failed to load (CSP,
  // network block, offline).
  const available = configured && !error;

  return { setButtonRef, ready, configured, error, available };
}
