/**
 * Analytics service — lightweight wrapper for event tracking.
 *
 * Replace the implementation with PostHog, Mixpanel, or Amplitude
 * once a provider is selected. All call sites use this facade so
 * swapping providers requires changes only here.
 */

type EventProperties = Record<string, string | number | boolean | undefined>;

let userId: string | undefined;

export const analytics = {
  identify(id: string, traits?: EventProperties) {
    userId = id;
    if (__DEV__) {
      console.log('[analytics] identify', id, traits);
    }
    // TODO: Replace with provider SDK call
    // e.g. posthog.identify(id, traits);
  },

  track(event: string, properties?: EventProperties) {
    if (__DEV__) {
      console.log('[analytics] track', event, properties);
    }
    // TODO: Replace with provider SDK call
    // e.g. posthog.capture(event, { ...properties, userId });
  },

  screen(name: string, properties?: EventProperties) {
    if (__DEV__) {
      console.log('[analytics] screen', name, properties);
    }
    // TODO: Replace with provider SDK call
    // e.g. posthog.screen(name, properties);
  },

  reset() {
    userId = undefined;
    if (__DEV__) {
      console.log('[analytics] reset');
    }
    // TODO: Replace with provider SDK call
    // e.g. posthog.reset();
  },
};
