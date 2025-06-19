import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import {
  PayoutCreateDto,
  PayoutMethodCreateDto,
  StripePlatformAccountLinkGenerateDto,
} from './payout.dto';
import { PayoutService } from './payout.service';

@ApiTags('payout-methods')
@Controller('payout-methods')
export class PayoutMethodController {
  constructor(private payoutService: PayoutService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserPayoutMethods(@Session() session: ISession) {
    return await this.payoutService.getUserPayoutMethods({
      query: {},
      session,
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createPayoutMethod(
    @Session() session: ISession,
    @Body() body: PayoutMethodCreateDto,
  ) {
    return await this.payoutService.createPayoutMethod({
      query: {},
      payload: body,
      session,
    });
  }
}

@ApiTags('stripe account links')
@Controller('stripe-account-links')
export class StripeAccountLinkController {
  constructor(private payoutService: PayoutService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async generate(
    @Session() session: ISession,
    @Body() body: StripePlatformAccountLinkGenerateDto,
  ) {
    return await this.payoutService.generateStripePlatformAccountLink({
      query: {},
      payload: body,
      session,
    });
  }
}

@ApiTags('balance')
@Controller('balance')
export class BalanceController {
  constructor(private payoutService: PayoutService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getBalance(@Session() session: ISession) {
    return await this.payoutService.getBalance({
      query: {},
      session,
    });
  }
}

@ApiTags('payouts')
@Controller('payouts')
export class PayoutController {
  constructor(private payoutService: PayoutService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPayouts(@Session() session: ISession) {
    return await this.payoutService.getPayouts({
      query: {},
      session,
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createPayout(
    @Session() session: ISession,
    @Body() body: PayoutCreateDto,
  ) {
    return await this.payoutService.createPayout({
      query: {},
      payload: body,
      session,
    });
  }
}
