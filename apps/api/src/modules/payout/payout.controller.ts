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

import { PayoutMethodCreateDto } from './payout.dto';
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
      query: { publicId: param.id },
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
