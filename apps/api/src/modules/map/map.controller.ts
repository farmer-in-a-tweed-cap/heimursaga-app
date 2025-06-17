import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
import { ParamIdDto, ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { MapQueryDto, WaypointCreateDto, WaypointUpdateDto } from './map.dto';
import { MapService } from './map.service';

@ApiTags('map')
@Controller('map')
export class MapController {
  constructor(private mapService: MapService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async query(@Body() body: MapQueryDto, @Session() session: ISession) {
    return await this.mapService.query({
      query: body,
      session,
    });
  }

  @Public()
  @Get('waypoints/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  async getWaypointById(
    @Param() param: ParamIdDto,
    @Session() session: ISession,
  ) {
    return await this.mapService.getWaypointById({
      query: { id: param.id },
      session,
    });
  }

  @Post('waypoints')
  @HttpCode(HttpStatus.CREATED)
  async createWaypoint(
    @Body() body: WaypointCreateDto,
    @Session() session: ISession,
  ) {
    return await this.mapService.createWaypoint({
      query: {},
      payload: body,
      session,
    });
  }

  @Put('waypoints/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  async updateWaypoint(
    @Param() param: ParamIdDto,
    @Body() body: WaypointUpdateDto,
    @Session() session: ISession,
  ) {
    return await this.mapService.updateWaypoint({
      query: { id: param.id },
      payload: body,
      session,
    });
  }

  @Delete('waypoints/:id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  async deleteWaypoint(
    @Param() param: ParamIdDto,
    @Session() session: ISession,
  ) {
    return await this.mapService.deleteWaypoint({
      query: { id: param.id },
      session,
    });
  }
}
