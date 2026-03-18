'use client';

import { useState } from 'react';
import { getConsentStatus, setConsentStatus } from '@/lib/analytics-consent';
import { initPostHog } from '@/lib/posthog';

/**
 * Minimal GDPR cookie consent banner.
 *
 * Shown only when the user has not yet made a choice. Accepting consent
 * initialises PostHog immediately and sets a cookie so GA4 loads on the
 * next page navigation (GA4 is loaded in layout.tsx via a script tag that
 * reads the same cookie).
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => getConsentStatus() === 'undecided');

  if (!visible) return null;

  const handleAccept = () => {
    setConsentStatus('granted');
    setVisible(false);
    // Initialise PostHog now that consent has been granted
    initPostHog();
    // GA4 will pick up the cookie on the next navigation/reload
  };

  const handleDecline = () => {
    setConsentStatus('denied');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#202020] text-white border-t-2 border-[#616161]">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm flex-1 font-[family-name:var(--font-jost)]">
          We use cookies and analytics (Google Analytics, PostHog) to improve
          your experience. You can accept or decline non-essential cookies.
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 border-2 border-[#616161] text-sm font-bold hover:bg-[#3a3a3a] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
          >
            DECLINE
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-[#ac6d46] text-white text-sm font-bold hover:bg-[#8a5738] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            ACCEPT
          </button>
        </div>
      </div>
    </div>
  );
}
