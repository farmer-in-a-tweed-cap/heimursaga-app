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

import { Public, Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import { TrackPointsAppendDto, TrackStartDto } from './track.dto';
import { TrackService } from './track.service';

// Throttling note: appendPoints relies on the app-wide ThrottlerGuard
// (short: 3/s, medium: 20/10s, long: 100/min). A per-route @Throttle
// override is intentionally NOT applied — the global `short` bucket is
// the binding constraint regardless of any looser per-route override,
// so a local override would be dead code. The recorded_at sanity bound
// in TrackService caps the damage from a misbehaving client.

@ApiTags('trips')
@Controller('trips')
export class TrackController {
  constructor(private trackService: TrackService) {}

  // Declared before the `:tripId/...` routes so route ordering can't
  // accidentally let `me` collide with a tripId param. NestJS matches in
  // declaration order; literal segments win regardless, but keeping
  // literal-first is the defensive choice.
  @Get('me/active-track')
  @HttpCode(HttpStatus.OK)
  async getMyActiveTrack(@Session() session: ISession) {
    return await this.trackService.getMyActiveTrack({ session });
  }

  @Post(':tripId/tracks')
  @HttpCode(HttpStatus.CREATED)
  async startTrack(
    @Session() session: ISession,
    @Param('tripId') tripId: string,
    @Body() body: TrackStartDto,
  ) {
    return await this.trackService.startTrack({ session, tripId, body });
  }

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
