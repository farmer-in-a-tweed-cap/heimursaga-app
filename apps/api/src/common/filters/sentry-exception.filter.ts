import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { FastifyReply } from 'fastify';

import { ServiceException } from '@/common/exceptions';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    // Capture exception in Sentry
    if (process.env.SENTRY_DSN) {
      if (exception instanceof HttpException) {
        if (exception.getStatus() >= 500) {
          Sentry.captureException(exception);
        }
      } else if (exception instanceof ServiceException) {
        if (exception.status >= 500) {
          Sentry.captureException(exception);
        }
      } else {
        Sentry.captureException(exception);
      }
    }

    // Handle the response
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      response.status(status).send(exceptionResponse);
    } else if (exception instanceof ServiceException) {
      response.status(exception.status).send({
        statusCode: exception.status,
        message: exception.message,
      });
    } else {
      console.error('Unhandled exception:', exception);
      response.status(500).send({
        statusCode: 500,
        message: 'Internal server error',
      });
    }
  }
}
