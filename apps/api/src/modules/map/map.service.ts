import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IMapQueryPayload,
  IMapQueryResponse,
  MapQueryFilter,
  UserRole,
} from '@repo/types';

import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
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
      const { filter, location } = query;

      let where = {
        public: true,
      } as Prisma.WaypointWhereInput;

      const take = 500;

      switch (filter) {
        case MapQueryFilter.GLOBAL:
          where = {
            ...where,
            posts: {
              every: {
                public: true,
                deleted_at: null,
                waypoint_id: { not: null },
              },
            },
          };
          break;
        case MapQueryFilter.FOLLOWING:
          if (userId) {
            where = {
              ...where,
              posts: {
                every: {
                  public: true,
                  deleted_at: null,
                  waypoint_id: { not: null },
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
        default:
          throw new ServiceBadRequestException('map query filter invalid');
      }

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
        select: {
          lat: true,
          lon: true,
          date: true,
          posts: {
            select: {
              public_id: true,
              title: true,
              content: true,
              date: true,
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
        },
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
}
