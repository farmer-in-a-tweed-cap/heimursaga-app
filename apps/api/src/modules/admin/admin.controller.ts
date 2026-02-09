import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Session } from '@/common/decorators';
import { ParamPublicIdDto, ParamUsernameDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { AdminExplorerQueryDto, AdminPaginationDto } from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@Session() session: ISession) {
    return await this.adminService.getStats(session);
  }

  @Get('entries')
  @HttpCode(HttpStatus.OK)
  async getEntries(
    @Query() query: AdminPaginationDto,
    @Session() session: ISession,
  ) {
    return await this.adminService.getEntries(session, query);
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.OK)
  async deleteEntry(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    await this.adminService.deleteEntry(session, param.id);
    return { success: true };
  }

  @Get('expeditions')
  @HttpCode(HttpStatus.OK)
  async getExpeditions(
    @Query() query: AdminPaginationDto,
    @Session() session: ISession,
  ) {
    return await this.adminService.getExpeditions(session, query);
  }

  @Delete('expeditions/:id')
  @HttpCode(HttpStatus.OK)
  async deleteExpedition(
    @Param() param: ParamPublicIdDto,
    @Session() session: ISession,
  ) {
    await this.adminService.deleteExpedition(session, param.id);
    return { success: true };
  }

  @Get('explorers')
  @HttpCode(HttpStatus.OK)
  async getExplorers(
    @Query() query: AdminExplorerQueryDto,
    @Session() session: ISession,
  ) {
    return await this.adminService.getExplorers(session, query);
  }

  @Post('explorers/:username/block')
  @HttpCode(HttpStatus.OK)
  async blockExplorer(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    await this.adminService.blockExplorer(session, param.username);
    return { success: true };
  }

  @Post('explorers/:username/unblock')
  @HttpCode(HttpStatus.OK)
  async unblockExplorer(
    @Param() param: ParamUsernameDto,
    @Session() session: ISession,
  ) {
    await this.adminService.unblockExplorer(session, param.username);
    return { success: true };
  }
}
