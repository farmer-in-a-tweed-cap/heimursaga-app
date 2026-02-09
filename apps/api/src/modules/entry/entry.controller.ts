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
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { EntryCreateDto, EntryUpdateDto } from './entry.dto';
import { EntryService } from './entry.service';

@ApiTags('posts')
@Controller('posts')
export class EntryController {
  constructor(private entryService: EntryService) {}

  @Get('drafts')
  @HttpCode(HttpStatus.OK)
  async getDrafts(@Session() session: ISession) {
    return await this.entryService.getDrafts({ query: {}, session });
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getEntries(
    @Session() session: ISession,
    @Query('context') context?: string,
  ) {
    return await this.entryService.getEntries({ query: { context }, session });
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.entryService.getById({
      query: { publicId: param.id },
      session,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: EntryCreateDto, @Session() session: ISession) {
    return await this.entryService.create({
      query: {},
      payload: body,
      session,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param() param: ParamPublicIdDto,
    @Body() body: EntryUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.entryService.update({
      query: { publicId: param.id },
      session,
      payload: body,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Session() session: ISession, @Param() param: ParamPublicIdDto) {
    return await this.entryService.delete({
      query: { publicId: param.id },
      session,
    });
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async like(@Param() param: ParamPublicIdDto, @Session() session: ISession) {
    return await this.entryService.like({
      query: { publicId: param.id },
      session,
    });
  }

  @Post(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  async bookmark(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    return await this.entryService.bookmark({
      query: { publicId: param.id },
      session,
    });
  }
}
