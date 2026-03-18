import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SponsorshipStatus } from '@repo/types';

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
              type: { in: ['subscription', 'SUBSCRIPTION'] },
              status: { in: ['active', 'ACTIVE'] },
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

  /**
   * Weekly on Sunday at 5:00 AM UTC — reconcile sponsors_count on all expeditions.
   * The sponsors_count column is manually incremented/decremented in various flows
   * (checkout completion, refunds) and can drift. This job corrects any mismatches
   * by counting unique active sponsors from the sponsorship table.
   */
  @Cron('0 5 * * 0')
  async handleSponsorsCountReconciliation(): Promise<void> {
    this.logger.log('[CRON] Running sponsors_count reconciliation');

    try {
      const expeditions = await this.prisma.expedition.findMany({
        where: { deleted_at: null },
        select: { id: true, public_id: true, sponsors_count: true },
      });

      let corrected = 0;

      for (const exp of expeditions) {
        // Count unique sponsors with active/confirmed sponsorships for this expedition
        const uniqueSponsors = await this.prisma.sponsorship.groupBy({
          by: ['sponsor_id'],
          where: {
            expedition_public_id: exp.public_id,
            status: {
              in: [SponsorshipStatus.ACTIVE, SponsorshipStatus.CONFIRMED],
            },
            deleted_at: null,
          },
        });

        const actualCount = uniqueSponsors.length;

        if (actualCount !== exp.sponsors_count) {
          await this.prisma.expedition.update({
            where: { id: exp.id },
            data: { sponsors_count: actualCount },
          });
          corrected++;
          this.logger.log(
            `[CRON] Corrected sponsors_count for expedition ${exp.public_id}: ${exp.sponsors_count} → ${actualCount}`,
          );
        }
      }

      this.logger.log(
        `[CRON] Sponsors_count reconciliation complete. Checked ${expeditions.length} expeditions, corrected ${corrected}.`,
      );
    } catch (e) {
      this.logger.error(
        `[CRON] Sponsors_count reconciliation failed: ${e.message}`,
      );
    }
  }
}
