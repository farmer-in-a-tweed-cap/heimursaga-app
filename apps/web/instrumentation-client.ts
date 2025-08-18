import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: process.env.NODE_ENV === 'development',
});

// Make Sentry available globally for testing (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).Sentry = Sentry;
}

// Required for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;