import * as dotenv from 'dotenv';
import * as Sentry from '@sentry/nestjs';

import { getEnvFilePath } from '@/lib/utils';

import { app } from './app';

// import env variables
dotenv.config({ path: getEnvFilePath() });

// initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
  });
}

// run the app
app();

// handle exceptions
process.on('uncaughtException', (e) => {
  console.log('uncaughtException', e);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(e);
  }
});
