import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Capture exception in Sentry
    if (process.env.SENTRY_DSN) {
      if (exception instanceof HttpException) {
        // Only capture server errors (5xx), not client errors (4xx)
        if (exception.getStatus() >= 500) {
          Sentry.captureException(exception);
        }
      } else {
        // Capture all non-HTTP exceptions
        Sentry.captureException(exception);
      }
    }

    // Handle the response
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      response.status(status).json(exceptionResponse);
    } else {
      // Unknown error
      console.error('Unhandled exception:', exception);
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}