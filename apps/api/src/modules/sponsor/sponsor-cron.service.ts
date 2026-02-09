import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { SponsorBillingService } from './sponsor-billing.service';

@Injectable()
export class SponsorCronService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private sponsorBillingService: SponsorBillingService,
  ) {}

  /**
   * Daily at 3:00 AM UTC — pause billing for explorers resting 30+ days.
   */
  @Cron('0 3 * * *')
  async handleRestingBillingPause(): Promise<void> {
    this.logger.log('[CRON] Running resting billing pause check');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find explorers resting for 30+ days who still have active subscriptions
      // Use a single query with subscription count to reduce DB roundtrips
      const restingExplorers = await this.prisma.explorer.findMany({
        where: {
          resting_since: { not: null, lte: thirtyDaysAgo },
          received_sponsorships: {
            some: {
              type: 'subscription',
              status: 'active',
              stripe_subscription_id: { not: null },
              deleted_at: null,
            },
          },
        },
        select: { id: true },
      });

      for (const explorer of restingExplorers) {
        await this.sponsorBillingService.pauseAllSponsorships(explorer.id);
      }

      this.logger.log(
        `[CRON] Resting billing pause check complete. Processed ${restingExplorers.length} explorers.`,
      );
    } catch (e) {
      this.logger.error(`[CRON] Resting billing pause failed: ${e.message}`);
    }
  }

  /**
   * Daily at 4:00 AM UTC — auto-cancel for explorers resting 90+ days.
   * Staggered 1 hour after pause job to avoid overlap.
   */
  @Cron('0 4 * * *')
  async handleRestingAutoCancel(): Promise<void> {
    this.logger.log('[CRON] Running resting auto-cancel check');

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Find explorers resting for 90+ days who still have paused subscriptions
      const restingExplorers = await this.prisma.explorer.findMany({
        where: {
          resting_since: { not: null, lte: ninetyDaysAgo },
          received_sponsorships: {
            some: {
              type: 'subscription',
              status: 'paused',
              stripe_subscription_id: { not: null },
              deleted_at: null,
            },
          },
        },
        select: { id: true },
      });

      for (const explorer of restingExplorers) {
        await this.sponsorBillingService.cancelAllPausedSponsorships(
          explorer.id,
        );
      }

      this.logger.log(
        `[CRON] Resting auto-cancel check complete. Processed ${restingExplorers.length} explorers.`,
      );
    } catch (e) {
      this.logger.error(`[CRON] Resting auto-cancel failed: ${e.message}`);
    }
  }
}
