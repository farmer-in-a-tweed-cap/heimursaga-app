import { Injectable } from '@nestjs/common';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { IUserPostsQueryResponse, IUserProfileDetail } from './user.interface';

@Injectable()
export class UserService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async getByUsername({
    username,
    userId,
  }: {
    username: string;
    userId: number;
  }) {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      // get the user
      const user = await this.prisma.user.findFirstOrThrow({
        where: { username },
        select: {
          id: true,
          username: true,
          profile: {
            select: { first_name: true, last_name: true, picture: true },
          },
          created_at: true,
        },
      });

      const response: IUserProfileDetail = {
        username: user.username,
        picture: user.profile.picture,
        firstName: user.profile.first_name,
        lastName: user.profile.last_name,
        memberDate: user.created_at,
        you: userId ? userId === user.id : false,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user not found');
      throw exception;
    }
  }

  async getPosts({ username, userId }: { username: string; userId: number }) {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      const results = await this.prisma.post.count({
        where: {
          draft: false,
          public: true,
          deleted_at: null,
          lat: { not: null },
          lon: { not: null },
          author: { username },
        },
      });
      const data = await this.prisma.post.findMany({
        where: {
          draft: false,
          public: true,
          deleted_at: null,
          lat: { not: null },
          lon: { not: null },
          author: { username },
        },
        select: {
          public_id: true,
          title: true,
          content: true,
          lat: true,
          lon: true,
          date: true,
          place: true,
          created_at: true,
          author: {
            select: {
              username: true,
              profile: {
                select: { first_name: true, last_name: true, picture: true },
              },
            },
          },
        },
      });

      const response: IUserPostsQueryResponse = {
        data: data.map(
          ({
            public_id: id,
            title,
            created_at: date,
            content,
            lat,
            lon,
            author,
          }) => ({
            id,
            title,
            date,
            content,
            lat,
            lon,
            author: {
              name: author?.profile?.first_name,
              username: author?.username,
              picture: author?.profile?.picture,
            },
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user not found');
      throw exception;
    }
  }
}
