/**
 * Centralized error logger for the web app.
 * Logs to console in development; in production, replace the `report`
 * implementation with Sentry.captureException or your preferred service.
 */

const IS_PRODUCTION =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost';

interface ErrorContext {
  /** Where the error occurred (e.g. 'api.request', 'ExpeditionDetailPage') */
  source: string;
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/** Report an error with context. Never throws. */
export function reportError(error: unknown, context: ErrorContext): void {
  try {
    if (IS_PRODUCTION) {
      // In production: log structured error for aggregation.
      // Replace with Sentry.captureException(error, { extra: context }) when installed.
      console.error(`[${context.source}]`, error, context.meta);
    } else {
      console.error(`[${context.source}]`, error, context.meta);
    }
  } catch {
    // Error logger must never throw
  }
}
