import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ITripCreatePayload,
  ITripCreateResponse,
  ITripGetAllResponse,
  ITripGetByIdResponse,
  ITripUpdatePayload,
  IWaypointCreatePayload,
  IWaypointDetail,
  IWaypointUpdatePayload,
  UserRole,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { normalizeText } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { matchRoles, sortByKey } from '@/lib/utils';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import {
  IQueryWithSession,
  ISessionQuery,
  ISessionQueryWithPayload,
} from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class TripService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async getTrips({
    session,
  }: IQueryWithSession<{}>): Promise<ITripGetAllResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      if (!userId) throw new ServiceForbiddenException();

      let where: Prisma.TripWhereInput = {
        deleted_at: null,
      };

      const take = 50;

      // query based on the user role
      switch (userRole) {
        case UserRole.CREATOR:
          where = {
            ...where,
            author_id: userId,
          };
          break;
        case UserRole.USER:
          where = {
            ...where,
            public: true,
          };
          break;
        default:
          throw new ServiceForbiddenException();
      }

      // get trips
      const results = await this.prisma.trip.count({ where });
      const data = await this.prisma.trip.findMany({
        where,
        select: {
          public_id: true,
          title: true,
          waypoints: {
            select: {
              waypoint: {
                select: {
                  id: true,
                  title: true,
                  lat: true,
                  lon: true,
                  date: true,
                },
              },
            },
          },
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      const response: ITripGetAllResponse = {
        results,
        data: data.map(({ public_id, title, ...trip }) => {
          const waypoints = sortByKey({
            elements: trip.waypoints.map(({ waypoint }) => ({ ...waypoint })),
            key: 'date',
            order: 'asc',
          }) as IWaypointDetail[];

          const startDate =
            waypoints.length >= 1 ? waypoints[0]?.date : undefined;
          const endDate =
            waypoints.length >= 1
              ? waypoints[waypoints.length - 1]?.date
              : undefined;

          return {
            id: public_id,
            title,
            startDate,
            endDate,
            waypointsCount: waypoints.length,
            waypoints: [],
          };
        }),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('trips not found');
      throw exception;
    }
  }

  async getTripsByUsername({
    session,
    query,
  }: IQueryWithSession<{ username: string }>): Promise<ITripGetAllResponse> {
    try {
      const { username } = query;
      const { userRole } = session;

      if (!username) throw new ServiceNotFoundException('user not found');

      // get the user
      const user = await this.prisma.user.findFirstOrThrow({
        where: { username },
      });

      // get trips
      let where: Prisma.TripWhereInput = {
        deleted_at: null,
      };

      const take = 50;

      const results = await this.prisma.trip.count({ where });
      const data = await this.prisma.trip.findMany({
        where,
        select: {
          public_id: true,
          title: true,
          waypoints: {
            select: {
              waypoint: {
                select: {
                  id: true,
                  title: true,
                  lat: true,
                  lon: true,
                  date: true,
                },
              },
            },
          },
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      const response: ITripGetAllResponse = {
        results,
        data: data.map(({ public_id, title, ...trip }) => {
          const waypoints = sortByKey({
            elements: trip.waypoints.map(({ waypoint }) => ({ ...waypoint })),
            key: 'date',
            order: 'asc',
          }) as IWaypointDetail[];

          const startDate =
            waypoints.length >= 1 ? waypoints[0]?.date : undefined;
          const endDate =
            waypoints.length >= 1
              ? waypoints[waypoints.length - 1]?.date
              : undefined;

          return {
            id: public_id,
            title,
            startDate,
            endDate,
            waypointsCount: waypoints.length,
            waypoints: [],
          };
        }),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('trips not found');
      throw exception;
    }
  }

  async getTripById({
    session,
    query,
  }: IQueryWithSession<{ id: string }>): Promise<ITripGetByIdResponse> {
    try {
      const { id } = query;
      const { userId, userRole } = session;

      if (!id) throw new ServiceNotFoundException('trip not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      let where: Prisma.TripWhereInput = {
        public_id: id,
        deleted_at: null,
      };

      // get a trip
      const trip = await this.prisma.trip
        .findFirstOrThrow({
          where,
          select: {
            public_id: true,
            public: true,
            title: true,
            author_id: true,
            waypoints: {
              select: {
                waypoint: {
                  select: {
                    id: true,
                    title: true,
                    lat: true,
                    lon: true,
                    date: true,
                    posts: {
                      select: {
                        public_id: true,
                        title: true,
                        content: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('trip not found');
        });

      const { public_id, title, waypoints } = trip;

      // access control
      if (!trip.public && userId !== trip.author_id) {
        throw new ServiceForbiddenException();
      }

      const response: ITripGetByIdResponse = {
        id: public_id,
        title,
        startDate: new Date(),
        endDate: new Date(),
        waypoints: waypoints.map(
          ({ waypoint: { id, lat, lon, title, date, posts } }) => {
            const post = posts?.[0];
            return {
              id,
              lat,
              lon,
              title,
              date,
              post: post
                ? {
                    id: post.public_id,
                    title: post.title,
                    content: normalizeText(post.content),
                  }
                : undefined,
            };
          },
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('trip not found');
      throw exception;
    }
  }

  async createTrip({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    ITripCreatePayload
  >): Promise<ITripCreateResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // create a trip
      const trip = await this.prisma.trip.create({
        data: {
          public_id: generator.publicId(),
          title: payload.title,
          author_id: userId,
        },
        select: {
          public_id: true,
          waypoints: {
            select: {
              waypoint: {
                select: { lat: true, lon: true },
              },
            },
          },
        },
      });

      const response: ITripCreateResponse = { tripId: trip.public_id };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('trip not created');
      throw exception;
    }
  }

  async updateTrip({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { id: string },
    ITripUpdatePayload
  >): Promise<void> {
    try {
      const { id } = query;
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // get the trip
      if (!id) throw new ServiceNotFoundException('trip not found');
      const trip = await this.prisma.trip.findFirstOrThrow({
        where: { public_id: id, author_id: userId, deleted_at: null },
        select: { id: true },
      });

      // update the trip
      const { title } = payload;
      await this.prisma.trip.update({
        where: { id: trip.id },
        data: { title },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('trip not updated');
      throw exception;
    }
  }

  async deleteTrip({
    session,
    query,
  }: ISessionQuery<{ id: string }>): Promise<void> {
    try {
      const { id } = query;
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // get the trip
      if (!id) throw new ServiceNotFoundException('trip not found');
      const trip = await this.prisma.trip.findFirstOrThrow({
        where: { public_id: id, author_id: userId, deleted_at: null },
        select: { id: true },
      });

      // delete the trip
      await this.prisma.trip.update({
        where: { id: trip.id },
        data: { deleted_at: dateformat().toDate() },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('trip not deleted');
      throw exception;
    }
  }

  async createTripWaypoint({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { tripId: string },
    IWaypointCreatePayload
  >): Promise<void> {
    try {
      const { tripId } = query;
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // get a trip
      if (!tripId) throw new ServiceNotFoundException('trip not found');
      const trip = await this.prisma.trip
        .findFirstOrThrow({
          where: { public_id: tripId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('trip not found');
        });

      // create a waypoint
      const { title, lat, lon, date } = payload;
      await this.prisma.tripWaypoint.create({
        data: {
          waypoint: {
            create: {
              title,
              lat,
              lon,
              date,
            },
          },

          trip: {
            connect: {
              id: trip.id,
            },
          },
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('waypoint not created');
      throw exception;
    }
  }

  async updateTripWaypoint({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { tripId: string; waypointId: number },
    IWaypointUpdatePayload
  >): Promise<void> {
    try {
      const { tripId, waypointId } = query;
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // query based on the user role
      let where: Prisma.TripWhereInput = {
        public_id: tripId,
        deleted_at: null,
      };

      switch (userRole) {
        case UserRole.CREATOR:
          where = { ...where, author_id: userId };
          break;
        default:
          throw new ServiceForbiddenException();
      }

      // get the trip
      if (!tripId) throw new ServiceNotFoundException('trip not found');
      await this.prisma.trip
        .findFirstOrThrow({
          where,
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('trip not found');
        });

      // get the waypoint
      if (!waypointId) throw new ServiceNotFoundException('waypoint not found');
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id: waypointId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      // update the waypoint
      const { title, lat, lon, date } = payload;
      await this.prisma.waypoint.update({
        where: { id: waypoint.id },
        data: {
          title,
          lat,
          lon,
          date,
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('waypoint not updated');
      throw exception;
    }
  }

  async deleteTripWaypoint({
    session,
    query,
  }: ISessionQuery<{ tripId: string; waypointId: number }>): Promise<void> {
    try {
      const { tripId, waypointId } = query;
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // query based on the user role
      let where: Prisma.TripWhereInput = {
        public_id: tripId,
        deleted_at: null,
      };

      switch (userRole) {
        case UserRole.CREATOR:
          where = { ...where, author_id: userId };
          break;
        default:
          throw new ServiceForbiddenException();
      }

      // get the trip
      if (!tripId) throw new ServiceNotFoundException('trip not found');
      const trip = await this.prisma.trip
        .findFirstOrThrow({
          where,
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('trip not found');
        });

      // get the waypoint
      if (!waypointId) throw new ServiceNotFoundException('waypoint not found');
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id: waypointId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      // delete the waypoint
      await this.prisma.tripWaypoint.deleteMany({
        where: {
          trip_id: trip.id,
          waypoint_id: waypoint.id,
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('waypoint not updated');
      throw exception;
    }
  }

  // --
  async ddeleteTripWaypoint({
    session,
    query,
  }: ISessionQuery<{ tripId: string; waypointId: number }>): Promise<void> {
    try {
      const { tripId, waypointId } = query;
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // query based on the user role
      let where: Prisma.TripWhereInput = {
        public_id: tripId,
        deleted_at: null,
      };

      switch (userRole) {
        case UserRole.CREATOR:
          where = { ...where, author_id: userId };
          break;
        default:
          throw new ServiceForbiddenException();
      }

      // get the trip
      if (!tripId) throw new ServiceNotFoundException('trip not found');
      const trip = await this.prisma.trip
        .findFirstOrThrow({
          where,
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('trip not found');
        });

      // delete the waypoint
      if (!waypointId) throw new ServiceNotFoundException('waypoint not found');
      await this.prisma.tripWaypoint.deleteMany({
        where: {
          trip_id: trip.id,
          waypoint_id: waypointId,
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('waypoint not deleted');
      throw exception;
    }
  }
}
