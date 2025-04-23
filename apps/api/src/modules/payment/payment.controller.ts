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

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto, ParamSlugDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { PaymentMethodCreateDto, PlanUpgradeCheckoutDto } from './payment.dto';
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPaymentMethod(
    @Body() body: PaymentMethodCreateDto,
    @Session() session: ISession,
  ) {
    console.log('create payment method', {
      body,
      session,
    });

    return await this.paymentService.createPaymentMethod({
      payload: body,
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

@ApiTags('payment-intents')
@Controller('payment-intents')
export class PaymentIntentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(@Session() session: ISession) {
    return await this.paymentService.createPaymentIntent({
      session,
      payload: {},
    });
  }
}

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private paymentService: PaymentService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAll(@Session() session: ISession) {
    return await this.paymentService.getPlans({
      query: {},
      session,
    });
  }

  @Public()
  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  async getBySlug(@Session() session: ISession, @Param() param: ParamSlugDto) {
    return await this.paymentService.getPlanBySlug({
      query: { slug: param.slug },
      session,
    });
  }
}

@ApiTags('plan')
@Controller('plan')
export class PlanController {
  constructor(private paymentService: PaymentService) {}

  @Post('upgrade/checkout')
  @HttpCode(HttpStatus.OK)
  async checkoutUpgrade(
    @Session() session: ISession,
    @Body() body: PlanUpgradeCheckoutDto,
  ) {
    return await this.paymentService.checkoutPlanUpgrade({
      session,
      payload: body,
    });
  }

  // @Post('upgrade/complete')
  // @HttpCode(HttpStatus.OK)
  // async completeUpgrade(
  //   @Session() session: ISession,
  //   @Body() body: PlanUpgradeCompleteDto,
  // ) {
  //   return await this.paymentService.completePlanUpgrade({
  //     session,
  //     payload: body,
  //   });
  // }

  // @todo
  @Post('downgrade')
  @HttpCode(HttpStatus.OK)
  async downgrade(@Session() session: ISession) {
    return {};
  }
}
