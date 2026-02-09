import { Injectable } from '@nestjs/common';
import { ISearchQueryPayload } from '@repo/types';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
} from '@/common/exceptions';
import { ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class SearchService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async search({
    session,
    payload,
  }: ISessionQueryWithPayload<{}, ISearchQueryPayload>) {
    try {
      const { search } = payload;

      if (!search || search.trim().length < 2) {
        return {
          success: true,
          data: {
            users: [],
            entries: [],
          },
        };
      }

      const searchTerm = search.trim().toLowerCase();

      // Search for users by username only (name is private)
      const users = await this.prisma.explorer.findMany({
        where: {
          username: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          username: true,
          role: true,
          profile: {
            select: {
              picture: true,
            },
          },
        },
        take: 10,
        orderBy: [
          {
            username: 'asc',
          },
        ],
      });

      // Search for public entries by title
      const entries = await this.prisma.entry.findMany({
        where: {
          AND: [
            {
              title: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              public: true,
            },
          ],
        },
        select: {
          id: true,
          public_id: true,
          title: true,
          place: true,
          date: true,
          author: {
            select: {
              username: true,
            },
          },
          waypoint: {
            select: {
              lat: true,
              lon: true,
            },
          },
        },
        take: 10,
        orderBy: [
          {
            date: 'desc',
          },
        ],
      });

      return {
        success: true,
        data: {
          users: users.map((user) => ({
            id: user.id.toString(),
            username: user.username,
            picture: user.profile?.picture || null,
            role: user.role,
          })),
          entries: entries.map((entry) => ({
            id: entry.public_id,
            title: entry.title,
            place: entry.place,
            date: entry.date,
            lat: entry.waypoint?.lat || null,
            lon: entry.waypoint?.lon || null,
            author: {
              username: entry.author.username,
            },
          })),
        },
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
