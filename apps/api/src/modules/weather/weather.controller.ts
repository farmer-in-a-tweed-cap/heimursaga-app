import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '@/common/decorators';

import { WeatherService } from './weather.service';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @Get('conditions')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getConditions() {
    return await this.weatherService.getConditions();
  }

  @Get('stats')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return await this.weatherService.getStats();
  }

  @Get('region')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async getRegionReport(@Query('q') query: string) {
    if (!query || !query.trim()) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const trimmed = query.trim();
    if (trimmed.length > 100) {
      throw new BadRequestException('Query too long');
    }
    return await this.weatherService.getRegionReport(trimmed);
  }
}
