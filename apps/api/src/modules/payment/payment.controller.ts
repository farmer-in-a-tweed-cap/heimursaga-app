import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { PaymentMethodCreateDto } from './payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('payment-methods')
@Controller('payment-methods')
export class PaymentMethodController {
  constructor(private paymentService: PaymentService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPaymentMethods(@Session() session: ISession) {
    return await this.paymentService.getPaymentMethods({ query: {}, session });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPaymentMethodById(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.paymentService.getPaymentMethodById({
      query: { publicId: param.id },
      session,
    });
  }

  @Post('setup-intent')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    short: { limit: 10, ttl: 60_000 },
    medium: { limit: 30, ttl: 600_000 },
  })
  async createSetupIntent(@Session() session: ISession) {
    return await this.paymentService.createSetupIntent({ session });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPaymentMethod(
    @Body() body: PaymentMethodCreateDto,
    @Session() session: ISession,
  ) {
    return await this.paymentService.createPaymentMethod({
      query: {},
      payload: body,
      session,
    });
  }

  @Post(':id/default')
  @HttpCode(HttpStatus.OK)
  async setDefaultPaymentMethod(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.paymentService.setDefaultPaymentMethod({
      query: { publicId: param.id },
      session,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePaymentMethod(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.paymentService.deletePaymentMethod({
      query: { publicId: param.id },
      session,
    });
  }
}

@ApiTags('plan')
@Controller('plan')
export class PlanController {
  constructor(private paymentService: PaymentService) {}

  @Get('subscription')
  @HttpCode(HttpStatus.OK)
  async getSubscriptionStatus(@Session() session: ISession) {
    return await this.paymentService.getSubscriptionStatus({
      session,
      query: {},
    });
  }

  @Post('downgrade')
  @HttpCode(HttpStatus.OK)
  async downgrade(@Session() session: ISession) {
    return await this.paymentService.downgradeSubscriptionPlan({
      session,
      query: {},
    });
  }
}
