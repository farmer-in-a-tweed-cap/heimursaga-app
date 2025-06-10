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

import { Public, Session } from '@/common/decorators';
import { ParamIdDto, ParamPublicIdDto } from '@/common/dto';
import { ISession } from '@/common/interfaces';

import { MapQueryDto } from './map.dto';
import { MapService } from './map.service';

@ApiTags('map')
@Controller('map')
export class MapController {
  constructor(private mapService: MapService) {}

  @Public()
  @Post('query')
  @HttpCode(HttpStatus.OK)
  async query(@Body() body: MapQueryDto, @Session() session: ISession) {
    return await this.mapService.query({
      query: body,
      session,
    });
  }

  @Public()
  @Get('waypoints/:id')
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
}
