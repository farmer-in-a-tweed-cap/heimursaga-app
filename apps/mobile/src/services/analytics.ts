/**
 * Analytics service — PostHog implementation.
 *
 * All call sites use this facade so swapping providers
 * requires changes only here.
 */

import PostHog from 'posthog-react-native';

type EventProperties = Record<string, string | number | boolean | undefined>;

const POSTHOG_KEY = (process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '').trim();
const POSTHOG_HOST = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com').trim();

let client: PostHog | null = null;

export async function initAnalytics(): Promise<PostHog | null> {
  if (!POSTHOG_KEY) {
    if (__DEV__) console.log('[analytics] No PostHog key — analytics disabled');
    return null;
  }
  if (client) return client;

  try {
    client = await PostHog.initAsync(POSTHOG_KEY, {
      host: POSTHOG_HOST,
    });
    if (__DEV__) console.log('[analytics] PostHog initialized');
  } catch (err) {
    if (__DEV__) console.warn('[analytics] PostHog init failed:', err);
  }
  return client;
}

export const analytics = {
  identify(id: string, traits?: EventProperties) {
    if (__DEV__) console.log('[analytics] identify', id, traits);
    client?.identify(id, traits);
  },

  track(event: string, properties?: EventProperties) {
    if (__DEV__) console.log('[analytics] track', event, properties);
    client?.capture(event, properties);
  },

  screen(name: string, properties?: EventProperties) {
    if (__DEV__) console.log('[analytics] screen', name, properties);
    client?.screen(name, properties);
  },

  reset() {
    if (__DEV__) console.log('[analytics] reset');
    client?.reset();
  },
};
