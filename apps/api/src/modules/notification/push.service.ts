import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserNotificationContext } from '@repo/types';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

import { EVENTS } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { IUserNotificationCreatePayload } from './notification.interface';

const expo = new Expo();

/** Map notification context to a human-readable push title + body. */
function buildPushContent(payload: IUserNotificationCreatePayload): {
  title: string;
  body: string;
} {
  const actor = payload.mentionPostTitle || payload.body || '';

  switch (payload.context) {
    case UserNotificationContext.FOLLOW:
      return {
        title: 'New Follower',
        body: 'Someone started following your journal.',
      };
    case UserNotificationContext.SPONSORSHIP:
    case UserNotificationContext.QUICK_SPONSOR: {
      const amt = payload.sponsorshipAmount
        ? `$${(payload.sponsorshipAmount / 100).toFixed(2)}`
        : '';
      return {
        title: 'New Sponsorship',
        body: amt
          ? `You received a ${amt} sponsorship!`
          : 'You received a sponsorship!',
      };
    }
    case UserNotificationContext.COMMENT:
      return {
        title: 'New Comment',
        body: actor
          ? `New comment on "${actor}"`
          : 'Someone commented on your entry.',
      };
    case UserNotificationContext.COMMENT_REPLY:
      return {
        title: 'Reply',
        body: actor
          ? `New reply on "${actor}"`
          : 'Someone replied to your comment.',
      };
    case UserNotificationContext.NEW_ENTRY:
    case UserNotificationContext.NEW_ENTRY_EARLY_ACCESS:
      return {
        title: 'New Entry',
        body: payload.body
          ? `New entry: "${payload.body}"`
          : 'A new journal entry was posted.',
      };
    case UserNotificationContext.NEW_EXPEDITION:
      return {
        title: 'New Expedition',
        body: payload.body
          ? `New expedition: "${payload.body}"`
          : 'A new expedition was published.',
      };
    case UserNotificationContext.EXPEDITION_STARTED:
      return {
        title: 'Expedition Started',
        body: payload.body
          ? `"${payload.body}" has begun!`
          : 'An expedition has started!',
      };
    case UserNotificationContext.EXPEDITION_COMPLETED:
      return {
        title: 'Expedition Completed',
        body: payload.body
          ? `"${payload.body}" is complete!`
          : 'An expedition was completed!',
      };
    case UserNotificationContext.EXPEDITION_NOTE_CREATED:
      return {
        title: 'Expedition Note',
        body: payload.body || 'A new expedition note was logged.',
      };
    case UserNotificationContext.EXPEDITION_NOTE_REPLY:
      return {
        title: 'Note Reply',
        body: payload.body || 'Someone replied to an expedition note.',
      };
    case UserNotificationContext.PASSPORT_COUNTRY:
      return {
        title: 'Passport Stamp',
        body: `You visited ${payload.passportCountryName || 'a new country'}!`,
      };
    case UserNotificationContext.PASSPORT_CONTINENT:
      return {
        title: 'Passport Stamp',
        body: `You explored ${payload.passportContinentName || 'a new continent'}!`,
      };
    case UserNotificationContext.PASSPORT_STAMP:
      return {
        title: 'Achievement',
        body: `You earned the "${payload.passportStampName || 'Achievement'}" stamp!`,
      };
    case UserNotificationContext.NEW_BLUEPRINT:
      return {
        title: 'New Blueprint',
        body: payload.body
          ? `New expedition blueprint: "${payload.body}"`
          : 'A new expedition blueprint was published.',
      };
    default:
      return {
        title: 'Heimursaga',
        body: payload.body || 'You have a new notification.',
      };
  }
}

/** Build a deep-link URL from the notification payload. */
function buildDeepLink(
  payload: IUserNotificationCreatePayload,
): string | undefined {
  switch (payload.context) {
    case UserNotificationContext.FOLLOW:
      return undefined; // no specific deep link
    case UserNotificationContext.COMMENT:
    case UserNotificationContext.COMMENT_REPLY:
      return payload.mentionPostId
        ? `entry/${payload.mentionPostId}`
        : undefined;
    case UserNotificationContext.SPONSORSHIP:
    case UserNotificationContext.QUICK_SPONSOR:
      return payload.expeditionPublicId
        ? `expedition/${payload.expeditionPublicId}`
        : undefined;
    case UserNotificationContext.NEW_ENTRY:
    case UserNotificationContext.NEW_ENTRY_EARLY_ACCESS:
      return payload.mentionPostId
        ? `entry/${payload.mentionPostId}`
        : undefined;
    case UserNotificationContext.NEW_EXPEDITION:
    case UserNotificationContext.EXPEDITION_STARTED:
    case UserNotificationContext.EXPEDITION_COMPLETED:
    case UserNotificationContext.EXPEDITION_NOTE_CREATED:
    case UserNotificationContext.EXPEDITION_NOTE_REPLY:
    case UserNotificationContext.EXPEDITION_CANCELLED:
    case UserNotificationContext.EXPEDITION_DATE_CHANGED:
      return payload.expeditionPublicId
        ? `expedition/${payload.expeditionPublicId}`
        : undefined;
    case UserNotificationContext.PASSPORT_COUNTRY:
    case UserNotificationContext.PASSPORT_CONTINENT:
    case UserNotificationContext.PASSPORT_STAMP:
      return 'profile';
    case UserNotificationContext.NEW_BLUEPRINT:
      return payload.expeditionPublicId
        ? `expedition/${payload.expeditionPublicId}`
        : undefined;
    default:
      return undefined;
  }
}

@Injectable()
export class PushService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  @OnEvent(EVENTS.NOTIFICATION_CREATE)
  async onNotificationCreated(
    payload: IUserNotificationCreatePayload,
  ): Promise<void> {
    try {
      await this.sendPushToUser(payload.userId, payload);
    } catch (e) {
      this.logger.error('Failed to send push notification', e);
    }
  }

  private async sendPushToUser(
    userId: number,
    payload: IUserNotificationCreatePayload,
  ): Promise<void> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { explorer_id: userId, active: true },
      select: { id: true, token: true },
    });

    if (tokens.length === 0) return;

    const { title, body } = buildPushContent(payload);
    const deepLink = buildDeepLink(payload);

    const messages: ExpoPushMessage[] = [];
    for (const device of tokens) {
      if (!Expo.isExpoPushToken(device.token)) {
        // Invalid token — deactivate it
        await this.prisma.deviceToken.update({
          where: { id: device.id },
          data: { active: false },
        });
        continue;
      }

      messages.push({
        to: device.token,
        sound: 'default',
        title,
        body,
        data: deepLink ? { url: deepLink } : undefined,
        badge: 1,
      });
    }

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] =
          await expo.sendPushNotificationsAsync(chunk);
        // Deactivate tokens that are no longer valid
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (
            ticket.status === 'error' &&
            ticket.details?.error === 'DeviceNotRegistered'
          ) {
            const failedToken = (chunk[i] as ExpoPushMessage).to as string;
            await this.prisma.deviceToken.updateMany({
              where: { token: failedToken },
              data: { active: false },
            });
          }
        }
      } catch (e) {
        this.logger.error('Expo push send failed', e);
      }
    }
  }
}
