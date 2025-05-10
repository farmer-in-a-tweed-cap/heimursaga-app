import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public, Session } from '@/common/decorators';
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
}
