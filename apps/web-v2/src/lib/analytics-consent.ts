/**
 * Analytics consent utility for GDPR compliance.
 *
 * Analytics (GA4, PostHog) are only initialised after the user grants consent.
 * Consent state is persisted in a first-party cookie so it survives across sessions.
 */

const CONSENT_COOKIE = 'heimursaga-analytics-consent';

export type ConsentStatus = 'granted' | 'denied' | 'undecided';

/** Read the current consent status from the cookie. */
export function getConsentStatus(): ConsentStatus {
  if (typeof document === 'undefined') return 'undecided';
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!match) return 'undecided';
  return match[1] === 'granted' ? 'granted' : 'denied';
}

/** Persist a consent decision (expires after 365 days). */
export function setConsentStatus(status: 'granted' | 'denied') {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${CONSENT_COOKIE}=${status}; path=/; expires=${expires}; SameSite=Lax`;
}

/** Returns true when the user has explicitly granted analytics consent. */
export function hasAnalyticsConsent(): boolean {
  return getConsentStatus() === 'granted';
}
