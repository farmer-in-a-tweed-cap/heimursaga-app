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

import { PaymentMethodCreatePayloadDto } from './payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('payment-methods')
@Controller('payment-methods')
export class PaymentMethodController {
  constructor(private paymentService: PaymentService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPaymentMethods(@Session() session: ISession) {
    return await this.paymentService.getPaymentMethods({
      userId: session?.userId,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getPaymentMethodById(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.paymentService.getPaymentMethodById({
      publicId: param.id,
      userId: session?.userId,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPaymentMethod(
    @Body() body: PaymentMethodCreatePayloadDto,
    @Session() session: ISession,
  ) {
    return await this.paymentService.createPaymentMethod({
      userId: session.userId,
      data: body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePaymentMethod(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.paymentService.deletePaymentMethod({
      publicId: param.id,
      userId: session.userId,
    });
  }
}
