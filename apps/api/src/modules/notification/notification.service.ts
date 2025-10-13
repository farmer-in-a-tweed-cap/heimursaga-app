import { EVENTS, IEventMessage } from '../event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { generator } from '@/lib/generator';

import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import {
  IQueryWithSession,
  ISessionQueryWithPayload,
} from '@/common/interfaces';
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
  }: ISessionQueryWithPayload<
    {},
    IUserNotificationCreatePayload
  >): Promise<void> {
    try {
      const {
        userId,
        mentionUserId,
        mentionPostId,
        context,
        body,
        sponsorshipType,
        sponsorshipAmount,
        sponsorshipCurrency,
      } = payload;

      // create a notification
      await this.prisma.userNotification.create({
        data: {
          public_id: generator.publicId(),
          context,
          body,
          user: { connect: { id: userId } },
          mention_user: { connect: { id: mentionUserId } },
          mention_post: mentionPostId
            ? { connect: { id: mentionPostId } }
            : undefined,
          sponsorship_type: sponsorshipType,
          sponsorship_amount: sponsorshipAmount,
          sponsorship_currency: sponsorshipCurrency,
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

  @OnEvent(EVENTS.NOTIFICATION_CREATE)
  async onCreate(payload: IUserNotificationCreatePayload): Promise<void> {
    this.create({ query: {}, payload });
  }
}
