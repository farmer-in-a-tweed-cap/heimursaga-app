import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserNotificationContext } from '@repo/types';
import {
  getEarlyAccessHoursForAmount,
  getEarlyAccessHoursForTier,
} from '@repo/types/sponsorship-tiers';

import { integerToDecimal } from '@/lib/formatter';

import { EVENTS } from '@/modules/event';
import { EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

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
    earlyAccessEnabled?: boolean;
    expeditionPublicId?: string;
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

      // If early access is enabled, look up qualifying sponsors
      let sponsorHours: Map<number, number> | undefined;
      if (data.earlyAccessEnabled && data.expeditionPublicId) {
        sponsorHours = new Map();
        const sponsorships = await this.prisma.sponsorship.findMany({
          where: {
            OR: [
              {
                expedition_public_id: data.expeditionPublicId,
                status: { in: ['active', 'confirmed'] },
              },
              {
                sponsor: {
                  followers: { some: { followee_id: data.creatorId } },
                },
                type: 'subscription',
                status: 'active',
              },
            ],
          },
          select: {
            sponsor_id: true,
            amount: true,
            type: true,
            tier: { select: { priority: true } },
          },
        });
        // Accumulate cumulative one-time amounts per sponsor
        const oneTimeTotals = new Map<number, number>();
        for (const s of sponsorships) {
          if (s.type === 'subscription' && s.tier?.priority) {
            const hours = getEarlyAccessHoursForTier(s.tier.priority);
            const current = sponsorHours.get(s.sponsor_id) ?? 0;
            if (hours > current) sponsorHours.set(s.sponsor_id, hours);
          } else {
            oneTimeTotals.set(
              s.sponsor_id,
              (oneTimeTotals.get(s.sponsor_id) ?? 0) + s.amount,
            );
          }
        }
        for (const [sponsorId, total] of oneTimeTotals) {
          const hours = getEarlyAccessHoursForAmount(integerToDecimal(total));
          const current = sponsorHours.get(sponsorId) ?? 0;
          if (hours > current) sponsorHours.set(sponsorId, hours);
        }
      }

      for (const follow of followers) {
        // Respect notification preferences
        const prefs =
          (follow.follower?.profile?.notification_preferences as Record<
            string,
            boolean
          >) || {};
        if (prefs.entries_following === false) continue;

        // Determine notification context based on early access
        let context = UserNotificationContext.NEW_ENTRY;
        const body = data.entryTitle;
        if (data.earlyAccessEnabled && sponsorHours) {
          const hours = sponsorHours.get(follow.follower_id) ?? 0;
          if (hours > 0) {
            // Sponsor with early access — send immediately with early access context
            context = UserNotificationContext.NEW_ENTRY_EARLY_ACCESS;
          } else {
            // Non-qualifying follower — skip notification now (they'll get it when embargo lifts)
            continue;
          }
        }

        this.eventService.trigger<IUserNotificationCreatePayload>({
          event: EVENTS.NOTIFICATION_CREATE,
          data: {
            context,
            userId: follow.follower_id,
            mentionUserId: data.creatorId,
            mentionPostId: data.entryInternalId,
            body,
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
      this.logger.error('Failed to send follower expedition notifications', e);
    }
  }
}
