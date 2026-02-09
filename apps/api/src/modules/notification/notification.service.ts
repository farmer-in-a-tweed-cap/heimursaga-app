import { EVENTS, IEventMessage } from '../event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { generator } from '@/lib/generator';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
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
      if (e.status) throw e;
      throw new ServiceInternalException();
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
        passportCountryCode,
        passportCountryName,
        passportContinentCode,
        passportContinentName,
        passportStampId,
        passportStampName,
      } = payload;

      // create a notification
      await this.prisma.explorerNotification.create({
        data: {
          public_id: generator.publicId(),
          context,
          body,
          explorer: { connect: { id: userId } },
          mention_explorer: mentionUserId
            ? { connect: { id: mentionUserId } }
            : undefined,
          mention_entry: mentionPostId
            ? { connect: { id: mentionPostId } }
            : undefined,
          sponsorship_type: sponsorshipType,
          sponsorship_amount: sponsorshipAmount,
          sponsorship_currency: sponsorshipCurrency,
          passport_country_code: passportCountryCode,
          passport_country_name: passportCountryName,
          passport_continent_code: passportContinentCode,
          passport_continent_name: passportContinentName,
          passport_stamp_id: passportStampId,
          passport_stamp_name: passportStampName,
        },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  @OnEvent(EVENTS.NOTIFICATION_CREATE)
  async onCreate(payload: IUserNotificationCreatePayload): Promise<void> {
    this.create({ query: {}, payload });
  }
}
