import { IOnSubscriptionUpgradeCompleteEvent } from '../payment';
import { Injectable, RawBodyRequest } from '@nestjs/common';
import { IStripeCreateSetupIntentResponse } from '@repo/types';
import Stripe from 'stripe';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';

import { PaymentTransactionType, StripeMetadataKey } from '@/common/enums';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
} from '@/common/exceptions';
import { IRequest } from '@/common/interfaces';
import { config } from '@/config';
import { EVENTS, EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { IOnSponsorCheckoutCompleteEvent } from '@/modules/sponsor';

import {
  IStripeAccountCreateResponse,
  IStripeAccountLinkPayload,
  IStripeAccountLinkResponse,
  IStripeCreatePaymentIntentPayload,
} from './stripe.interface';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {
    const sk = process.env.STRIPE_SECRET_KEY;

    this.stripe = new Stripe(sk, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async webhook(
    request: RawBodyRequest<IRequest>,
  ): Promise<{ received: boolean }> {
    try {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      const payload = request.rawBody;
      const signature = request.headers['stripe-signature'];

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        secret,
      );
      const data = event.data.object;

      // Log the event type for monitoring
      this.logger.log(`stripe webhook: ${event.type} (${event.id})`);

      // Atomically claim this event to prevent duplicate processing (race-safe)
      try {
        await this.prisma.processedWebhookEvent.create({
          data: {
            stripe_event_id: event.id,
            event_type: event.type,
          },
        });
      } catch (dedupeError) {
        // Unique constraint violation (P2002) means another process already claimed this event
        if (dedupeError?.code === 'P2002') {
          this.logger.log(`Duplicate webhook event ${event.id}, skipping`);
          return { received: true };
        }
        throw dedupeError;
      }

      // Process synchronously - if this fails, Stripe will retry
      try {
        await this.handleWebhookEvent(event.type, data);
      } catch (processingError) {
        // Processing failed — remove the dedup record so Stripe retries are processed
        await this.prisma.processedWebhookEvent
          .deleteMany({ where: { stripe_event_id: event.id } })
          .catch(() => {}); // Best-effort cleanup
        throw processingError;
      }

      return { received: true };
    } catch (e) {
      this.logger.error('Webhook processing failed:', e);
      // Return error to tell Stripe to retry (for non-signature errors)
      if (e.message?.includes('signature')) {
        throw new ServiceBadRequestException(
          'Webhook signature verification failed',
        );
      }
      // For processing errors, still throw to trigger Stripe retry
      throw new ServiceBadRequestException('Webhook processing failed');
    }
  }

  /**
   * Handle webhook events synchronously
   */
  private async handleWebhookEvent(
    eventType: string,
    data: Stripe.Event.Data.Object,
  ): Promise<void> {
    switch (eventType) {
      case 'payment_intent.succeeded':
        await this.onPaymentIntentSucceeded(data as Stripe.PaymentIntent);
        break;
      case 'invoice.payment_succeeded':
        await this.onInvoicePaymentSucceeded(data as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(data as Stripe.Invoice);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentIntentFailed(data as Stripe.PaymentIntent);
        break;
      case 'account.updated':
        await this.onAccountUpdated(data as Stripe.Account);
        break;
      case 'payout.failed':
        await this.onPayoutFailed(data as Stripe.Payout);
        break;
      case 'payout.paid':
        await this.onPayoutPaid(data as Stripe.Payout);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(data as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(data as Stripe.Subscription);
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(data as Stripe.Charge);
        break;
      case 'charge.dispute.created':
        await this.onDisputeCreated(data as Stripe.Dispute);
        break;
    }
  }

  async getOrCreateCustomer(payload: {
    email: string;
    data?: {
      email: string;
      name: string;
    };
  }): Promise<Stripe.Customer> {
    try {
      const { email, data } = payload || {};

      // check if the customer exists
      const customer = await this.stripe.customers
        .list({ email })
        .then(({ data }) => (data.length >= 1 ? data?.[0] : null))
        .catch(() => null);

      if (!customer && data) {
        return this.stripe.customers.create(data);
      }

      return customer;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createPaymentIntent(
    payload: IStripeCreatePaymentIntentPayload,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const { userId, amount } = payload;

      if (!userId) throw new ServiceForbiddenException('customer not found');

      const currency = config.stripe.default.currency;

      // get the user
      const user = await this.prisma.explorer.findFirst({
        where: { id: userId },
        select: {
          email: true,
          profile: {
            select: {
              name: true,
            },
          },
        },
      });
      if (!user) throw new ServiceForbiddenException('customer not found');

      // get the customer
      const customer = await this.getOrCreateCustomer({
        email: user.email,
        data: {
          email: user.email,
          name: user.profile.name,
        },
      });
      if (!customer) throw new ServiceForbiddenException('customer not found');

      // create a payment intent with the order amount and currency
      // Use idempotency key to prevent duplicate charges
      const idempotencyKey = this.generateIdempotencyKey('pi', userId, amount);

      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount,
          currency,
          automatic_payment_methods: { enabled: false },
          payment_method_types: ['card'],
          customer: customer.id,
        },
        { idempotencyKey },
      );

      return paymentIntent;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createSetupIntent(
    userId?: number,
  ): Promise<IStripeCreateSetupIntentResponse> {
    try {
      // No idempotency key — setup intents are safe to create multiple times
      // (users need to add multiple cards)
      const intent = await this.stripe.setupIntents.create({});

      return {
        secret: intent.client_secret,
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getAccount({ accountId }: { accountId: string }) {
    try {
      // get a stripe account
      const account = await this.stripe.accounts.retrieve(accountId);

      const response = {
        company: account.company,
        requirements: account.requirements,
        businessType: account.business_type,
        verified: !account.requirements.currently_due.length,
        capabilities: account.capabilities,
        email: account.email,
        phoneNumber:
          account.business_type === 'individual'
            ? account.individual?.phone
            : account.company?.phone,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createAccount({
    country,
    userId,
  }: {
    country: string;
    userId?: number;
  }): Promise<IStripeAccountCreateResponse> {
    try {
      // Use idempotency key to prevent duplicate account creation
      const idempotencyKey = this.generateIdempotencyKey(
        'acct',
        userId || 'anon',
        country,
      );

      // create a stripe account
      const account = await this.stripe.accounts.create(
        {
          controller: {
            stripe_dashboard: {
              type: 'none',
            },
            fees: {
              payer: 'application',
            },
            losses: {
              payments: 'application',
            },
            requirement_collection: 'application',
          },
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          country,
        },
        { idempotencyKey },
      );

      const response: IStripeAccountCreateResponse = {
        accountId: account.id,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async linkAccount(
    payload: IStripeAccountLinkPayload,
  ): Promise<IStripeAccountLinkResponse> {
    try {
      const { accountId } = payload;
      const origin = process.env.APP_BASE_URL;

      // link the account and return an onboarding link
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        return_url: `${origin}/return/${accountId}`,
        refresh_url: `${origin}/refresh/${accountId}`,
        type: 'account_onboarding',
      });

      const response: IStripeAccountLinkResponse = {
        url: accountLink.url,
        expiry: dateformat(accountLink.expires_at * 1000).toDate(),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async onInvoicePaymentSucceeded(event: Stripe.Invoice) {
    try {
      const { subscription } = event;

      if (!subscription) return;

      // Retrieve the subscription to get metadata
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        typeof subscription === 'string' ? subscription : subscription.id,
      );

      // Check if this is for a subscription (not a one-time payment)
      if (!stripeSubscription.metadata?.[StripeMetadataKey.CHECKOUT_ID]) {
        return;
      }

      const metadata = stripeSubscription.metadata || {};
      const params = {
        transaction: metadata?.[
          StripeMetadataKey.TRANSACTION
        ] as PaymentTransactionType,
        checkoutId: metadata?.[StripeMetadataKey.CHECKOUT_ID]
          ? parseInt(metadata?.[StripeMetadataKey.CHECKOUT_ID])
          : undefined,
        userId: metadata?.[StripeMetadataKey.USER_ID]
          ? parseInt(metadata?.[StripeMetadataKey.USER_ID])
          : undefined,
        creatorId: metadata?.[StripeMetadataKey.CREATOR_ID]
          ? parseInt(metadata?.[StripeMetadataKey.CREATOR_ID])
          : undefined,
        subscriptionPlanId: metadata?.[StripeMetadataKey.SUBSCRIPTION_PLAN_ID]
          ? parseInt(metadata?.[StripeMetadataKey.SUBSCRIPTION_PLAN_ID])
          : undefined,
      };

      const { transaction, userId, checkoutId, creatorId, subscriptionPlanId } =
        params;

      switch (transaction) {
        case PaymentTransactionType.SUBSCRIPTION:
          await this.eventService.trigger<IOnSubscriptionUpgradeCompleteEvent>({
            event: EVENTS.SUBSCRIPTION_UPGRADE_COMPLETE,
            data: {
              userId,
              subscriptionPlanId,
              checkoutId,
            },
          });
          break;
        case PaymentTransactionType.SPONSORSHIP:
          // Recurring sponsorship payment - update expedition raised amount
          // Skip the first invoice (billing_reason === 'subscription_create')
          // since completeCheckout already handles that via payment_intent.succeeded
          if (
            creatorId &&
            event.amount_paid &&
            event.billing_reason !== 'subscription_create'
          ) {
            const amountDollars = event.amount_paid / 100;
            // Find the creator's active expedition and increment raised
            const activeExpedition = await this.prisma.expedition.findFirst({
              where: {
                author_id: creatorId,
                deleted_at: null,
                status: { in: ['active', 'planned'] },
              },
              select: { id: true },
              orderBy: { id: 'desc' },
            });
            if (activeExpedition) {
              await this.prisma.expedition.update({
                where: { id: activeExpedition.id },
                data: {
                  raised: { increment: amountDollars },
                },
              });
              this.logger.log(
                `Recurring sponsorship renewal: added $${amountDollars} to expedition ${activeExpedition.id} for creator ${creatorId}`,
              );
            }
          }
          break;
      }
    } catch (e) {
      this.logger.error('Error handling invoice payment succeeded:', e);
    }
  }

  async onPaymentIntentSucceeded(event: Stripe.PaymentIntent) {
    try {
      // Use metadata directly from the event (already retrieved)
      const metadata = event.metadata || {};

      const params = {
        transaction: metadata?.[
          StripeMetadataKey.TRANSACTION
        ] as PaymentTransactionType,
        checkoutId: metadata?.[StripeMetadataKey.CHECKOUT_ID]
          ? parseInt(metadata?.[StripeMetadataKey.CHECKOUT_ID])
          : undefined,
        userId: metadata?.[StripeMetadataKey.USER_ID]
          ? parseInt(metadata?.[StripeMetadataKey.USER_ID])
          : undefined,
        creatorId: metadata?.[StripeMetadataKey.CREATOR_ID]
          ? parseInt(metadata?.[StripeMetadataKey.CREATOR_ID])
          : undefined,
        subscriptionPlanId: metadata?.[StripeMetadataKey.SUBSCRIPTION_PLAN_ID]
          ? parseInt(metadata?.[StripeMetadataKey.SUBSCRIPTION_PLAN_ID])
          : undefined,
      };

      const { transaction, userId, checkoutId, creatorId, subscriptionPlanId } =
        params;

      switch (transaction) {
        case PaymentTransactionType.SUBSCRIPTION:
          await this.eventService.trigger<IOnSubscriptionUpgradeCompleteEvent>({
            event: EVENTS.SUBSCRIPTION_UPGRADE_COMPLETE,
            data: {
              userId,
              subscriptionPlanId,
              checkoutId,
            },
          });
          break;
        case PaymentTransactionType.SPONSORSHIP:
          await this.eventService.trigger<IOnSponsorCheckoutCompleteEvent>({
            event: EVENTS.SPONSORSHIP_CHECKOUT_COMPLETE,
            data: {
              userId,
              creatorId,
              checkoutId,
            },
          });
          break;
      }
    } catch (e) {
      this.logger.error('Error handling payment intent succeeded:', e);
    }
  }

  /**
   * Handle failed payment intents - notify user and update checkout status
   */
  async onPaymentIntentFailed(event: Stripe.PaymentIntent) {
    try {
      const metadata = event.metadata || {};
      const checkoutId = metadata?.[StripeMetadataKey.CHECKOUT_ID]
        ? parseInt(metadata?.[StripeMetadataKey.CHECKOUT_ID])
        : undefined;

      if (checkoutId) {
        // Update checkout status to failed
        await this.prisma.checkout.update({
          where: { id: checkoutId },
          data: { status: 'FAILED' },
        });

        this.logger.log(
          `Payment intent failed for checkout ${checkoutId}: ${event.last_payment_error?.message || 'Unknown error'}`,
        );
      }
    } catch (e) {
      this.logger.error('Error handling payment intent failed:', e);
    }
  }

  /**
   * Handle Stripe Connect account updates - sync verification status
   */
  async onAccountUpdated(event: Stripe.Account) {
    try {
      const {
        id: stripeAccountId,
        requirements,
        charges_enabled,
        payouts_enabled,
      } = event;

      // Check if account is fully verified (no pending requirements and can accept payments)
      const isVerified =
        !requirements?.currently_due?.length &&
        !requirements?.pending_verification?.length &&
        charges_enabled &&
        payouts_enabled;

      // Find the payout method to get the explorer ID
      const payoutMethod = await this.prisma.payoutMethod.findFirst({
        where: { stripe_account_id: stripeAccountId },
        select: { explorer_id: true },
      });

      // Update local payout method verification status
      await this.prisma.payoutMethod.updateMany({
        where: { stripe_account_id: stripeAccountId },
        data: { is_verified: isVerified },
      });

      // Also update the explorer's stripe account connected status
      if (payoutMethod?.explorer_id) {
        await this.prisma.explorer.update({
          where: { id: payoutMethod.explorer_id },
          data: { is_stripe_account_connected: isVerified },
        });

        this.logger.log(
          `Updated explorer ${payoutMethod.explorer_id} stripe account connected: ${isVerified}`,
        );
      }

      this.logger.log(
        `Stripe account ${stripeAccountId} verification status: ${isVerified} (charges: ${charges_enabled}, payouts: ${payouts_enabled})`,
      );
    } catch (e) {
      this.logger.error('Error handling account updated:', e);
    }
  }

  /**
   * Handle failed payouts - update payout status and notify
   */
  async onPayoutFailed(event: Stripe.Payout) {
    try {
      const { id: stripePayoutId, failure_message } = event;

      // Update payout status in database
      await this.prisma.payout.updateMany({
        where: { stripe_payout_id: stripePayoutId },
        data: { status: 'FAILED' },
      });

      this.logger.log(
        `Payout ${stripePayoutId} failed: ${failure_message || 'Unknown error'}`,
      );
    } catch (e) {
      this.logger.error('Error handling payout failed:', e);
    }
  }

  /**
   * Handle successful payouts - update payout status
   */
  async onPayoutPaid(event: Stripe.Payout) {
    try {
      const { id: stripePayoutId, arrival_date } = event;

      // Update payout status in database
      await this.prisma.payout.updateMany({
        where: { stripe_payout_id: stripePayoutId },
        data: {
          status: 'COMPLETED',
          arrival_date: arrival_date
            ? new Date(arrival_date * 1000)
            : undefined,
        },
      });

      this.logger.log(`Payout ${stripePayoutId} completed successfully`);
    } catch (e) {
      this.logger.error('Error handling payout paid:', e);
    }
  }

  /**
   * Handle subscription deletion - update sponsorship status
   */
  async onSubscriptionDeleted(event: Stripe.Subscription) {
    try {
      const { id: stripeSubscriptionId } = event;

      // Update sponsorship status to canceled
      await this.prisma.sponsorship.updateMany({
        where: { stripe_subscription_id: stripeSubscriptionId },
        data: { status: 'canceled' },
      });

      // Handle Explorer Pro subscription deletion - downgrade user
      const explorerSubscription =
        await this.prisma.explorerSubscription.findFirst({
          where: { stripe_subscription_id: stripeSubscriptionId },
          select: { id: true, explorer_id: true },
        });

      if (explorerSubscription?.explorer_id) {
        await this.prisma.$transaction(async (tx) => {
          // Delete the explorer plan
          await tx.explorerPlan.deleteMany({
            where: { explorer_id: explorerSubscription.explorer_id },
          });
          // Downgrade to USER role
          await tx.explorer.update({
            where: { id: explorerSubscription.explorer_id },
            data: { role: 'USER' },
          });
        });
        this.logger.log(
          `Explorer Pro subscription ${stripeSubscriptionId} deleted: downgraded explorer ${explorerSubscription.explorer_id} to USER`,
        );
      }

      this.logger.log(
        `Subscription ${stripeSubscriptionId} deleted, sponsorship canceled`,
      );
    } catch (e) {
      this.logger.error('Error handling subscription deleted:', e);
    }
  }

  /**
   * Handle subscription updates - sync status changes.
   * When pause_collection is set (managed by SponsorBillingService), we skip
   * sponsorship status sync to avoid overwriting the local 'paused' status.
   */
  async onSubscriptionUpdated(event: Stripe.Subscription) {
    try {
      const { id: stripeSubscriptionId, status } = event;

      // If pause_collection is set, the SponsorBillingService is managing this
      // subscription's local status — do not overwrite it.
      if (event.pause_collection) {
        this.logger.log(
          `Subscription ${stripeSubscriptionId} has pause_collection set, skipping sponsorship status sync`,
        );
      } else {
        // Map Stripe status to our status (lowercase, matching SponsorshipStatus enum)
        let sponsorshipStatus: string;
        switch (status) {
          case 'active':
            sponsorshipStatus = 'active';
            break;
          case 'past_due':
            sponsorshipStatus = 'past_due';
            break;
          case 'canceled':
            sponsorshipStatus = 'canceled';
            break;
          case 'unpaid':
            sponsorshipStatus = 'unpaid';
            break;
          case 'paused':
            sponsorshipStatus = 'paused';
            break;
          default:
            sponsorshipStatus = 'active';
        }

        // Update sponsorship status
        await this.prisma.sponsorship.updateMany({
          where: { stripe_subscription_id: stripeSubscriptionId },
          data: { status: sponsorshipStatus },
        });

        this.logger.log(
          `Subscription ${stripeSubscriptionId} updated to ${sponsorshipStatus}`,
        );
      }

      // Also handle Explorer Pro subscription status changes
      const explorerSubscription =
        await this.prisma.explorerSubscription.findFirst({
          where: { stripe_subscription_id: stripeSubscriptionId },
          select: { id: true, explorer_id: true },
        });

      if (explorerSubscription?.explorer_id) {
        if (
          status === 'past_due' ||
          status === 'unpaid' ||
          status === 'canceled'
        ) {
          // Downgrade user role when Explorer Pro subscription lapses
          await this.prisma.explorer.update({
            where: { id: explorerSubscription.explorer_id },
            data: { role: 'USER' },
          });
          this.logger.log(
            `Explorer Pro subscription ${stripeSubscriptionId} status ${status}: downgraded explorer ${explorerSubscription.explorer_id} to USER`,
          );
        } else if (status === 'active') {
          // Restore CREATOR role when subscription becomes active again
          await this.prisma.explorer.update({
            where: { id: explorerSubscription.explorer_id },
            data: { role: 'CREATOR' },
          });
          this.logger.log(
            `Explorer Pro subscription ${stripeSubscriptionId} reactivated: restored explorer ${explorerSubscription.explorer_id} to CREATOR`,
          );
        }
      }
    } catch (e) {
      this.logger.error('Error handling subscription updated:', e);
    }
  }

  /**
   * Handle failed invoice payments - notify and update status
   */
  async onInvoicePaymentFailed(event: Stripe.Invoice) {
    try {
      const { subscription, attempt_count, next_payment_attempt } = event;

      if (!subscription) return;

      const stripeSubscriptionId =
        typeof subscription === 'string' ? subscription : subscription.id;

      // Log the failure
      this.logger.log(
        `Invoice payment failed for subscription ${stripeSubscriptionId}, attempt ${attempt_count}`,
      );

      // If the subscription is paused (managed by SponsorBillingService), skip
      // status update — this may be a retry for a pre-pause invoice.
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        stripeSubscriptionId,
      );
      if (stripeSubscription.pause_collection) {
        this.logger.log(
          `Subscription ${stripeSubscriptionId} has pause_collection set, skipping past_due status update`,
        );
        return;
      }

      // Update sponsorship to past_due status
      await this.prisma.sponsorship.updateMany({
        where: { stripe_subscription_id: stripeSubscriptionId },
        data: { status: 'past_due' },
      });

      // If no more retry attempts, the subscription will be canceled via webhook
      if (!next_payment_attempt) {
        this.logger.log(
          `No more payment attempts for subscription ${stripeSubscriptionId}`,
        );
      }
    } catch (e) {
      this.logger.error('Error handling invoice payment failed:', e);
    }
  }

  /**
   * Handle charge refunds - update checkout and sponsorship status
   */
  async onChargeRefunded(event: Stripe.Charge) {
    try {
      const { id: chargeId, payment_intent, refunded, amount_refunded } = event;

      const paymentIntentId =
        typeof payment_intent === 'string'
          ? payment_intent
          : payment_intent?.id;

      this.logger.log(
        `Charge ${chargeId} refunded: ${amount_refunded} cents (full refund: ${refunded})`,
      );

      if (paymentIntentId) {
        // Update checkout status to refunded
        await this.prisma.checkout.updateMany({
          where: { stripe_payment_intent_id: paymentIntentId },
          data: { status: 'REFUNDED' },
        });
      }
    } catch (e) {
      this.logger.error('Error handling charge refunded:', e);
    }
  }

  /**
   * Handle disputes/chargebacks - critical for financial tracking
   */
  async onDisputeCreated(event: Stripe.Dispute) {
    try {
      const { id: disputeId, charge, amount, reason, status } = event;

      const chargeId = typeof charge === 'string' ? charge : charge?.id;

      this.logger.error(
        `DISPUTE CREATED: ${disputeId} for charge ${chargeId}, amount: ${amount}, reason: ${reason}, status: ${status}`,
      );

      // Alert admin via email — disputes have strict response deadlines (7-21 days)
      await this.eventService.trigger({
        event: EVENTS.ADMIN_DISPUTE_CREATED,
        data: { disputeId, chargeId, amount, reason, status },
      });
    } catch (e) {
      this.logger.error('Error handling dispute created:', e);
    }
  }

  /**
   * Generate an idempotency key for Stripe operations.
   * Include enough context to distinguish different logical operations.
   * For checkout-based flows, pass the checkout ID for true idempotency.
   */
  generateIdempotencyKey(
    prefix: string,
    ...parts: (string | number)[]
  ): string {
    return `${prefix}_${parts.join('_')}`;
  }

  // ============================================
  // Controlled accessor methods for Stripe SDK
  // These replace direct access to the private `stripe` property
  // ============================================

  get customers() {
    return this.stripe.customers;
  }

  get paymentIntents() {
    return this.stripe.paymentIntents;
  }

  get subscriptions() {
    return this.stripe.subscriptions;
  }

  get invoices() {
    return this.stripe.invoices;
  }

  get prices() {
    return this.stripe.prices;
  }

  get products() {
    return this.stripe.products;
  }

  get promotionCodes() {
    return this.stripe.promotionCodes;
  }

  get setupIntents() {
    return this.stripe.setupIntents;
  }

  get accounts() {
    return this.stripe.accounts;
  }

  get accountLinks() {
    return this.stripe.accountLinks;
  }

  get payouts() {
    return this.stripe.payouts;
  }

  get paymentMethods() {
    return this.stripe.paymentMethods;
  }

  get refunds() {
    return this.stripe.refunds;
  }

  get transfers() {
    return this.stripe.transfers;
  }

  get balance() {
    return this.stripe.balance;
  }

  get charges() {
    return this.stripe.charges;
  }

  get webhooks() {
    return this.stripe.webhooks;
  }
}
