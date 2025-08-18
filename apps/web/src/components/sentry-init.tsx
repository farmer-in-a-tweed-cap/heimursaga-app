'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export function SentryInit() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== 'undefined') {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        debug: process.env.NODE_ENV === 'development',
      });
      
      // Make Sentry available globally for testing
      (window as any).Sentry = Sentry;
      
      console.log('Sentry initialized');
    }
  }, []);

  return null;
}