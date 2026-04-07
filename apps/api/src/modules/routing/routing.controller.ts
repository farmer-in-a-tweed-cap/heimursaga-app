import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';

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
  async getWaterwayRoute(
    @Body() body: WaterwayRouteDto,
    @Query('stream') stream: string | undefined,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    // Non-streaming mode: return JSON as before
    if (stream !== '1') {
      try {
        const result = await this.waterwayRoutingService.getWaterwayRoute(
          body.locations,
          body.profile,
        );
        return res.status(200).send(result);
      } catch (err: any) {
        return res.status(400).send({
          statusCode: 400,
          message: err.message || 'Waterway routing failed',
        });
      }
    }

    // Streaming mode: NDJSON with progress events
    // Must set CORS headers manually since res.raw bypasses Fastify plugins
    const origin = req.headers.origin;
    res.raw.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
      ...(origin
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true',
          }
        : {}),
    });

    const write = (obj: Record<string, unknown>) => {
      res.raw.write(JSON.stringify(obj) + '\n');
    };

    try {
      const result = await this.waterwayRoutingService.getWaterwayRoute(
        body.locations,
        body.profile,
        (step, current, total) => {
          write({ type: 'progress', step, current, total });
        },
      );
      write({ type: 'result', data: result });
    } catch (err: any) {
      write({
        type: 'error',
        message: err.message || 'Waterway routing failed',
      });
    }

    res.raw.end();
  }
}
