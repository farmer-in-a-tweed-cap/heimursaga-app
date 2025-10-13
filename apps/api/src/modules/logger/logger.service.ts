import { LoggerService } from '@nestjs/common';
import { Logger as PinoLogger, pino } from 'pino';

export class Logger implements LoggerService {
  logger: PinoLogger;

  constructor() {
    const { NODE_ENV } = process.env;

    const isStaging = NODE_ENV === 'staging' || false;
    const isProduction = NODE_ENV === 'production' || false;
    const isDevelopment = !isStaging && !isProduction;

    this.logger = !isDevelopment
      ? pino()
      : pino({
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        });
  }

  log(message: any, ...params: any[]) {
    this.logger.info(message, params);
  }

  error(message: any, ...params: any[]) {
    this.logger.error(message, params);
  }

  warn(message: any, ...params: any[]) {
    this.logger.warn(message, params);
  }

  debug?(message: any, ...params: any[]) {
    this.logger.debug(message, ...params);
  }
}
