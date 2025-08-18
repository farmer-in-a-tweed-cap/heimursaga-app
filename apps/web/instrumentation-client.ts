import * as Sentry from '@sentry/nextjs';

console.log('📍 instrumentation-client.ts loading');
console.log('📍 NEXT_PUBLIC_SENTRY_DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN);
console.log('📍 NODE_ENV:', process.env.NODE_ENV);

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: true, // Always enable debug to see what's happening
  });

  console.log('✅ Sentry initialized');
  
  // Make Sentry available globally for testing
  if (typeof window !== 'undefined') {
    (window as any).Sentry = Sentry;
    console.log('✅ Sentry added to window object');
  }
} else {
  console.log('❌ NEXT_PUBLIC_SENTRY_DSN not found - Sentry not initialized');
}

// Required for navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;