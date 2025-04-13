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
