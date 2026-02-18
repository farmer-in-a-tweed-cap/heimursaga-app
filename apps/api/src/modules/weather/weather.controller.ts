import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

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
}
