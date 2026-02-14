import { EVENTS, EventService, IEventSendEmail } from '../event';
import { IUserNotificationCreatePayload } from '../notification';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import {
  CheckoutStatus,
  ISponsorCheckoutPayload,
  ISponsorCheckoutResponse,
  ISponsorshipGetAllResponse,
  ISponsorshipTierCreatePayload,
  ISponsorshipTierGetAllResponse,
  ISponsorshipTierUpdatePayload,
  MONTHLY_TIER_SLOTS,
  ONE_TIME_TIER_SLOTS,
  PayoutMethodPlatform,
  SponsorshipBillingPeriod,
  SponsorshipStatus,
  SponsorshipType,
  UserNotificationContext,
  UserRole,
  getTierLabel,
  getTierSlotConfig,
  isValidTierPrice,
} from '@repo/types';
import Stripe from 'stripe';

import { calculateFee } from '@/lib/calculator';
import { dateformat } from '@/lib/date-format';
import { decimalToInteger, integerToDecimal } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';
import { matchRoles } from '@/lib/utils';

import { EMAIL_TEMPLATES } from '@/common/email-templates';
import {
  CurrencyCode,
  PaymentTransactionType,
  StripeMetadataKey,
} from '@/common/enums';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { APPLICATION_FEE, config } from '@/config';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { StripeService } from '@/modules/stripe';

import {
  IOnSponsorCheckoutCompleteEvent,
  ISponsorCheckoutCompletePayload,
} from './sponsor.interface';

