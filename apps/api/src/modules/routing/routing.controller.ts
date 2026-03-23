import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
    return this.routingService.getTrailRoute(body.locations);
  }

  @Post('waterway')
  @HttpCode(HttpStatus.OK)
  async getWaterwayRoute(
    @Body() body: WaterwayRouteDto,
  ): Promise<RouteResult> {
    return this.waterwayRoutingService.getWaterwayRoute(
      body.locations,
      body.profile,
    );
  }
}
