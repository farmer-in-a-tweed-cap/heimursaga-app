import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { TrailRouteDto, WaterwayRouteDto } from './routing.dto';
import { RouteResult, RoutingService } from './routing.service';
import { WaterwayRoutingService } from './waterway-routing.service';

@ApiTags('routing')
@Controller('routing')
@SkipThrottle()
export class RoutingController {
  constructor(
    private routingService: RoutingService,
    private waterwayRoutingService: WaterwayRoutingService,
  ) {}

  @Post('trail')
  @HttpCode(HttpStatus.OK)
  async getTrailRoute(@Body() body: TrailRouteDto): Promise<RouteResult> {
    try {
      return await this.routingService.getTrailRoute(body.locations);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Trail routing failed');
    }
  }

  @Post('waterway')
  @HttpCode(HttpStatus.OK)
  async getWaterwayRoute(@Body() body: WaterwayRouteDto): Promise<RouteResult> {
    try {
      return await this.waterwayRoutingService.getWaterwayRoute(
        body.locations,
        body.profile,
      );
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Waterway routing failed');
    }
  }
}
