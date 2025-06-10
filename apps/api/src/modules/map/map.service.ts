import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IMapQueryPayload,
  IMapQueryResponse,
  IWaypointGetByIdResponse,
  MapQueryContext,
  UserRole,
} from '@repo/types';

import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { IQueryWithSession } from '@/common/interfaces';
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
      let select = {
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
      const { userId } = session;
      const { id } = query;

      if (!id) throw new ServiceNotFoundException('waypoint not found');

      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id },
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
}
