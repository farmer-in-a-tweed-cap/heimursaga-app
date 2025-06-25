import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators';

import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  health() {
    return;
  }

  @Public()
  @Post('test')
  test() {
    return this.appService.test();
  }

  @Public()
  @Get('sitemap')
  sitemap() {
    return this.appService.generateSitemap();
  }
}
