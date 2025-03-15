import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { ISearchQueryPayload } from './search.interface';

@Injectable()
export class SearchService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async search(payload: ISearchQueryPayload) {
    try {
      const { userId, location } = payload;

      console.log('search');

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
        date: true,
        likesCount: true,
        bookmarksCount: true,
        created_at: true,
      } as Prisma.PostSelect;

      const take = 50;
      const page = 1;

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
            author: {
              select: {
                username: true,
                profile: {
                  select: { first_name: true, picture: true },
                },
              },
            },
          },
          take,
          orderBy: [{ id: 'desc' }],
        })
        .then((searchs) =>
          searchs.map((search) => ({
            id: search.public_id,
            lat: search.lat,
            lon: search.lon,
            place: search.place,
            date: search.date,
            title: search.title,
            author: {
              username: search.author?.username,
              name: search.author?.profile?.first_name,
              picture: search.author?.profile?.picture,
            },
          })),
        );

      const geojson = {
        type: 'FeatureCollection',
        features: data.map(({ id, title, lon, lat }) => ({
          type: 'Feature',
          properties: {
            id,
            title,
          },
          geometry: { type: 'Point', coordinates: [lon, lat, 0.0] },
        })),
      };

      return { results, data, geojson };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('no posts found');
      throw exception;
    }
  }
}
