import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IMapQueryPayload, IMapQueryResponse } from '@repo/types';

import { getStaticMediaUrl } from '@/lib/upload';

import {
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
      const { location } = query;

      let where = {
        public: true,
        posts: {
          every: {
            public: true,
            waypoint_id: { not: null },
          },
        },
      } as Prisma.WaypointWhereInput;

      const take = 50;

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
          posts: {
            select: {
              public_id: true,
              title: true,
              content: true,
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
            take: 1,
          },
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      const response: IMapQueryResponse = {
        results,
        waypoints: waypoints.map(({ lat, lon, posts }) => {
          const post = posts[0];
          return {
            lat,
            lon,
            post: post
              ? {
                  id: post.public_id,
                  title: post.title,
                  content: post.content.slice(0, 100),
                  author: {
                    username: post.author.username,
                    name: post.author.profile.name,
                    picture: getStaticMediaUrl(post.author.profile.picture),
                  },
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
        : new ServiceForbiddenException('no posts found');
      throw exception;
    }
  }
}
