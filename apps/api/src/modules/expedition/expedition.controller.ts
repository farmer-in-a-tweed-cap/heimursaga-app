import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import {
  ExpeditionCreateDto,
  ExpeditionParamDto,
  ExpeditionUpdateLocationDto,
  ExpeditionWaypointParamDto,
  WaypointCreateDto,
  WaypointUpdateDto,
} from './expedition.dto';
import { ExpeditionService } from './expedition.service';

@ApiTags('trips')
@Controller('trips')
export class ExpeditionController {
  constructor(private expeditionService: ExpeditionService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getExpeditions(@Session() session: ISession) {
    return await this.expeditionService.getExpeditions({
      query: {},
      session,
    });
  }

  @Public()
  @Get(':trip_id')
  @HttpCode(HttpStatus.OK)
  async getExpeditionById(
    @Session() session: ISession,
    @Param() param: ExpeditionParamDto,
  ) {
    return await this.expeditionService.getExpeditionById({
      query: { id: param.trip_id },
      session,
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createExpedition(
    @Session() session: ISession,
    @Body() body: ExpeditionCreateDto,
  ) {
    return await this.expeditionService.createExpedition({
      query: {},
      payload: body,
      session,
    });
  }

  @Put(':trip_id')
  @HttpCode(HttpStatus.OK)
  async updateExpedition(
    @Session() session: ISession,
    @Param() param: ExpeditionParamDto,
    @Body() body: ExpeditionCreateDto,
  ) {
    return await this.expeditionService.updateExpedition({
      query: { id: param.trip_id },
      payload: body,
      session,
    });
  }

  @Delete(':trip_id')
  @HttpCode(HttpStatus.OK)
  async deleteExpedition(
    @Session() session: ISession,
    @Param() param: ExpeditionParamDto,
  ) {
    return await this.expeditionService.deleteExpedition({
      query: { id: param.trip_id },
      session,
    });
  }

  @Patch(':trip_id/location')
  @HttpCode(HttpStatus.OK)
  async updateExpeditionLocation(
    @Session() session: ISession,
    @Param() param: ExpeditionParamDto,
    @Body() body: ExpeditionUpdateLocationDto,
  ) {
    return await this.expeditionService.updateExpeditionLocation({
      query: { id: param.trip_id },
      payload: body,
      session,
    });
  }

  @Post(':trip_id/waypoints')
  @HttpCode(HttpStatus.OK)
  async createExpeditionWaypoint(
    @Session() session: ISession,
    @Param() param: ExpeditionParamDto,
    @Body() body: WaypointCreateDto,
  ) {
    return await this.expeditionService.createExpeditionWaypoint({
      query: { expeditionId: param.trip_id },
      payload: body,
      session,
    });
  }

  @Put(':trip_id/waypoints/:waypoint_id')
  @HttpCode(HttpStatus.OK)
  async updateExpeditionWaypoint(
    @Session() session: ISession,
    @Param() param: ExpeditionWaypointParamDto,
    @Body() body: WaypointUpdateDto,
  ) {
    return await this.expeditionService.updateExpeditionWaypoint({
      query: { expeditionId: param.trip_id, waypointId: param.waypoint_id },
      payload: body,
      session,
    });
  }

  @Delete(':trip_id/waypoints/:waypoint_id')
  @HttpCode(HttpStatus.OK)
  async deleteExpeditionWaypoint(
    @Session() session: ISession,
    @Param() param: ExpeditionWaypointParamDto,
  ) {
    return await this.expeditionService.deleteExpeditionWaypoint({
      query: { expeditionId: param.trip_id, waypointId: param.waypoint_id },
      session,
    });
  }

  @Post(':trip_id/bookmark')
  @HttpCode(HttpStatus.OK)
  async bookmark(
    @Param() param: ExpeditionParamDto,
    @Session() session: ISession,
  ) {
    return await this.expeditionService.bookmark({
      query: { publicId: param.trip_id },
      session,
    });
  }
}
