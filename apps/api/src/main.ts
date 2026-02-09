import * as dotenv from 'dotenv';

import * as Sentry from '@sentry/nestjs';

import { getEnvFilePath } from '@/lib/utils';

import { app, getAppInstance } from './app';

// import env variables
dotenv.config({ path: getEnvFilePath() });

// validate required environment variables
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

for (const varName of REQUIRED_ENV_VARS) {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

// initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: process.env.NODE_ENV === 'development',
  });
}

// Graceful shutdown — close the server and release the port before exiting
async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  const instance = getAppInstance();
  if (instance) {
    await instance.close();
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// run the app
app();

// handle exceptions
process.on('uncaughtException', (e) => {
  console.error('uncaughtException', e);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(e);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason);
  }
});
