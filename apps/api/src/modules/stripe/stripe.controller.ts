import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { IRequest, ISession } from '@/common/interfaces';

import {
  StripeAccountLinkDto,
  StripeCreatePaymentIntentDto,
} from './stripe.dto';
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

  @Post('create-setup-intent')
  createStripeSetupIntent() {
    return this.stripeService.createSetupIntent();
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

  @Get('account/:id')
  async getAccount(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    const { id } = param;
    return this.stripeService.getAccount({ accountId: id });
  }

  @Post('account')
  async createAccount(@Session() session: ISession) {
    return this.stripeService.createAccount({ country: 'SG' });
  }

  @Post('account-link')
  async linkAccount(
    @Session() session: ISession,
    @Body() body: StripeAccountLinkDto,
  ) {
    const { accountId } = body;
    return this.stripeService.linkAccount({ accountId });
  }
}
