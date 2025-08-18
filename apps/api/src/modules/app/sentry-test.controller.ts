import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';

import { Public } from '@/common/decorators';

@ApiTags('sentry-test')
@Controller('sentry-test')
export class SentryTestController {
  @Public()
  @Get()
  testSentryError() {
    throw new Error('Test server-side error from NestJS API');
  }

  @Public()
  @Post('message')
  testSentryMessage() {
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage('Test message from API', 'info');
    }
    return { message: 'Message sent to Sentry from API' };
  }

  @Public()
  @Post('exception')
  testSentryException() {
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