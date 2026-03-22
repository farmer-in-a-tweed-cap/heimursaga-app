import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { TrailRouteDto } from './routing.dto';
import { RouteResult, RoutingService } from './routing.service';

@ApiTags('routing')
@Controller('routing')
export class RoutingController {
  constructor(private routingService: RoutingService) {}

  @Post('trail')
  @HttpCode(HttpStatus.OK)
  async getTrailRoute(@Body() body: TrailRouteDto): Promise<RouteResult> {
    return this.routingService.getTrailRoute(body.locations);
  }
}
