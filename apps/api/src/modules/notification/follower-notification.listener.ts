import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserNotificationContext } from '@repo/types';

import { EVENTS } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { EventService } from '@/modules/event';

import { IUserNotificationCreatePayload } from './notification.interface';

@Injectable()
export class FollowerNotificationListener {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  @OnEvent(EVENTS.ENTRY_CREATED)
  async onEntryCreated(data: {
    entryId: string;
    entryInternalId: number;
    creatorId: number;
    entryTitle?: string;
  }) {
    try {
      const followers = await this.prisma.explorerFollow.findMany({
        where: { followee_id: data.creatorId },
        select: {
          follower_id: true,
          follower: {
            select: {
              profile: {
                select: { notification_preferences: true },
              },
            },
          },
        },
      });

      for (const follow of followers) {
        // Respect notification preferences
        const prefs =
          (follow.follower?.profile?.notification_preferences as Record<
            string,
            boolean
          >) || {};
        if (prefs.entries_following === false) continue;

        this.eventService.trigger<IUserNotificationCreatePayload>({
          event: EVENTS.NOTIFICATION_CREATE,
          data: {
            context: UserNotificationContext.NEW_ENTRY,
            userId: follow.follower_id,
            mentionUserId: data.creatorId,
            mentionPostId: data.entryInternalId,
            body: data.entryTitle,
          },
        });
      }
    } catch (e) {
      this.logger.error('Failed to send follower entry notifications', e);
    }
  }

  @OnEvent(EVENTS.EXPEDITION_PUBLISHED)
  async onExpeditionPublished(data: {
    expeditionPublicId: string;
    creatorId: number;
    expeditionTitle?: string;
  }) {
    try {
      const followers = await this.prisma.explorerFollow.findMany({
        where: { followee_id: data.creatorId },
        select: {
          follower_id: true,
          follower: {
            select: {
              profile: {
                select: { notification_preferences: true },
              },
            },
          },
        },
      });

      for (const follow of followers) {
        const prefs =
          (follow.follower?.profile?.notification_preferences as Record<
            string,
            boolean
          >) || {};
        if (prefs.entries_following === false) continue;

        this.eventService.trigger<IUserNotificationCreatePayload>({
          event: EVENTS.NOTIFICATION_CREATE,
          data: {
            context: UserNotificationContext.NEW_EXPEDITION,
            userId: follow.follower_id,
            mentionUserId: data.creatorId,
            expeditionPublicId: data.expeditionPublicId,
            body: data.expeditionTitle,
          },
        });
      }
    } catch (e) {
      this.logger.error(
        'Failed to send follower expedition notifications',
        e,
      );
    }
  }
}
