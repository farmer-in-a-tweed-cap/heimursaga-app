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

  async getByUsername({ username }: { username: string }) {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      // get the user
      const data = await this.prisma.user.findFirstOrThrow({
        where: { username },
        select: {
          username: true,
          profile: {
            select: { first_name: true, last_name: true, picture: true },
          },
          created_at: true,
        },
      });

      const response: IUserProfileDetail = {
        username: data.username,
        picture: data.profile.picture,
        firstName: data.profile.first_name,
        lastName: data.profile.last_name,
        memberDate: data.created_at,
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
