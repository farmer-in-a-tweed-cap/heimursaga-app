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

import { IUserProfileDetail } from './user.interface';

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

      console.log({
        userId,
        i: user.id,
        you: userId ? userId === user.id : false,
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
}
