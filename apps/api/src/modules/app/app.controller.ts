import { Controller, Get, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators';
import { IRequest } from '@/common/interfaces';
import { StripeService } from '@/modules/stripe';

import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private stripeService: StripeService,
  ) {}

  @Public()
  @Get()
  health() {
    return;
  }

  @Public()
  @Get('test')
  test() {
    return this.appService.test();
  }

  @Public()
  @Post('webhook/stripe')
  stripeWebhook(@Req() req: RawBodyRequest<IRequest>) {
    return this.stripeService.webhook(req);
  }
}
