import { EVENTS, IEventMessage } from '../event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { generator } from '@/lib/generator';

import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { IPayloadWithSession, IQueryWithSession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { IUserNotificationCreatePayload } from './notification.interface';

@Injectable()
export class NotificationService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async getUserNotifications({ session }: IQueryWithSession): Promise<void> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // get the user
      // get the notifications
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('notifications not found');
      throw exception;
    }
  }

  async create({
    payload,
  }: IPayloadWithSession<IUserNotificationCreatePayload>): Promise<void> {
    try {
      console.log({ payload });

      const { userId, mentionUserId, mentionPostId, context } = payload;

      // create a notification
      await this.prisma.userNotification.create({
        data: {
          public_id: generator.publicId(),
          context,
          user: { connect: { id: userId } },
          mention_user: { connect: { id: mentionUserId } },
          mention_post: mentionPostId
            ? { connect: { id: mentionPostId } }
            : undefined,
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('notification not created');
      throw exception;
    }
  }

  @OnEvent(EVENTS.NOTIFICATIONS.CREATE)
  async onCreate(payload: IUserNotificationCreatePayload): Promise<void> {
    this.create({ payload });
  }
}
