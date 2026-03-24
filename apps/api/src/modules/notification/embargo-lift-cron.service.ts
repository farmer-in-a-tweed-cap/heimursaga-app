import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserNotificationContext } from '@repo/types';

import { EVENTS } from '@/modules/event';
import { EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { IUserNotificationCreatePayload } from './notification.interface';

/**
 * Sends notifications to non-qualifying followers when an early-access
 * embargo window expires (48 hours after publish).
 * Runs every 15 minutes.
 */
@Injectable()
export class EmbargoLiftCronService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  @Cron('*/15 * * * *')
  async handleEmbargoLift(): Promise<void> {
    try {
      const now = Date.now();
      // Find entries whose 48h embargo window ended in the last 15 minutes
      const windowStart = new Date(now - 48.25 * 60 * 60 * 1000);
      const windowEnd = new Date(now - 48 * 60 * 60 * 1000);

      const entries = await this.prisma.entry.findMany({
        where: {
          published_at: { gte: windowStart, lte: windowEnd },
          is_draft: false,
          public: true,
          deleted_at: null,
          expedition: {
            early_access_enabled: true,
            deleted_at: null,
          },
        },
        select: {
          id: true,
          public_id: true,
          title: true,
          author_id: true,
        },
      });

      if (entries.length === 0) return;

      for (const entry of entries) {
        // Find all followers who did NOT already receive a notification for this entry
        const existingNotifs = await this.prisma.explorerNotification.findMany({
          where: { mention_entry_id: entry.id },
          select: { explorer_id: true },
        });
        const alreadyNotified = new Set(
          existingNotifs.map((n) => n.explorer_id),
        );

        const followers = await this.prisma.explorerFollow.findMany({
          where: { followee_id: entry.author_id },
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

        let sent = 0;
        for (const follow of followers) {
          if (alreadyNotified.has(follow.follower_id)) continue;

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
              mentionUserId: entry.author_id,
              mentionPostId: entry.id,
              body: entry.title,
            },
          });
          sent++;
        }

        if (sent > 0) {
          this.logger.log(
            `embargo_lift: sent ${sent} notifications for entry ${entry.public_id}`,
          );
        }
      }
    } catch (e) {
      this.logger.error('Failed to process embargo lift notifications', e);
    }
  }
}
