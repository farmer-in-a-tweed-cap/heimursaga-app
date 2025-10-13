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
import { getStaticMediaUrl } from '@/lib/upload';
import { matchRoles, sortByDate } from '@/lib/utils';

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
          public: true,
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
        data: data.map(({ public_id, title, public: isPublic, ...trip }) => {
          const waypoints = sortByDate({
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
            public: isPublic,
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
    query,
  }: IQueryWithSession<{ username: string }>): Promise<ITripGetAllResponse> {
    try {
      const { username } = query;

      if (!username) throw new ServiceNotFoundException('user not found');

      // get trips
      const where = {
        author: { username },
        public: true,
        deleted_at: null,
      } satisfies Prisma.TripWhereInput;

      const take = 50;

      const results = await this.prisma.trip.count({ where });
      const data = await this.prisma.trip.findMany({
        where,
        select: {
          public_id: true,
          title: true,
          waypoints: {
            where: {
              waypoint: {
                deleted_at: null,
              },
            },
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
          author: {
            select: {
              username: true,
              profile: { select: { picture: true, name: true } },
            },
          },
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      const response: ITripGetAllResponse = {
        results,
        data: data
          .filter(({ waypoints }) => waypoints.length > 1)
          .map(({ public_id, title, author, ...trip }) => {
            const waypoints = sortByDate({
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
              author: author
                ? {
                    username: author.username,
                    picture: getStaticMediaUrl(author.profile.picture),
                    name: author.profile.name,
                  }
                : undefined,
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

      // Allow access for public trips, require auth for private trips
      const isAuthenticated = !!userId;

      const where: Prisma.TripWhereInput = {
        public_id: id,
        deleted_at: null,
        // If not authenticated, only show public trips
        ...(isAuthenticated ? {} : { public: true }),
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
            author: {
              select: {
                username: true,
                role: true,
                profile: {
                  select: {
                    name: true,
                    picture: true,
                  },
                },
              },
            },
            waypoints: {
              where: {
                waypoint: {
                  deleted_at: null,
                },
              },
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
                        date: true,
                        place: true,
                        author: {
                          select: {
                            username: true,
                            profile: {
                              select: {
                                name: true,
                                picture: true,
                              },
                            },
                          },
                        },
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

      const { public_id, title, public: isPublic, waypoints, author } = trip;

      // access control - ensure private trips are only accessible by their authors
      if (!trip.public && (!isAuthenticated || userId !== trip.author_id)) {
        throw new ServiceForbiddenException();
      }

      // Calculate date range from waypoints (dates are mandatory)
      const waypointDates = waypoints.map(({ waypoint: { date, posts } }) => {
        const post = posts?.[0];
        return post ? post.date : date;
      });

      const startDate =
        waypointDates.length > 0
          ? new Date(Math.min(...waypointDates.map((d) => d.getTime())))
          : new Date(); // Fallback to current date if no waypoints
      const endDate =
        waypointDates.length > 0
          ? new Date(Math.max(...waypointDates.map((d) => d.getTime())))
          : new Date(); // Fallback to current date if no waypoints

      const response: ITripGetByIdResponse = {
        id: public_id,
        title,
        public: isPublic,
        startDate,
        endDate,
        author: author
          ? {
              username: author.username,
              picture: getStaticMediaUrl(author.profile.picture),
              creator: author.role === UserRole.CREATOR,
            }
          : undefined,
        waypoints: sortByDate({
          elements: waypoints.map(
            ({ waypoint: { id, lat, lon, title, date, posts } }) => {
              const post = posts?.[0];
              return {
                id,
                lat,
                lon,
                title: post ? post?.title : title,
                date: post ? post.date : date,
                post: post
                  ? {
                      id: post.public_id,
                      title: post.title,
                      content: normalizeText(post.content),
                      author: post.author
                        ? {
                            username: post.author.username,
                            name: post.author.profile.name,
                            picture: getStaticMediaUrl(
                              post.author.profile.picture,
                            ),
                          }
                        : undefined,
                    }
                  : undefined,
              };
            },
          ),
          key: 'date',
          order: 'asc',
        }),
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
          public: payload.public ?? true, // Default to true if not specified
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
      const { title, public: isPublic } = payload;
      const updateData: any = { title };
      if (isPublic !== undefined) {
        updateData.public = isPublic;
      }
      await this.prisma.trip.update({
        where: { id: trip.id },
        data: updateData,
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
}
