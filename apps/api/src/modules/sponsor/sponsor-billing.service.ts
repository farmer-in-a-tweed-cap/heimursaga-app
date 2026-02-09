import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EMAIL_TEMPLATES } from '@/common/email-templates';
import {
  EVENTS,
  EventService,
  IEventSendEmail,
  IExplorerExitedRestingEvent,
} from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { StripeService } from '@/modules/stripe';

@Injectable()
export class SponsorBillingService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private stripeService: StripeService,
    private eventService: EventService,
  ) {}

  @OnEvent(EVENTS.EXPLORER_EXITED_RESTING)
  async onExplorerExitedResting(
    event: IExplorerExitedRestingEvent,
  ): Promise<void> {
    await this.resumeAllSponsorships(event.explorerId);
  }

  /**
   * Resume all paused subscriptions for an explorer who is no longer resting.
   */
  async resumeAllSponsorships(explorerId: number): Promise<void> {
    const sponsorships = await this.prisma.sponsorship.findMany({
      where: {
        sponsored_explorer_id: explorerId,
        type: 'subscription',
        status: 'paused',
        stripe_subscription_id: { not: null },
        deleted_at: null,
      },
    });

    this.logger.log(
      `Resuming ${sponsorships.length} paused sponsorships for explorer ${explorerId}`,
    );

    for (const sponsorship of sponsorships) {
      try {
        await this.stripeService.subscriptions.update(
          sponsorship.stripe_subscription_id!,
          { pause_collection: null },
        );
        await this.prisma.sponsorship.update({
          where: { id: sponsorship.id },
          data: { status: 'active' },
        });
      } catch (e) {
        // If the subscription is already canceled in Stripe, sync local status
        if (this.isSubscriptionCanceledError(e)) {
          await this.prisma.sponsorship.update({
            where: { id: sponsorship.id },
            data: { status: 'canceled' },
          });
          this.logger.log(
            `Sponsorship ${sponsorship.id} was already canceled in Stripe, synced local status`,
          );
        } else {
          this.logger.error(
            `Failed to resume sponsorship ${sponsorship.id}: ${e.message}`,
          );
        }
      }
    }
  }

  /**
   * Pause all active subscriptions for a resting explorer (called by cron after 30+ days).
   * Uses `void` behavior so Stripe sets subscription status to `paused` and no invoices are created.
   */
  async pauseAllSponsorships(explorerId: number): Promise<void> {
    // Re-verify the explorer is still resting before processing
    const explorer = await this.prisma.explorer.findUnique({
      where: { id: explorerId },
      select: { resting_since: true },
    });
    if (!explorer?.resting_since) {
      this.logger.log(
        `Explorer ${explorerId} is no longer resting, skipping pause`,
      );
      return;
    }

    const sponsorships = await this.prisma.sponsorship.findMany({
      where: {
        sponsored_explorer_id: explorerId,
        type: 'subscription',
        status: 'active',
        stripe_subscription_id: { not: null },
        deleted_at: null,
      },
    });

    this.logger.log(
      `Pausing ${sponsorships.length} active sponsorships for resting explorer ${explorerId}`,
    );

    for (const sponsorship of sponsorships) {
      // Re-check resting status before each operation to handle race with resume
      const current = await this.prisma.explorer.findUnique({
        where: { id: explorerId },
        select: { resting_since: true },
      });
      if (!current?.resting_since) {
        this.logger.log(
          `Explorer ${explorerId} exited resting mid-pause, aborting remaining`,
        );
        return;
      }

      try {
        await this.stripeService.subscriptions.update(
          sponsorship.stripe_subscription_id!,
          { pause_collection: { behavior: 'void' } },
        );
        await this.prisma.sponsorship.update({
          where: { id: sponsorship.id },
          data: { status: 'paused' },
        });
      } catch (e) {
        if (this.isSubscriptionCanceledError(e)) {
          await this.prisma.sponsorship.update({
            where: { id: sponsorship.id },
            data: { status: 'canceled' },
          });
          this.logger.log(
            `Sponsorship ${sponsorship.id} was already canceled in Stripe, synced local status`,
          );
        } else {
          this.logger.error(
            `Failed to pause sponsorship ${sponsorship.id}: ${e.message}`,
          );
        }
      }
    }
  }

  /**
   * Cancel all paused subscriptions for an explorer resting 90+ days.
   * Notifies each sponsor via email. Only clears resting_since if ALL cancellations succeed.
   */
  async cancelAllPausedSponsorships(explorerId: number): Promise<void> {
    const sponsorships = await this.prisma.sponsorship.findMany({
      where: {
        sponsored_explorer_id: explorerId,
        type: 'subscription',
        status: 'paused',
        stripe_subscription_id: { not: null },
        deleted_at: null,
      },
      include: {
        sponsor: {
          select: {
            email: true,
            username: true,
          },
        },
        sponsored_explorer: {
          select: {
            username: true,
            profile: { select: { name: true } },
          },
        },
      },
    });

    this.logger.log(
      `Auto-canceling ${sponsorships.length} paused sponsorships for explorer ${explorerId} (90-day resting)`,
    );

    if (sponsorships.length === 0) return;

    const explorerName =
      sponsorships[0]?.sponsored_explorer?.profile?.name ||
      sponsorships[0]?.sponsored_explorer?.username ||
      'Explorer';
    const explorerUsername =
      sponsorships[0]?.sponsored_explorer?.username || '';

    let failureCount = 0;

    for (const sponsorship of sponsorships) {
      try {
        await this.stripeService.subscriptions.cancel(
          sponsorship.stripe_subscription_id!,
        );
        await this.prisma.sponsorship.update({
          where: { id: sponsorship.id },
          data: { status: 'canceled' },
        });

        // Notify the sponsor via email
        if (sponsorship.sponsor?.email) {
          this.eventService.trigger<IEventSendEmail>({
            event: EVENTS.SEND_EMAIL,
            data: {
              to: sponsorship.sponsor.email,
              template: EMAIL_TEMPLATES.SPONSORSHIP_AUTO_CANCELED,
              vars: {
                sponsorUsername: sponsorship.sponsor.username,
                explorerName,
                explorerUsername,
              },
            },
          });
        }
      } catch (e) {
        if (this.isSubscriptionCanceledError(e)) {
          // Already canceled in Stripe — just sync local status
          await this.prisma.sponsorship.update({
            where: { id: sponsorship.id },
            data: { status: 'canceled' },
          });
          this.logger.log(
            `Sponsorship ${sponsorship.id} was already canceled in Stripe, synced local status`,
          );
        } else {
          failureCount++;
          this.logger.error(
            `Failed to cancel sponsorship ${sponsorship.id}: ${e.message}`,
          );
        }
      }
    }

    // Only clear resting_since if ALL cancellations succeeded
    if (failureCount === 0) {
      await this.prisma.explorer.update({
        where: { id: explorerId },
        data: { resting_since: null },
      });
    } else {
      this.logger.error(
        `${failureCount} cancellations failed for explorer ${explorerId}, keeping resting_since for retry`,
      );
    }
  }

  /**
   * Check if a Stripe error indicates the subscription is already canceled or missing.
   */
  private isSubscriptionCanceledError(e: any): boolean {
    return (
      e?.code === 'resource_missing' ||
      e?.raw?.code === 'resource_missing' ||
      e?.message?.includes('No such subscription') ||
      e?.message?.includes('canceled')
    );
  }
}
