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
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@repo/types';

import { Roles, Session } from '@/common/decorators';
import { ParamPublicIdDto, ParamUsernameDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import {
  AdminCreateInviteCodeDto,
  AdminExplorerQueryDto,
  AdminPaginationDto,
  AdminRefundDto,
} from './admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Roles(UserRole.ADMIN)
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

  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 5, ttl: 3600000 },
    medium: { limit: 5, ttl: 3600000 },
    long: { limit: 5, ttl: 3600000 },
  })
  async refundPayment(
    @Body() body: AdminRefundDto,
    @Session() session: ISession,
  ) {
    return await this.adminService.refundPayment(
      session,
      body.chargeId,
      body.reason,
    );
  }

  @Get('invite-codes')
  @HttpCode(HttpStatus.OK)
  async getInviteCodes(
    @Query() query: AdminPaginationDto,
    @Session() session: ISession,
  ) {
    return await this.adminService.getInviteCodes(session, query);
  }

  @Post('invite-codes')
  @HttpCode(HttpStatus.CREATED)
  async createInviteCodes(
    @Body() body: AdminCreateInviteCodeDto,
    @Session() session: ISession,
  ) {
    return await this.adminService.createInviteCodes(session, body);
  }

  @Delete('invite-codes/:id')
  @HttpCode(HttpStatus.OK)
  async revokeInviteCode(
    @Param('id') id: string,
    @Session() session: ISession,
  ) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw new BadRequestException('Invalid invite code ID');
    }
    await this.adminService.revokeInviteCode(session, numericId);
    return { success: true };
  }

  @Post('backfill-locations')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 1, ttl: 60000 },
    medium: { limit: 1, ttl: 60000 },
    long: { limit: 1, ttl: 60000 },
  })
  async backfillLocations(@Session() session: ISession) {
    return await this.adminService.backfillExpeditionLocations(session);
  }
}
