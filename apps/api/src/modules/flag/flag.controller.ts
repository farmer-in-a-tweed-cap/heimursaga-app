import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { FlagCreateDto, FlagQueryDto, FlagUpdateDto } from './flag.dto';
import { FlagService } from './flag.service';

@ApiTags('flags')
@Controller('flags')
export class FlagController {
  constructor(private flagService: FlagService) {}

  /**
   * Create a new flag (authenticated users only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFlag(@Body() body: FlagCreateDto, @Session() session: ISession) {
    return await this.flagService.createFlag({
      query: {},
      session,
      payload: body,
    });
  }

  /**
   * Get all flags (admin only)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getFlags(@Query() query: FlagQueryDto, @Session() session: ISession) {
    return await this.flagService.getFlags({
      query,
      session,
      payload: {},
    });
  }

  /**
   * Get single flag by ID (admin only)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getFlagById(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.flagService.getFlagById({
      query: {},
      session,
      flagId: param.id,
    });
  }

  /**
   * Update flag status (admin only)
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateFlag(
    @Param() param: ParamPublicIdDto,
    @Body() body: FlagUpdateDto,
    @Session() session: ISession,
  ) {
    await this.flagService.updateFlag({
      query: {},
      session,
      flagId: param.id,
      payload: body,
    });

    return { success: true };
  }
}
