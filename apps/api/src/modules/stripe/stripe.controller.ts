import { Body, Controller, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { IRequest, ISession } from '@/common/interfaces';

import { StripeCreatePaymentIntentDto } from './stripe.dto';
import { StripeService } from './stripe.service';

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  constructor(private stripeService: StripeService) {}

  @Public()
  @Post('')
  stripeWebhook(@Req() req: RawBodyRequest<IRequest>) {
    return this.stripeService.webhook(req);
  }

  @Post('create-payment-intent')
  createStripePaymentIntent(
    @Session() session: ISession,
    @Body() body: StripeCreatePaymentIntentDto,
  ) {
    return this.stripeService.createPaymentIntent({
      userId: session?.userId,
      ...body,
    });
  }

  @Post('create-setup-intent')
  createStripeSetupIntent(@Session() session: ISession) {
    return this.stripeService.createSetupIntent();
  }
}
