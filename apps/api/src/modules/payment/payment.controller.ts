import {
  BadRequestException,
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

import {
  PaymentMethodCreateDto,
  PlanUpgradeCheckoutDto,
  ValidatePromoCodeDto,
} from './payment.dto';
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

@ApiTags('payment-intents')
@Controller('payment-intents')
export class PaymentIntentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPaymentIntent(@Session() session: ISession) {
    return await this.paymentService.createPaymentIntent({
      query: {},
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
    return await this.paymentService.checkoutSubscriptionPlanUpgrade({
      query: {},
      session,
      payload: body,
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

  @Post('validate-promo-code')
  @HttpCode(HttpStatus.OK)
  async validatePromoCode(
    @Session() session: ISession,
    @Body() body: ValidatePromoCodeDto,
  ) {
    return await this.paymentService.validatePromoCode({
      session,
      payload: body,
    });
  }

  @Post('complete-checkout/:checkoutId')
  @HttpCode(HttpStatus.OK)
  async completeCheckout(
    @Session() session: ISession,
    @Param('checkoutId') checkoutId: string,
  ) {
    const id = parseInt(checkoutId, 10);
    if (isNaN(id) || id <= 0) {
      throw new BadRequestException('Invalid checkout ID');
    }
    return await this.paymentService.manuallyCompleteCheckout({
      session,
      checkoutId: id,
    });
  }
}
