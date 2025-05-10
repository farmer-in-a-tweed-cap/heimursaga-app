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
import { ApiTags } from '@nestjs/swagger';

import { Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import {
  TripCreateDto,
  TripParamDto,
  TripWaypointParamDto,
  WaypointCreateDto,
  WaypointUpdateDto,
} from './trip.dto';
import { TripService } from './trip.service';

@ApiTags('trips')
@Controller('trips')
export class TripController {
  constructor(private tripService: TripService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getTrips(@Session() session: ISession) {
    return await this.tripService.getTrips({
      query: {},
      session,
    });
  }

  @Get(':trip_id')
  @HttpCode(HttpStatus.OK)
  async getTripById(
    @Session() session: ISession,
    @Param() param: TripParamDto,
  ) {
    return await this.tripService.getTripById({
      query: { id: param.trip_id },
      session,
    });
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createTrip(@Session() session: ISession, @Body() body: TripCreateDto) {
    return await this.tripService.createTrip({
      query: {},
      payload: body,
      session,
    });
  }

  @Put(':trip_id')
  @HttpCode(HttpStatus.OK)
  async updateTrip(
    @Session() session: ISession,
    @Param() param: TripParamDto,
    @Body() body: TripCreateDto,
  ) {
    return await this.tripService.updateTrip({
      query: { id: param.trip_id },
      payload: body,
      session,
    });
  }

  @Delete(':trip_id')
  @HttpCode(HttpStatus.OK)
  async deleteTrip(@Session() session: ISession, @Param() param: TripParamDto) {
    return await this.tripService.deleteTrip({
      query: { id: param.trip_id },
      session,
    });
  }

  @Post(':trip_id/waypoints')
  @HttpCode(HttpStatus.OK)
  async createTripWaypoint(
    @Session() session: ISession,
    @Param() param: TripParamDto,
    @Body() body: WaypointCreateDto,
  ) {
    return await this.tripService.createTripWaypoint({
      query: { tripId: param.trip_id },
      payload: body,
      session,
    });
  }

  @Put(':trip_id/waypoints/:waypoint_id')
  @HttpCode(HttpStatus.OK)
  async updateTripWaypoint(
    @Session() session: ISession,
    @Param() param: TripWaypointParamDto,
    @Body() body: WaypointUpdateDto,
  ) {
    return await this.tripService.updateTripWaypoint({
      query: { tripId: param.trip_id, waypointId: param.waypoint_id },
      payload: body,
      session,
    });
  }

  @Delete(':trip_id/waypoints/:waypoint_id')
  @HttpCode(HttpStatus.OK)
  async deleteTripWaypoint(
    @Session() session: ISession,
    @Param() param: TripWaypointParamDto,
  ) {
    return await this.tripService.deleteTripWaypoint({
      query: { tripId: param.trip_id, waypointId: param.waypoint_id },
      session,
    });
  }
}
