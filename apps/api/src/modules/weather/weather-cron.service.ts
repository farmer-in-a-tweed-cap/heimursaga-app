import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Logger } from '@/modules/logger';

import { WeatherService } from './weather.service';

@Injectable()
export class WeatherCronService implements OnModuleInit {
  constructor(
    private logger: Logger,
    private weatherService: WeatherService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('[CRON] Warming weather caches on startup');
    try {
      await Promise.all([
        this.weatherService.refreshConditions(),
        this.weatherService.refreshStats(),
      ]);
      this.logger.log('[CRON] Weather caches warmed');
    } catch (e) {
      this.logger.error(
        `[CRON] Weather cache warm-up failed: ${e.message}`,
      );
    }
  }

  @Cron('5,25,45 * * * *')
  async handleWeatherRefresh(): Promise<void> {
    this.logger.log('[CRON] Refreshing weather conditions and stats');
    try {
      await Promise.all([
        this.weatherService.refreshConditions(),
        this.weatherService.refreshStats(),
      ]);
      this.logger.log('[CRON] Weather refresh complete');
    } catch (e) {
      this.logger.error(
        `[CRON] Weather refresh failed: ${e.message}`,
      );
    }
  }
}
