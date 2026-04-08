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
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 10, ttl: 60000 },
  })
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

  @Get('marine')
  @Public()
  @Throttle({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 10, ttl: 60000 },
    long: { limit: 10, ttl: 60000 },
  })
  @HttpCode(HttpStatus.OK)
  async getMarineConditions(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
  ) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (
      !isFinite(latNum) ||
      !isFinite(lonNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lonNum < -180 ||
      lonNum > 180
    ) {
      throw new BadRequestException('Invalid coordinates');
    }
    return await this.weatherService.getMarineConditions(latNum, lonNum);
  }
}
