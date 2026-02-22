import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma';

import { WeatherCronService } from './weather-cron.service';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [PrismaModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherCronService],
  exports: [WeatherService],
})
export class WeatherModule {}
