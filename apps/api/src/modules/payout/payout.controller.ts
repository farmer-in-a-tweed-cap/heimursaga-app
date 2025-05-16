import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { PayoutCreateDto, PayoutMethodCreateDto } from './payout.dto';
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

  @Get(':id/platform-link')
  @HttpCode(HttpStatus.OK)
  async getPayoutMethodPlatformLink(
    @Session() session: ISession,
    @Param() param: ParamPublicIdDto,
  ) {
    return await this.payoutService.getPayoutMethodPlatformLink({
      query: { publicId: param.id, mode: 'account_update' },
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
