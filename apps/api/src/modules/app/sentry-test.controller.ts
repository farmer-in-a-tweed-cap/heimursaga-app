import { Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';

import { Public } from '@/common/decorators';

const IS_DEVELOPMENT = ['development', 'test'].includes(process.env.NODE_ENV || '');

@ApiTags('sentry-test')
@Controller('sentry-test')
export class SentryTestController {
  @Public()
  @Get()
  testSentryError() {
    if (!IS_DEVELOPMENT)
      throw new ForbiddenException('Not available in production');
    throw new Error('Test server-side error from NestJS API');
  }

  @Public()
  @Post('message')
  testSentryMessage() {
    if (!IS_DEVELOPMENT)
      throw new ForbiddenException('Not available in production');
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage('Test message from API', 'info');
    }
    return { message: 'Message sent to Sentry from API' };
  }

  @Public()
  @Post('exception')
  testSentryException() {
    if (!IS_DEVELOPMENT)
      throw new ForbiddenException('Not available in production');
    try {
      throw new Error('Test API exception');
    } catch (error) {
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
      }
      return { message: 'Exception captured from API' };
    }
  }
}
