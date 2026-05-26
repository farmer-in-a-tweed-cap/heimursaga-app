import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public, Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import { TrackPointsAppendDto, TrackStartDto } from './track.dto';
import { TrackService } from './track.service';

@ApiTags('trips')
@Controller('trips')
export class TrackController {
  constructor(private trackService: TrackService) {}

  @Post(':tripId/tracks')
  @HttpCode(HttpStatus.CREATED)
  async startTrack(
    @Session() session: ISession,
    @Param('tripId') tripId: string,
    @Body() body: TrackStartDto,
  ) {
    return await this.trackService.startTrack({ session, tripId, body });
  }

  // Per-user ingest rate cap. 60 batches per 10s is generous for the mobile
  // uploader (which posts every ~60s on the typical cadence) but stops a
  // runaway client from DOS-ing the endpoint.
  @Throttle({ medium: { limit: 60, ttl: 10000 } })
  @Post(':tripId/tracks/:trackId/points')
  @HttpCode(HttpStatus.OK)
  async appendPoints(
    @Session() session: ISession,
    @Param('tripId') tripId: string,
    @Param('trackId', ParseIntPipe) trackId: number,
    @Body() body: TrackPointsAppendDto,
  ) {
    return await this.trackService.appendPoints({
      session,
      tripId,
      trackId,
      points: body.points,
    });
  }

  @Post(':tripId/tracks/:trackId/heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(
    @Session() session: ISession,
    @Param('tripId') tripId: string,
    @Param('trackId', ParseIntPipe) trackId: number,
  ) {
    return await this.trackService.heartbeat({ session, tripId, trackId });
  }

  @Post(':tripId/tracks/:trackId/stop')
  @HttpCode(HttpStatus.OK)
  async stopTrack(
    @Session() session: ISession,
    @Param('tripId') tripId: string,
    @Param('trackId', ParseIntPipe) trackId: number,
  ) {
    return await this.trackService.stopTrack({ session, tripId, trackId });
  }

  // Public read — visibility is enforced inside the service against the
  // expedition's live_track_visibility setting.
  @Public()
  @Get(':tripId/tracks/current')
  @HttpCode(HttpStatus.OK)
  async getCurrentTrack(
    @Session() session: ISession,
    @Param('tripId') tripId: string,
    @Query('maxPoints') maxPoints?: string,
  ) {
    const cap = maxPoints ? parseInt(maxPoints, 10) : undefined;
    return await this.trackService.getCurrentTrack({
      session,
      tripId,
      maxPoints: cap && !isNaN(cap) ? cap : undefined,
    });
  }
}
