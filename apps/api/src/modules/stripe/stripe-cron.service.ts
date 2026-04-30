import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { StripeService } from './stripe.service';

@Injectable()
export class StripeCronService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Sundays at 5:00 AM UTC — delete processed webhook events older than 30 days.
   */
  @Cron('0 5 * * 0')
  async handleWebhookEventCleanup(): Promise<void> {
    this.logger.log('[CRON] Running processed webhook event cleanup');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.processedWebhookEvent.deleteMany({
        where: { processed_at: { lt: thirtyDaysAgo } },
      });

      this.logger.log(
        `[CRON] Webhook event cleanup complete. Removed ${result.count} events.`,
      );
    } catch (e) {
      this.logger.error(`[CRON] Webhook event cleanup failed: ${e.message}`);
    }
  }

  /**
   * Sundays at 6:00 AM UTC — reconcile payout status for any DB rows that
   * appear stuck. The webhook flow is the primary signal for status updates;
   * this cron is the safety net for missed `payout.in_transit` / `payout.paid`
   * events. We only touch payouts created in the last 30 days to bound work.
   */
  @Cron('0 6 * * 0')
  async handlePayoutReconciliation(): Promise<void> {
    this.logger.log('[CRON] Running payout reconciliation');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find local payouts that are still in non-terminal states despite
      // having a Stripe payout ID — these are the ones at risk of drift.
      const stalePayouts = await this.prisma.payout.findMany({
        where: {
          deleted_at: null,
          stripe_payout_id: { not: null },
          status: { in: ['pending', 'PENDING', 'IN_TRANSIT', 'in_transit'] },
          created_at: { gte: thirtyDaysAgo },
        },
        select: {
          id: true,
          stripe_payout_id: true,
          status: true,
          payout_method: { select: { stripe_account_id: true } },
        },
        take: 500,
      });

      let updated = 0;
      for (const payout of stalePayouts) {
        const stripeAccountId = payout.payout_method?.stripe_account_id;
        if (!payout.stripe_payout_id || !stripeAccountId) continue;

        try {
          const stripePayout = await this.stripeService.payouts.retrieve(
            payout.stripe_payout_id,
            { stripeAccount: stripeAccountId },
          );

          const localStatus = this.mapStripePayoutStatus(stripePayout.status);
          if (localStatus && localStatus !== payout.status) {
            await this.prisma.payout.update({
              where: { id: payout.id },
              data: {
                status: localStatus,
                arrival_date: stripePayout.arrival_date
                  ? new Date(stripePayout.arrival_date * 1000)
                  : undefined,
              },
            });
            updated++;
            this.logger.log(
              `[CRON] Reconciled payout ${payout.stripe_payout_id}: ${payout.status} → ${localStatus}`,
            );
          }
        } catch (err) {
          this.logger.warn(
            `[CRON] Could not retrieve payout ${payout.stripe_payout_id}: ${err.message}`,
          );
        }
      }

      this.logger.log(
        `[CRON] Payout reconciliation complete. Checked ${stalePayouts.length}, corrected ${updated}.`,
      );
    } catch (e) {
      this.logger.error(`[CRON] Payout reconciliation failed: ${e.message}`);
    }
  }

  private mapStripePayoutStatus(status: string | null | undefined): string | null {
    switch (status) {
      case 'paid':
        return 'COMPLETED';
      case 'in_transit':
        return 'IN_TRANSIT';
      case 'pending':
        return 'PENDING';
      case 'failed':
        return 'FAILED';
      case 'canceled':
        return 'CANCELED';
      default:
        return null;
    }
  }
}
