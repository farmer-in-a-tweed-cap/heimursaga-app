import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IMapQueryPayload,
  IMapQueryResponse,
  IWaypointCreatePayload,
  IWaypointCreateResponse,
  IWaypointGetByIdResponse,
  IWaypointUpdatePayload,
  MapQueryContext,
  UserRole,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
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
export class MapService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async query({
    query,
    session,
  }: IQueryWithSession<IMapQueryPayload>): Promise<IMapQueryResponse> {
    try {
      const { userId } = session;
      const { context, location, username } = query;

      let where = {
        public: true,
        deleted_at: null,
      } as Prisma.WaypointWhereInput;
      const select = {
        lat: true,
        lon: true,
        date: true,
        posts: {
          select: {
            public_id: true,
            title: true,
            content: true,
            date: true,
            bookmarks: userId
              ? {
                  where: { user_id: userId },
                  select: { post_id: true },
                }
              : undefined,
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
            created_at: true,
          },
          take: 1,
        },
      } satisfies Prisma.WaypointSelect;

      const take = 500;

      // filter by context
      switch (context) {
        case MapQueryContext.GLOBAL:
          where = {
            ...where,
            posts: {
              some: {
                public: true,
                deleted_at: null,
                waypoint_id: { not: null },
              },
            },
          };
          break;
        case MapQueryContext.FOLLOWING:
          if (userId) {
            where = {
              ...where,
              posts: {
                some: {
                  public: true,
                  deleted_at: null,
                  author: {
                    followers: {
                      some: {
                        follower_id: userId,
                      },
                    },
                  },
                },
              },
            };
          }
          break;
        case MapQueryContext.USER:
          where = {
            ...where,
            posts: {
              some: {
                public_id: { not: null },
                public: true,
                deleted_at: null,
                author: {
                  username,
                },
              },
            },
          };
          break;
        default:
          throw new ServiceBadRequestException('map query filter invalid');
      }

      // filter by location
      if (location) {
        const { sw, ne } = location.bounds;

        const minLat = sw.lat;
        const maxLat = ne.lat;
        const minLon = sw.lon;
        const maxLon = ne.lon;

        where = {
          ...where,
          AND: [
            { lat: { gte: minLat } },
            { lat: { lte: maxLat } },
            { lon: { gte: minLon } },
            { lon: { lte: maxLon } },
          ],
        };
      }

      const results = await this.prisma.waypoint.count({ where });
      const waypoints = await this.prisma.waypoint.findMany({
        where,
        select,
        take,
      });

      const response: IMapQueryResponse = {
        results,
        waypoints: waypoints
          .map(({ lat, lon, posts }) => {
            const post = posts[0];
            return {
              lat,
              lon,
              date: post ? post.date : undefined,
              post: post
                ? {
                    id: post.public_id,
                    title: post.title,
                    content: post.content.slice(0, 100),
                    author: {
                      username: post.author.username,
                      name: post.author.profile.name,
                      picture: getStaticMediaUrl(post.author.profile.picture),
                      creator: post.author.role === UserRole.CREATOR,
                    },
                    bookmarked: userId ? post.bookmarks.length > 0 : false,
                  }
                : undefined,
            };
          })
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('no posts found');
      throw exception;
    }
  }

  async getWaypointById({
    query,
    session,
  }: IQueryWithSession<{ id: number }>): Promise<IWaypointGetByIdResponse> {
    try {
      const { id } = query;

      if (!id) throw new ServiceNotFoundException('waypoint not found');

      // get a waypoint
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id, deleted_at: null },
          select: {
            id: true,
            title: true,
            date: true,
            lat: true,
            lon: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      const response: IWaypointGetByIdResponse = {
        ...waypoint,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('waypoint not found');
      throw exception;
    }
  }

  async createWaypoint({
    payload,
    session,
  }: ISessionQueryWithPayload<
    {},
    IWaypointCreatePayload
  >): Promise<IWaypointCreateResponse> {
    try {
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      const { lat, lon, title, date, tripId } = payload;
      let trip: { id: number } | null = null;

      // get a trip
      if (tripId) {
        trip = await this.prisma.trip
          .findFirstOrThrow({
            where: { public_id: tripId },
            select: { id: true },
          })
          .catch(() => null);
      }

      // create a waypoint
      const waypoint = await this.prisma.$transaction(async (tx) => {
        const waypoint = await tx.waypoint
          .create({
            data: {
              lat,
              lon,
              title,
              date,
              author: {
                connect: { id: userId },
              },
              trips: trip ? { create: { trip_id: trip.id } } : undefined,
            },
            select: { id: true },
          })
          .catch(() => {
            throw new ServiceBadRequestException('waypoint not created');
          });

        return { id: waypoint.id };
      });

      return { id: waypoint.id };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('waypoint not created');
      throw exception;
    }
  }

  async updateWaypoint({
    query,
    payload,
    session,
  }: ISessionQueryWithPayload<
    { id: number },
    IWaypointUpdatePayload
  >): Promise<void> {
    try {
      const { id } = query;
      const { userId } = session;

      if (!id) throw new ServiceNotFoundException('waypoint not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get a waypoint
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id, deleted_at: null, author_id: userId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });
      const { lat, lon, title, date } = payload;

      // update the waypoint
      await this.prisma.waypoint
        .update({
          where: { id: waypoint.id },
          data: {
            lat,
            lon,
            title,
            date,
          },
        })
        .catch(() => {
          throw new ServiceBadRequestException('waypoint not updated');
        });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('waypoint not updated');
      throw exception;
    }
  }

  async deleteWaypoint({
    query,
    session,
  }: ISessionQuery<{ id: number }>): Promise<void> {
    try {
      const { id } = query;
      const { userId } = session;

      if (!id) throw new ServiceNotFoundException('waypoint not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get a waypoint
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id, deleted_at: null, author_id: userId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      // delete the waypoint
      await this.prisma.waypoint
        .update({
          where: { id: waypoint.id },
          data: { deleted_at: dateformat().toDate() },
        })
        .catch(() => {
          throw new ServiceBadRequestException('waypoint not deleted');
        });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('waypoint not deleted');
      throw exception;
    }
  }
}