@Injectable()
export class SponsorService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
    private stripeService: StripeService,
  ) {}

  /**
   * Calculate yearly amount from monthly amount (monthly * 12 * 0.9 = 10% discount)
   */
  private calculateYearlyAmount(monthlyAmount: number): number {
    return Math.round(monthlyAmount * 12 * 0.9);
  }

  async checkout({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    ISponsorCheckoutPayload
  >): Promise<ISponsorCheckoutResponse> {
    try {
      const { userId } = session;
      const {
        sponsorshipTierId,
        oneTimePaymentAmount,
        customAmount,
        creatorId,
        paymentMethodId,
        billingPeriod = SponsorshipBillingPeriod.MONTHLY,
        message = '',
        emailDelivery = true,
        isPublic = true,
        isMessagePublic = true,
        expeditionId,
      } = payload;

      if (!userId) throw new ServiceForbiddenException();

      const sponsorshipType =
        payload.sponsorshipType === SponsorshipType.SUBSCRIPTION
          ? SponsorshipType.SUBSCRIPTION
          : SponsorshipType.ONE_TIME_PAYMENT;
      const currency = CurrencyCode.USD;

      // Server-side amount validation for one-time payments
      if (sponsorshipType === SponsorshipType.ONE_TIME_PAYMENT) {
        const MIN_ONE_TIME_AMOUNT = 1; // $1 minimum
        const MAX_ONE_TIME_AMOUNT = 10000; // $10,000 maximum

        if (
          !oneTimePaymentAmount ||
          oneTimePaymentAmount < MIN_ONE_TIME_AMOUNT
        ) {
          throw new ServiceBadRequestException(
            `One-time payment must be at least $${MIN_ONE_TIME_AMOUNT}`,
          );
        }
        if (oneTimePaymentAmount > MAX_ONE_TIME_AMOUNT) {
          throw new ServiceBadRequestException(
            `One-time payment cannot exceed $${MAX_ONE_TIME_AMOUNT}`,
          );
        }
      }

      // get a sponsorship tier
      const sponsorshipTier =
        await this.prisma.sponsorshipTier.findFirstOrThrow({
          where: {
            public_id: sponsorshipTierId,
          },
          select: {
            id: true,
          },
        });

      // get a user
      const user = await this.prisma.explorer.findFirstOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          stripe_customer_id: true,
        },
      });

      // get a creator
      const creator = await this.prisma.explorer.findFirstOrThrow({
        where: { username: creatorId },
        select: {
          id: true,
          stripe_customer_id: true,
          username: true,
        },
      });

      // Block self-sponsorship
      if (user.id === creator.id) {
        throw new ServiceBadRequestException('You cannot sponsor yourself');
      }

      // check if the user already sponsors the creator
      if (sponsorshipType === SponsorshipType.SUBSCRIPTION) {
        const subscribed = await this.prisma.sponsorship
          .count({
            where: {
              type: SponsorshipType.SUBSCRIPTION,
              status: SponsorshipStatus.ACTIVE,
              sponsor_id: user.id,
              sponsored_explorer_id: creator.id,
            },
          })
          .then((count) => count >= 1);
        if (subscribed) {
          throw new ServiceBadRequestException(
            'you already subscribed to this creator',
          );
        }
      }

      // get a creator payout method
      const payoutMethod = await this.prisma.payoutMethod.findFirstOrThrow({
        where: {
          explorer_id: creator.id,
          platform: PayoutMethodPlatform.STRIPE,
        },
        select: { stripe_account_id: true, is_verified: true },
      });
      const creatorStripeAccountId = payoutMethod.stripe_account_id;

      if (!creatorStripeAccountId) {
        throw new ServiceBadRequestException(
          'Creator has not set up payment receiving',
        );
      }

      // Verify the connected account is fully onboarded before accepting payments
      const stripeAccount = await this.stripeService.accounts.retrieve(
        creatorStripeAccountId,
      );

      const hasPaymentsEnabled = stripeAccount.charges_enabled;
      const hasTransfersEnabled = stripeAccount.payouts_enabled;
      const hasPendingRequirements =
        stripeAccount.requirements?.currently_due?.length > 0;

      if (
        !hasPaymentsEnabled ||
        !hasTransfersEnabled ||
        hasPendingRequirements
      ) {
        throw new ServiceBadRequestException(
          'Creator account is not fully verified to receive payments',
        );
      }

      // get a payment method (scoped to authenticated user)
      const paymentMethod = await this.prisma.paymentMethod.findFirstOrThrow({
        where: { public_id: paymentMethodId, explorer_id: userId },
        select: {
          id: true,
          stripe_payment_method_id: true,
        },
      });

      // create a checkout and payment intent
      const { clientSecret } = await this.prisma.$transaction(
        async (tx) => {
          let amount = 0;
          let stripePaymentIntentId: string | undefined;
          let stripeSubscriptionId: string | undefined = undefined;
          let clientSecret = '';

          // get a stripe customer
          const stripeCustomer = await this.stripeService.getOrCreateCustomer({
            email: user.email,
            data: {
              email: user.email,
              name: user.username,
            },
          });

          const stripePaymentMethodId = paymentMethod.stripe_payment_method_id;

          // create an one time payment stripe payment intent
          if (sponsorshipType === SponsorshipType.ONE_TIME_PAYMENT) {
            const applicationFeeAmount = decimalToInteger(
              calculateFee({
                amount: oneTimePaymentAmount,
                percent: APPLICATION_FEE,
              }),
            );

            amount = decimalToInteger(oneTimePaymentAmount);

            // Create checkout first to get ID for metadata
            const checkout = await tx.checkout.create({
              data: {
                public_id: generator.publicId(),
                status: CheckoutStatus.PENDING,
                transaction_type: PaymentTransactionType.SPONSORSHIP,
                sponsorship_type: sponsorshipType,
                sponsorship_tier_id: sponsorshipTier.id,
                message,
                total: amount,
                explorer_id: user.id,
                sponsored_explorer_id: creator.id,
                email_delivery_enabled: emailDelivery,
                is_public: isPublic,
                is_message_public: isMessagePublic,
                expedition_public_id: expeditionId || null,
              },
              select: {
                id: true,
                public_id: true,
              },
            });

            // Use deterministic idempotency key based on checkout ID
            const idempotencyKey = `sponsor_otp_checkout_${checkout.id}`;

            // Include metadata in initial create to avoid race condition
            const stripePaymentIntent =
              await this.stripeService.paymentIntents.create(
                {
                  amount,
                  currency,
                  customer: stripeCustomer.id,
                  payment_method: stripePaymentMethodId,
                  transfer_data: { destination: creatorStripeAccountId },
                  payment_method_types: ['card'],
                  application_fee_amount: applicationFeeAmount,
                  description: `Sponsorship from ${user.username} to ${creator.username}`,
                  metadata: {
                    [StripeMetadataKey.TRANSACTION]:
                      PaymentTransactionType.SPONSORSHIP,
                    [StripeMetadataKey.CHECKOUT_ID]: checkout.id.toString(),
                    [StripeMetadataKey.USER_ID]: user.id.toString(),
                    [StripeMetadataKey.CREATOR_ID]: creator.id.toString(),
                  },
                },
                { idempotencyKey },
              );

            stripePaymentIntentId = stripePaymentIntent.id;
            clientSecret = stripePaymentIntent.client_secret;

            // Update checkout with payment intent ID
            await tx.checkout.update({
              where: { id: checkout.id },
              data: { stripe_payment_intent_id: stripePaymentIntentId },
            });

            // Return early for one-time payments since checkout is already created
            return { checkout, clientSecret };
          }

          // create a subscription stripe payment intent
          // get a sponsorship tier
          if (!sponsorshipTierId)
            throw new ServiceBadRequestException(
              'sponsorship tier not available',
            );
          const subscriptionTier = await tx.sponsorshipTier
            .findFirstOrThrow({
              where: { public_id: sponsorshipTierId },
              select: {
                id: true,
                price: true,
                stripe_price_month_id: true,
                stripe_price_year_id: true,
              },
            })
            .catch(() => {
              throw new ServiceBadRequestException(
                'sponsorship tier not available',
              );
            });

          // determine stripe price ID and amount based on billing period
          const isYearly = billingPeriod === SponsorshipBillingPeriod.YEARLY;
          const hasCustomAmount = customAmount && customAmount > 0;

          let stripePriceId: string | null;
          let subscriptionAmount: number;
          const applicationFeePercent = APPLICATION_FEE;

          if (hasCustomAmount) {
            // Custom amount: create a dynamic Stripe price
            const customAmountCents = decimalToInteger(customAmount);
            subscriptionAmount = customAmountCents;

            // Validate custom amount bounds
            const MIN_SUBSCRIPTION = 100; // $1 minimum in cents
            const MAX_SUBSCRIPTION = 1000000; // $10,000 maximum in cents
            if (customAmountCents < MIN_SUBSCRIPTION) {
              throw new ServiceBadRequestException(
                'Subscription amount must be at least $1',
              );
            }
            if (customAmountCents > MAX_SUBSCRIPTION) {
              throw new ServiceBadRequestException(
                'Subscription amount cannot exceed $10,000',
              );
            }

            // Create a dynamic recurring price in Stripe
            const dynamicPrice = await this.stripeService.prices.create({
              unit_amount: customAmountCents,
              currency: CurrencyCode.USD,
              recurring: { interval: isYearly ? 'year' : 'month' },
              product_data: {
                name: `Sponsorship - $${customAmount}/mo`,
              },
            });
            stripePriceId = dynamicPrice.id;
          } else {
            // Tier-based amount: use pre-set Stripe price
            stripePriceId = isYearly
              ? subscriptionTier.stripe_price_year_id
              : subscriptionTier.stripe_price_month_id;

            const monthlyAmount = subscriptionTier.price;
            subscriptionAmount = isYearly
              ? this.calculateYearlyAmount(monthlyAmount)
              : monthlyAmount;

            if (!stripePriceId) {
              throw new ServiceBadRequestException(
                `${isYearly ? 'Yearly' : 'Monthly'} pricing not available for this tier`,
              );
            }
          }

          this.logger.log(
            `sponsorship tier ${subscriptionTier.id} is available to use${hasCustomAmount ? ` (custom amount: $${customAmount})` : ''}`,
          );

          amount = subscriptionAmount;

          // Create checkout first to get ID for metadata
          const checkout = await tx.checkout.create({
            data: {
              public_id: generator.publicId(),
              status: CheckoutStatus.PENDING,
              transaction_type: PaymentTransactionType.SPONSORSHIP,
              sponsorship_type: sponsorshipType,
              sponsorship_tier_id: sponsorshipTier.id,
              message,
              total: amount,
              explorer_id: user.id,
              sponsored_explorer_id: creator.id,
              email_delivery_enabled: emailDelivery,
              is_public: isPublic,
              is_message_public: isMessagePublic,
              expedition_public_id: expeditionId || null,
            },
            select: {
              id: true,
              public_id: true,
            },
          });

          // Use deterministic idempotency key based on checkout ID
          const subscriptionIdempotencyKey = `sponsor_sub_checkout_${checkout.id}`;

          // create a subscription with metadata
          const subscription = await this.stripeService.subscriptions.create(
            {
              customer: stripeCustomer.id,
              items: [{ price: stripePriceId }],
              default_payment_method: stripePaymentMethodId,
              transfer_data: { destination: creatorStripeAccountId },
              application_fee_percent: applicationFeePercent,
              collection_method: 'charge_automatically',
              payment_behavior: 'allow_incomplete',
              metadata: {
                [StripeMetadataKey.TRANSACTION]:
                  PaymentTransactionType.SPONSORSHIP,
                [StripeMetadataKey.CHECKOUT_ID]: checkout.id.toString(),
                [StripeMetadataKey.USER_ID]: user.id.toString(),
                [StripeMetadataKey.CREATOR_ID]: creator.id.toString(),
                description: `${user.username} sponsors ${creator.username}`,
              },
              payment_settings: {
                payment_method_types: ['card'],
                payment_method_options: {
                  card: {
                    // Use 'automatic' to let Stripe decide when 3DS is needed
                    request_three_d_secure: 'automatic',
                  },
                },
              },
            },
            { idempotencyKey: subscriptionIdempotencyKey },
          );

          stripeSubscriptionId = subscription.id;

          this.logger.log(`stripe subscription created`);

          // retrieve an invoice
          const invoiceId = subscription.latest_invoice as string;
          const invoice = await this.stripeService.invoices.retrieve(
            invoiceId,
            { expand: ['payment_intent'] },
          );
          const paymentIntent = invoice.payment_intent as {
            id: string;
            client_secret: string;
          };

          stripePaymentIntentId = paymentIntent.id;
          clientSecret = paymentIntent.client_secret;

          // Update checkout with stripe IDs
          await tx.checkout.update({
            where: { id: checkout.id },
            data: {
              stripe_payment_intent_id: stripePaymentIntentId,
              stripe_subscription_id: stripeSubscriptionId,
            },
          });

          // Add metadata to the payment intent as well
          await this.stripeService.paymentIntents.update(
            stripePaymentIntentId,
            {
              metadata: {
                [StripeMetadataKey.TRANSACTION]:
                  PaymentTransactionType.SPONSORSHIP,
                [StripeMetadataKey.CHECKOUT_ID]: checkout.id.toString(),
                [StripeMetadataKey.USER_ID]: user.id.toString(),
                [StripeMetadataKey.CREATOR_ID]: creator.id.toString(),
              },
            },
          );

          return { checkout, clientSecret };
        },
        { timeout: 30000 },
      );

      const response: ISponsorCheckoutResponse = {
        clientSecret,
        paymentMethodId: paymentMethod.stripe_payment_method_id,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async completeCheckout(
    payload: ISponsorCheckoutCompletePayload,
  ): Promise<void> {
    try {
      const { checkoutId, userId, creatorId } = payload;

      if (!checkoutId)
        throw new ServiceNotFoundException('checkout is not found');

      // Store checkout data for notification
      let checkoutData: {
        message: string;
        sponsorship_type: string;
        total: number;
        currency: string;
      };

      await this.prisma.$transaction(async (tx) => {
        // get a checkout (only if still pending — prevents double-completion race)
        const checkout = await tx.checkout.findFirstOrThrow({
          where: { id: checkoutId, status: CheckoutStatus.PENDING },
          select: {
            id: true,
            transaction_type: true,
            total: true,
            currency: true,
            sponsorship_type: true,
            sponsorship_tier_id: true,
            stripe_subscription_id: true,
            message: true,
            email_delivery_enabled: true,
            is_public: true,
            is_message_public: true,
            expedition_public_id: true,
          },
        });

        // Store checkout data for notification
        checkoutData = {
          message: checkout.message,
          sponsorship_type: checkout.sponsorship_type,
          total: checkout.total,
          currency: checkout.currency,
        };

        const expiry = dateformat().add(1, 'month').toDate();

        let status: SponsorshipStatus;

        switch (checkout.sponsorship_type) {
          case SponsorshipType.ONE_TIME_PAYMENT:
            status = SponsorshipStatus.CONFIRMED;
            break;
          case SponsorshipType.SUBSCRIPTION:
            status = SponsorshipStatus.ACTIVE;
            break;
          default:
            status = SponsorshipStatus.PENDING;
            break;
        }

        // create a sponsorship
        const sponsorship = await tx.sponsorship.create({
          data: {
            public_id: generator.publicId(),
            type: checkout.sponsorship_type,
            status,
            amount: checkout.total,
            message: checkout.message,
            currency: checkout.currency,
            stripe_subscription_id: checkout.stripe_subscription_id,
            email_delivery_enabled:
              checkout.sponsorship_type === SponsorshipType.SUBSCRIPTION
                ? checkout.email_delivery_enabled
                : false,
            is_public: checkout.is_public ?? true,
            is_message_public: checkout.is_message_public ?? true,
            expedition_public_id: checkout.expedition_public_id || null,
            expiry:
              checkout.sponsorship_type === SponsorshipType.SUBSCRIPTION
                ? expiry
                : undefined,
            tier: { connect: { id: checkout.sponsorship_tier_id } },
            sponsor: {
              connect: { id: userId },
            },
            sponsored_explorer: {
              connect: { id: creatorId },
            },
          },
          select: {
            sponsor_id: true,
            sponsored_explorer_id: true,
          },
        });

        // update the checkout
        await tx.checkout.update({
          where: { id: checkout.id },
          data: {
            status: CheckoutStatus.CONFIRMED,
            confirmed_at: new Date(),
          },
        });

        // Update the creator's active expedition raised amount and sponsor count
        // Goal and raised are stored in dollars, checkout.total is in cents
        const raisedDollars = integerToDecimal(checkout.total);
        const activeExpedition = await tx.expedition.findFirst({
          where: {
            author_id: creatorId,
            deleted_at: null,
            status: { in: ['active', 'planned'] },
          },
          select: { id: true },
          orderBy: { id: 'desc' },
        });

        if (activeExpedition) {
          await tx.expedition.update({
            where: { id: activeExpedition.id },
            data: {
              raised: { increment: raisedDollars },
              sponsors_count: { increment: 1 },
            },
          });
        }
      });

      // create a notification
      if (creatorId && userId && checkoutData) {
        this.eventService.trigger<IUserNotificationCreatePayload>({
          event: EVENTS.NOTIFICATION_CREATE,
          data: {
            context: UserNotificationContext.SPONSORSHIP,
            userId: creatorId,
            mentionUserId: userId,
            body: checkoutData.message,
            sponsorshipType: checkoutData.sponsorship_type,
            sponsorshipAmount: checkoutData.total,
            sponsorshipCurrency: checkoutData.currency,
          },
        });

        // Send sponsorship received email to the creator
        try {
          const sponsor = await this.prisma.explorer.findUnique({
            where: { id: userId },
            select: { username: true },
          });

          const creator = await this.prisma.explorer.findUnique({
            where: { id: creatorId },
            select: {
              email: true,
              username: true,
              is_email_verified: true,
              expeditions: {
                where: { deleted_at: null },
                orderBy: { id: 'desc' },
                take: 1,
                select: { public_id: true, title: true },
              },
            },
          });

          if (creator && creator.is_email_verified && sponsor) {
            const amount = integerToDecimal(checkoutData.total);
            const processingFee = calculateFee({
              amount,
              percent: APPLICATION_FEE,
            });
            const netAmount = amount - processingFee;
            const expedition = creator.expeditions[0];

            this.eventService.trigger<IEventSendEmail>({
              event: EVENTS.SEND_EMAIL,
              data: {
                to: creator.email,
                template: EMAIL_TEMPLATES.SPONSORSHIP_RECEIVED,
                vars: {
                  recipientUsername: creator.username,
                  sponsorUsername: sponsor.username,
                  amount,
                  currency: '$',
                  expeditionName: expedition?.title || 'Your Expedition',
                  expeditionId: expedition?.public_id || '',
                  message: checkoutData.message || undefined,
                  processingFee,
                  netAmount,
                },
              },
            });

            this.logger.log(
              `Sent sponsorship received email to ${creator.email}`,
            );
          }
        } catch (emailError) {
          this.logger.error(
            'Failed to send sponsorship received email:',
            emailError,
          );
        }
      }
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Complete checkout from a payment intent ID (called from frontend after successful payment)
   * This is a fallback for when webhooks are delayed or not configured
   */
  async completeCheckoutFromPaymentIntent({
    paymentIntentId,
    session,
  }: {
    paymentIntentId: string;
    session: { userId?: number };
  }): Promise<{ success: boolean }> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // Retrieve the payment intent from Stripe
      const paymentIntent =
        await this.stripeService.paymentIntents.retrieve(paymentIntentId);

      // Check if payment succeeded
      if (paymentIntent.status !== 'succeeded') {
        throw new ServiceBadRequestException('Payment has not succeeded');
      }

      // Extract checkout info from metadata
      const metadata = paymentIntent.metadata || {};
      const checkoutId = metadata[StripeMetadataKey.CHECKOUT_ID]
        ? parseInt(metadata[StripeMetadataKey.CHECKOUT_ID])
        : undefined;
      const creatorId = metadata[StripeMetadataKey.CREATOR_ID]
        ? parseInt(metadata[StripeMetadataKey.CREATOR_ID])
        : undefined;

      if (!checkoutId) {
        throw new ServiceBadRequestException(
          'Checkout ID not found in payment',
        );
      }

      // Check if checkout is still pending (not already completed)
      const checkout = await this.prisma.checkout.findFirst({
        where: { id: checkoutId },
        select: { status: true, explorer_id: true },
      });

      if (!checkout) {
        throw new ServiceNotFoundException('Checkout not found');
      }

      // Verify the calling user owns this checkout
      if (checkout.explorer_id !== userId) {
        throw new ServiceForbiddenException();
      }

      // If already confirmed, return success
      if (checkout.status === CheckoutStatus.CONFIRMED) {
        return { success: true };
      }

      // Complete the checkout
      await this.completeCheckout({
        checkoutId,
        userId,
        creatorId,
      });

      return { success: true };
    } catch (e) {
      this.logger.error('Error completing checkout from payment intent:', e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getSponsorshipTiersByUsername({
    session,
  }: ISessionQuery): Promise<ISponsorshipTierGetAllResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where: Prisma.SponsorshipTierWhereInput = {
        explorer_id: userId,
        deleted_at: null,
      };

      // get the sponsorship tiers
      const results = await this.prisma.sponsorshipTier.count({ where });
      const data = await this.prisma.sponsorshipTier
        .findMany({
          where,
          select: {
            public_id: true,
            type: true,
            price: true,
            description: true,
            is_available: true,
            priority: true,
            explorer: {
              select: {
                username: true,
                profile: {
                  select: {
                    name: true,
                    picture: true,
                  },
                },
              },
            },
            _count: {
              select: {
                sponsorships: {
                  where: {
                    status: SponsorshipStatus.ACTIVE,
                    deleted_at: null,
                  },
                },
              },
            },
          },
          orderBy: [{ type: 'asc' }, { priority: 'asc' }, { price: 'asc' }],
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship tiers not found');
        });

      const response = {
        data: data.map(
          ({
            price,
            description,
            public_id: id,
            type,
            is_available,
            priority,
            explorer,
            _count,
          }) => ({
            price: integerToDecimal(price),
            description,
            id,
            type: type as 'ONE_TIME' | 'MONTHLY',
            priority,
            isAvailable: is_available,
            membersCount: _count.sponsorships,
            creator: explorer
              ? {
                  username: explorer.username,
                  name: explorer.profile.name,
                  picture: explorer.profile.picture,
                  bio: '',
                }
              : undefined,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getSponsorshipTiers({
    session,
  }: ISessionQuery): Promise<ISponsorshipTierGetAllResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      const where: Prisma.SponsorshipTierWhereInput = {
        explorer_id: userId,
        deleted_at: null,
      };

      // get sponsorship tiers
      const results = await this.prisma.sponsorshipTier.count({ where });

      // create a sponsorship tier if it doesn't exist
      if (results < 1) {
        await this.prisma.sponsorshipTier.create({
          data: {
            public_id: generator.publicId(),
            price: config.sponsorship.default_amount,
            is_available: false,
            priority: 1,
            explorer_id: userId,
          },
        });
      }

      const data = await this.prisma.sponsorshipTier.findMany({
        where,
        select: {
          id: true,
          public_id: true,
          type: true,
          price: true,
          stripe_price_month_id: true,
          description: true,
          is_available: true,
          priority: true,
          members_count: true,
          _count: {
            select: {
              sponsorships: {
                where: {
                  status: SponsorshipStatus.ACTIVE,
                  deleted_at: null,
                },
              },
            },
          },
        },
        orderBy: [{ type: 'asc' }, { priority: 'asc' }, { price: 'asc' }],
      });

      const response: ISponsorshipTierGetAllResponse = {
        data: data.map(
          ({
            price,
            description,
            public_id: id,
            type,
            is_available,
            priority,
            _count,
          }) => ({
            price: integerToDecimal(price),
            description,
            priority,
            id,
            type: type as 'ONE_TIME' | 'MONTHLY',
            membersCount: _count.sponsorships,
            isAvailable: is_available,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createSponsorshipTier({
    session,
    payload,
  }: ISessionQueryWithPayload<{}, ISponsorshipTierCreatePayload>): Promise<{
    id: string;
  }> {
    try {
      const { userId, userRole } = session;
      const { type, price, isAvailable = false, priority } = payload;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // Get tier slot config - slots are pre-defined with fixed labels and price ranges
      const maxSlots =
        type === 'ONE_TIME'
          ? ONE_TIME_TIER_SLOTS.length
          : MONTHLY_TIER_SLOTS.length;
      const slot = priority || 1;

      if (slot < 1 || slot > maxSlots) {
        throw new ServiceBadRequestException(
          `Invalid tier slot. ${type === 'ONE_TIME' ? 'One-time' : 'Monthly'} tiers have slots 1-${maxSlots}`,
        );
      }

      // Validate price is within allowed range for this slot
      if (!isValidTierPrice(type, slot, price)) {
        const slotConfig = getTierSlotConfig(type, slot);
        const maxPriceText = slotConfig?.maxPrice
          ? `$${slotConfig.maxPrice}`
          : 'unlimited';
        throw new ServiceBadRequestException(
          `Price must be between $${slotConfig?.minPrice} and ${maxPriceText} for the ${slotConfig?.label} tier`,
        );
      }

      // Check if this slot already exists for this user
      const existingSlot = await this.prisma.sponsorshipTier.findFirst({
        where: {
          explorer_id: userId,
          type: type,
          priority: slot,
          deleted_at: null,
        },
      });

      if (existingSlot) {
        throw new ServiceBadRequestException(
          `Tier slot ${slot} already exists. Use update instead.`,
        );
      }

      // Get the fixed label for this slot
      const label = getTierLabel(type, slot);

      const tier = await this.prisma.sponsorshipTier.create({
        data: {
          public_id: generator.publicId(),
          type: type,
          price: decimalToInteger(price),
          description: label, // Use fixed label from slot config
          is_available: isAvailable,
          priority: slot,
          explorer_id: userId,
        },
        select: {
          public_id: true,
        },
      });

      return { id: tier.public_id };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async updateSponsorshipTier({
    query,
    payload,
    session,
  }: ISessionQueryWithPayload<
    { id: string },
    ISponsorshipTierUpdatePayload
  >): Promise<void> {
    try {
      const { userId } = session;
      const { price, isAvailable, description, priority } = payload;
      const { id } = query;

      const currency = CurrencyCode.USD;
      const interval = 'month';

      this.logger.log(`update sponsorship tier ${id}`);

      if (!id) throw new ServiceNotFoundException('sponsorship tier not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get a user
      const user = await this.prisma.explorer
        .findFirstOrThrow({ where: { id: userId }, select: { id: true } })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // get a payout method
      const payoutMethod = await this.prisma.payoutMethod
        .findFirstOrThrow({
          where: { explorer_id: userId },
          select: { stripe_account_id: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException('you have no payout methods');
        });

      const stripeAccountId = payoutMethod.stripe_account_id;

      // get a tier
      const tier = await this.prisma.sponsorshipTier
        .findFirstOrThrow({
          where: { public_id: id, explorer_id: userId, deleted_at: null },
          select: {
            id: true,
            type: true,
            priority: true,
            price: true,
            stripe_product_id: true,
            stripe_price_month_id: true,
            stripe_price_year_id: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship tier not found');
        });

      // Validate price is within allowed range for this slot
      if (price !== undefined && price !== null) {
        const tierType = tier.type as 'ONE_TIME' | 'MONTHLY';
        if (!isValidTierPrice(tierType, tier.priority, price)) {
          const slotConfig = getTierSlotConfig(tierType, tier.priority);
          const maxPriceText = slotConfig?.maxPrice
            ? `$${slotConfig.maxPrice}`
            : 'unlimited';
          throw new ServiceBadRequestException(
            `Price must be between $${slotConfig?.minPrice} and ${maxPriceText} for this tier slot`,
          );
        }
      }

      let stripeProductId = tier.stripe_product_id;
      let stripePriceMonthId = tier.stripe_price_month_id;
      let stripePriceYearId = tier.stripe_price_year_id;

      // get a stripe account
      const stripeAccount = await this.stripeService.accounts
        .retrieve(stripeAccountId)
        .catch(() => {
          throw new ServiceForbiddenException(
            'your stripe account is not connected yet',
          );
        });
      const stripeAccountVerified =
        stripeAccount?.requirements?.pending_verification?.length <= 0 || false;

      if (!stripeAccountVerified)
        throw new ServiceForbiddenException(
          'your stripe account is not verified yet',
        );

      // create a stripe product if not attached yet
      if (!stripeProductId) {
        this.logger.log(`stripe product is not found, creating [..]`);

        // create a stripe product
        const stripeProduct = await this.stripeService.products.create({
          name: `creator_${user.id}__sponsorship`,
          active: true,
          default_price_data: {
            currency,
            unit_amount: config.sponsorship.default_amount,
            recurring: { interval },
          },
        });

        this.logger.log(`stripe product created (${stripeProduct.id})`);

        stripeProductId = stripeProduct.id as string;
        stripePriceMonthId = stripeProduct.default_price as string;
      }

      const priceChanged = price
        ? price >= 1
          ? tier.price !== decimalToInteger(price)
          : false
        : false;

      // determine the amounts for monthly and yearly pricing
      const monthlyAmount = priceChanged
        ? decimalToInteger(price)
        : tier.price || config.sponsorship.default_amount;
      const yearlyAmount = this.calculateYearlyAmount(monthlyAmount);

      // create or update stripe prices if needed
      const needsMonthlyPrice = !stripePriceMonthId || priceChanged;
      const needsYearlyPrice = !stripePriceYearId || priceChanged;

      if (needsMonthlyPrice || needsYearlyPrice) {
        try {
          // store old price IDs for archiving later
          const oldMonthlyPriceId = stripePriceMonthId;
          const oldYearlyPriceId = stripePriceYearId;

          // create monthly price if needed
          if (needsMonthlyPrice) {
            const monthlyPrice = await this.stripeService.prices.create({
              currency,
              unit_amount: monthlyAmount,
              recurring: { interval: 'month' },
              product: stripeProductId,
            });

            stripePriceMonthId = monthlyPrice.id;
            this.logger.log(
              `stripe monthly price created (${stripePriceMonthId})`,
            );
          }

          // create yearly price if needed
          if (needsYearlyPrice) {
            const yearlyPrice = await this.stripeService.prices.create({
              currency,
              unit_amount: yearlyAmount,
              recurring: { interval: 'year' },
              product: stripeProductId,
            });

            stripePriceYearId = yearlyPrice.id;
            this.logger.log(
              `stripe yearly price created (${stripePriceYearId})`,
            );
          }

          // set new monthly price as default in the stripe product
          if (needsMonthlyPrice) {
            await this.stripeService.products.update(stripeProductId, {
              default_price: stripePriceMonthId,
            });
            this.logger.log(
              `stripe product default price updated to (${stripePriceMonthId})`,
            );
          }

          // now archive old prices (after setting new default)
          if (
            needsMonthlyPrice &&
            oldMonthlyPriceId &&
            oldMonthlyPriceId !== stripePriceMonthId
          ) {
            await this.stripeService.prices.update(oldMonthlyPriceId, {
              active: false,
            });
            this.logger.log(
              `archived old monthly price (${oldMonthlyPriceId})`,
            );
          }

          if (
            needsYearlyPrice &&
            oldYearlyPriceId &&
            oldYearlyPriceId !== stripePriceYearId
          ) {
            await this.stripeService.prices.update(oldYearlyPriceId, {
              active: false,
            });
            this.logger.log(`archived old yearly price (${oldYearlyPriceId})`);
          }
        } catch (stripeError) {
          // If the product doesn't exist (test vs live mode mismatch), create a new one
          if (stripeError.code === 'resource_missing') {
            this.logger.log(
              `stripe product not found in current mode, creating new product [..]`,
            );

            // create a stripe product with monthly default price
            const stripeProduct = await this.stripeService.products.create({
              name: `creator_${user.id}__sponsorship`,
              active: true,
              default_price_data: {
                currency,
                unit_amount: monthlyAmount,
                recurring: { interval: 'month' },
              },
            });

            this.logger.log(`stripe product created (${stripeProduct.id})`);

            stripeProductId = stripeProduct.id as string;
            stripePriceMonthId = stripeProduct.default_price as string;

            // create yearly price for the new product
            const yearlyPrice = await this.stripeService.prices.create({
              currency,
              unit_amount: yearlyAmount,
              recurring: { interval: 'year' },
              product: stripeProductId,
            });

            stripePriceYearId = yearlyPrice.id;
            this.logger.log(
              `stripe yearly price created for new product (${stripePriceYearId})`,
            );
          } else {
            throw stripeError; // Re-throw other Stripe errors
          }
        }
      }

      // update the sponsorship tier
      await this.prisma.sponsorshipTier.update({
        where: { id: tier.id },
        data: {
          price: price ? decimalToInteger(price) : undefined,
          description,
          is_available: isAvailable,
          priority,
          stripe_product_id: stripeProductId,
          stripe_price_month_id: stripePriceMonthId,
          stripe_price_year_id: stripePriceYearId,
        },
      });

      this.logger.log(`sponsorship tier ${tier.id} updated`);
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async deleteSponsorshipTier({
    query,
    session,
  }: ISessionQuery<{ id: string }>): Promise<void> {
    try {
      const { userId } = session;
      const { id } = query;

      if (!id) throw new ServiceNotFoundException('sponsorship tier not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get the sponsorship tier
      const sponsorshipTier = await this.prisma.sponsorshipTier
        .findFirstOrThrow({
          where: { public_id: id, explorer_id: userId, deleted_at: null },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship tier not found');
        });

      // delete the sponsorship tier
      await this.prisma.sponsorshipTier.update({
        where: { id: sponsorshipTier.id },
        data: { deleted_at: dateformat().toDate() },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getSponsorships({
    session,
  }: ISessionQuery): Promise<ISponsorshipGetAllResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      const access =
        !!userId && matchRoles(userRole, [UserRole.USER, UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      const where: Prisma.SponsorshipWhereInput = {
        sponsor_id: userId,
        deleted_at: null,
      };

      // get sponsorships
      const take = 50;
      const results = await this.prisma.sponsorship.count({ where });
      const data = await this.prisma.sponsorship.findMany({
        where,
        select: {
          public_id: true,
          status: true,
          type: true,
          amount: true,
          currency: true,
          message: true,
          email_delivery_enabled: true,
          expiry: true,
          expedition_public_id: true,
          sponsored_explorer: {
            select: {
              id: true,
              username: true,
              profile: {
                select: { name: true, picture: true },
              },
            },
          },
          created_at: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      // Batch-query expeditions by their public_ids stored on each sponsorship
      const expeditionPublicIds = [...new Set(
        data.map((s) => s.expedition_public_id).filter(Boolean),
      )] as string[];
      const expeditions = expeditionPublicIds.length > 0
        ? await this.prisma.expedition.findMany({
            where: {
              public_id: { in: expeditionPublicIds },
              deleted_at: null,
            },
            select: {
              public_id: true,
              title: true,
              status: true,
              visibility: true,
              cover_image: true,
            },
          })
        : [];

      const expeditionByPublicId = new Map(expeditions.map((exp) => [exp.public_id, exp]));

      const response: ISponsorshipGetAllResponse = {
        results,
        data: data.map(
          ({
            public_id: id,
            amount,
            currency,
            status,
            sponsored_explorer,
            expedition_public_id,
            type,
            message = '',
            email_delivery_enabled,
            expiry,
            created_at,
          }) => ({
            id,
            type: type as SponsorshipType,
            amount: integerToDecimal(amount),
            status,
            currency,
            message,
            email_delivery_enabled,
            expiry,
            creator: sponsored_explorer
              ? {
                  username: sponsored_explorer.username,
                  name: sponsored_explorer.profile.name,
                  picture: sponsored_explorer.profile.picture,
                }
              : undefined,
            expedition: (() => {
              const exp = expedition_public_id ? expeditionByPublicId.get(expedition_public_id) : undefined;
              return exp ? {
                id: exp.public_id,
                title: exp.title,
                status: exp.status,
                visibility: exp.visibility || 'public',
                coverPhoto: exp.cover_image ? getStaticMediaUrl(exp.cover_image) : undefined,
              } : undefined;
            })(),
            createdAt: created_at,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getCreatorSponsorships({
    session,
  }: ISessionQuery): Promise<ISponsorshipGetAllResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      const where: Prisma.SponsorshipWhereInput = {
        sponsored_explorer_id: userId,
        deleted_at: null,
      };

      // get sponsorships
      const take = 50;
      const results = await this.prisma.sponsorship.count({ where });
      const data = await this.prisma.sponsorship.findMany({
        where,
        select: {
          public_id: true,
          type: true,
          amount: true,
          status: true,
          currency: true,
          message: true,
          is_public: true,
          is_message_public: true,
          sponsor: {
            select: {
              username: true,
              profile: {
                select: { name: true, picture: true },
              },
            },
          },
          tier: {
            select: {
              public_id: true,
              description: true,
              priority: true,
              price: true,
            },
          },
          created_at: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      const response: ISponsorshipGetAllResponse = {
        results,
        data: data.map(
          ({
            public_id: id,
            amount,
            currency,
            status,
            sponsor,
            type,
            tier,
            created_at,
            message,
            is_public,
            is_message_public,
          }) => ({
            id,
            type: type as SponsorshipType,
            status,
            amount: integerToDecimal(amount),
            currency,
            message,
            isPublic: is_public ?? true,
            isMessagePublic: is_message_public ?? true,
            user: sponsor
              ? {
                  username: sponsor.username,
                  name: sponsor.profile.name,
                  picture: sponsor.profile.picture,
                }
              : undefined,
            tier: tier
              ? {
                  id: tier.public_id,
                  description: tier.description,
                  title: `Tier ${tier.priority}`,
                  price: integerToDecimal(tier.price),
                }
              : undefined,
            createdAt: created_at,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Get payments directly from Stripe for the creator's connected account
   * This is the source of truth - shows payments even if webhooks didn't process
   *
   * Uses platform payment intents (which have metadata) instead of connected account charges
   * to reliably match sponsor information via checkout_id in metadata
   */
  async getStripePayments({ session }: ISessionQuery): Promise<{
    results: number;
    data: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      refunded: boolean;
      created: Date;
      sponsorEmail?: string;
      sponsorName?: string;
      sponsorUsername?: string;
      description?: string;
    }>;
  }> {
    try {
      const { userId, userRole } = session;

      // check access - must be a creator
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // Query confirmed checkouts from our database (fast, no Stripe API call)
      const checkouts = await this.prisma.checkout.findMany({
        where: {
          sponsored_explorer_id: userId,
          confirmed_at: { not: null },
          deleted_at: null,
          stripe_payment_intent_id: { not: null },
        },
        select: {
          stripe_payment_intent_id: true,
          total: true,
          currency: true,
          confirmed_at: true,
          message: true,
          explorer: {
            select: {
              id: true,
              username: true,
              email: true,
              profile: { select: { name: true } },
            },
          },
        },
        orderBy: { confirmed_at: 'desc' },
        take: 100,
      });

      if (checkouts.length === 0) {
        return { results: 0, data: [] };
      }

      // Check refund status via Stripe in a single batch
      // Only fetch payment intents that exist (parallel, but scoped to our records)
      const refundStatusMap = new Map<string, boolean>();
      const piIds = checkouts
        .map((c) => c.stripe_payment_intent_id)
        .filter((id): id is string => !!id);

      // Batch retrieve payment intents in parallel (max 10 concurrent)
      const batchSize = 10;
      for (let i = 0; i < piIds.length; i += batchSize) {
        const batch = piIds.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((piId) =>
            this.stripeService.paymentIntents
              .retrieve(piId, { expand: ['latest_charge'] })
              .catch(() => null),
          ),
        );
        for (const pi of results) {
          if (pi) {
            const charge = pi.latest_charge as Stripe.Charge | null;
            refundStatusMap.set(pi.id, charge?.refunded || false);
          }
        }
      }

      const data = checkouts.map((checkout) => {
        const piId = checkout.stripe_payment_intent_id!;
        return {
          id: piId,
          amount: integerToDecimal(checkout.total),
          currency: (checkout.currency || 'usd').toUpperCase(),
          status: 'succeeded',
          refunded: refundStatusMap.get(piId) || false,
          created: checkout.confirmed_at!,
          sponsorEmail: checkout.explorer?.email || undefined,
          sponsorName: checkout.explorer?.profile?.name || undefined,
          sponsorUsername: checkout.explorer?.username || undefined,
          description: checkout.message || undefined,
        };
      });

      return {
        results: data.length,
        data,
      };
    } catch (e) {
      this.logger.error('Error fetching Stripe payments:', e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Issue a refund for a payment (creator only)
   * For destination charges, refunds are issued from the platform account
   * with reverse_transfer to pull back funds from the connected account
   */
  async issueRefund({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    { chargeId: string; reason?: string }
  >): Promise<{ success: boolean; refundId: string }> {
    try {
      const { userId, userRole } = session;
      const { chargeId, reason } = payload;

      // check access - must be a creator
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // get the user's payout method (connected account)
      const payoutMethod = await this.prisma.payoutMethod.findFirst({
        where: {
          explorer_id: userId,
          platform: PayoutMethodPlatform.STRIPE,
          deleted_at: null,
        },
        select: { stripe_account_id: true },
      });

      if (!payoutMethod?.stripe_account_id) {
        throw new ServiceBadRequestException('No payout method configured');
      }

      // For destination charges, the charge ID from the connected account
      // maps to a payment intent on the platform. We need to find it.
      // First, retrieve the charge from the connected account to get the payment intent
      const connectedCharge = await this.stripeService.charges.retrieve(
        chargeId,
        { stripeAccount: payoutMethod.stripe_account_id },
      );

      if (!connectedCharge || connectedCharge.refunded) {
        throw new ServiceBadRequestException(
          'Charge not found or already refunded',
        );
      }

      // Get the source transfer to find the platform payment intent
      const sourceTransfer = connectedCharge.source_transfer;
      if (!sourceTransfer) {
        throw new ServiceBadRequestException(
          'Cannot find source transfer for this charge',
        );
      }

      // Retrieve the transfer to get the payment intent
      const transferId =
        typeof sourceTransfer === 'string' ? sourceTransfer : sourceTransfer.id;
      const transfer = await this.stripeService.transfers.retrieve(transferId);

      if (!transfer.source_transaction) {
        throw new ServiceBadRequestException(
          'Cannot find platform charge for this transfer',
        );
      }

      // Get the platform charge ID
      const platformChargeId =
        typeof transfer.source_transaction === 'string'
          ? transfer.source_transaction
          : transfer.source_transaction.id;

      // Issue the refund from the PLATFORM account (not connected account)
      // with reverse_transfer to pull back funds from connected account
      const refund = await this.stripeService.refunds.create({
        charge: platformChargeId,
        reason: 'requested_by_customer',
        reverse_transfer: true, // Reverse the transfer to connected account
        refund_application_fee: true, // Also refund the application fee
        metadata: {
          issued_by: 'creator',
          creator_id: userId.toString(),
          creator_reason: reason || 'Refund requested by creator',
          connected_account: payoutMethod.stripe_account_id,
        },
      });

      // Update checkout status in our database
      if (transfer.metadata?.checkout_id) {
        await this.prisma.checkout.updateMany({
          where: { id: parseInt(transfer.metadata.checkout_id) },
          data: { status: 'REFUNDED' },
        });
      }

      this.logger.log(
        `Refund ${refund.id} issued for platform charge ${platformChargeId} (connected charge: ${chargeId}) by user ${userId}`,
      );

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (e) {
      this.logger.error('Error issuing refund:', e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async cancelSponsorship({
    session,
    query,
  }: ISessionQuery<{ sponsorshipId: string }>): Promise<void> {
    try {
      const { userId, userRole } = session;
      const { sponsorshipId } = query;

      if (!sponsorshipId)
        throw new ServiceNotFoundException('sponsorship not found');

      // check access
      const access =
        !!userId && matchRoles(userRole, [UserRole.USER, UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // get a sponsorship and verify ownership
      const sponsorship = await this.prisma.sponsorship
        .findFirst({
          where: {
            public_id: sponsorshipId,
            sponsor_id: userId, // SECURITY: Only allow sponsor to cancel their own sponsorship
            type: SponsorshipType.SUBSCRIPTION,
            status: SponsorshipStatus.ACTIVE,
            stripe_subscription_id: { not: null },
            deleted_at: null,
          },
          select: { id: true, stripe_subscription_id: true, sponsor_id: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException(`sponsorship can't be canceled`);
        });

      // Verify user owns this sponsorship
      if (!sponsorship || sponsorship.sponsor_id !== userId) {
        throw new ServiceForbiddenException(
          'not authorized to cancel this sponsorship',
        );
      }

      if (!sponsorship.stripe_subscription_id)
        throw new ServiceForbiddenException(`sponsorship can't be canceled`);

      // retrieve a stripe subscription
      const stripeSubscription =
        await this.stripeService.subscriptions.retrieve(
          sponsorship.stripe_subscription_id,
        );
      if (stripeSubscription.status !== 'active')
        if (!sponsorship.stripe_subscription_id)
          throw new ServiceForbiddenException(`sponsorship can't be canceled`);

      // cancel the subscription on stripe
      await this.stripeService.subscriptions.cancel(stripeSubscription.id);

      // update the sponsorship
      await this.prisma.sponsorship.update({
        where: { id: sponsorship.id },
        data: { status: SponsorshipStatus.CANCELED },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async toggleEmailDelivery({
    query,
    payload,
    session,
  }: ISessionQueryWithPayload<
    { sponsorshipId: string },
    { enabled: boolean }
  >): Promise<void> {
    try {
      const { sponsorshipId } = query;
      const { enabled } = payload;
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // Find the sponsorship belonging to the user
      const sponsorship = await this.prisma.sponsorship
        .findFirstOrThrow({
          where: {
            public_id: sponsorshipId,
            sponsor_id: userId,
            type: SponsorshipType.SUBSCRIPTION,
            deleted_at: null,
          },
          select: { id: true, email_delivery_enabled: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship not found');
        });

      // Update email delivery preference
      await this.prisma.sponsorship.update({
        where: { id: sponsorship.id },
        data: { email_delivery_enabled: enabled },
      });

      this.logger.log(
        `Email delivery ${enabled ? 'enabled' : 'disabled'} for sponsorship ${sponsorshipId}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  @OnEvent(EVENTS.SPONSORSHIP_CHECKOUT_COMPLETE)
  async onSponsorCheckoutComplete(event: IOnSponsorCheckoutCompleteEvent) {
    try {
      const { checkoutId, creatorId, userId } = event;

      await this.completeCheckout({
        checkoutId,
        creatorId,
        userId,
      });
    } catch (e) {
      this.logger.error('Error completing sponsor checkout:', e);
    }
  }
}
