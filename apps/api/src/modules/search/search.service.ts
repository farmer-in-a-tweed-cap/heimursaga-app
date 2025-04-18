import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ISearchQueryPayload, ISearchQueryResponse } from '@repo/types';

import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { IQueryWithSession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class SearchService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async search({
    query,
    session,
  }: IQueryWithSession<ISearchQueryPayload>): Promise<ISearchQueryResponse> {
    try {
      const { location } = query;
      const { userId } = session;

      let where = {
        public_id: { not: null },
        public: true,
        deleted_at: null,
      } as Prisma.PostWhereInput;

      const select = {
        public_id: true,
        title: true,
        lat: true,
        lon: true,
        place: true,
        content: true,
        date: true,
        likes_count: true,
        bookmarks_count: true,
        created_at: true,
      } as Prisma.PostSelect;

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

      // search searchs
      const results = await this.prisma.post.count({ where });
      const data = await this.prisma.post
        .findMany({
          where,
          select: {
            ...select,
            // check if the session user has bookmarked this post
            bookmarks: userId
              ? {
                  where: { user_id: userId },
                  select: { post_id: true },
                }
              : undefined,
            author: {
              select: {
                username: true,
                profile: {
                  select: { name: true, picture: true },
                },
              },
            },
          },
          take,
          orderBy: [{ id: 'desc' }],
        })
        .then((posts) =>
          posts.map((post) => ({
            id: post.public_id,
            lat: post.lat,
            lon: post.lon,
            place: post.place,
            date: post.date,
            title: post.title,
            content: post.content?.slice(0, 140),
            bookmarked: userId ? post.bookmarks.length > 0 : false,
            author: {
              username: post.author?.username,
              name: post.author?.profile?.name,
              picture: post.author?.profile?.picture
                ? getStaticMediaUrl(post.author?.profile?.picture)
                : undefined,
            },
          })),
        );

      const geojson = {
        type: 'FeatureCollection',
        features: data.map(({ id, title, content, date, lon, lat }) => ({
          type: 'Feature',
          properties: {
            id,
            title,
            content,
            date,
          },
          geometry: {
            type: 'Point',
            coordinates: [lon, lat, 0.0] as [number, number, number],
          },
        })),
      };

      return {
        results,
        data,
        geojson,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('no posts found');
      throw exception;
    }
  }
}
