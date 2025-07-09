import { EVENTS, EventService } from '../event';
import { IUserNotificationCreatePayload } from '../notification';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import {
  CheckoutStatus,
  ISponsorCheckoutPayload,
  ISponsorCheckoutResponse,
  ISponsorshipGetAllResponse,
  ISponsorshipTierGetAllResponse,
  ISponsorshipTierUpdatePayload,
  PayoutMethodPlatform,
  SponsorshipStatus,
  SponsorshipType,
  UserNotificationContext,
  UserRole,
} from '@repo/types';
import Stripe from 'stripe';

import { calculateFee } from '@/lib/calculator';
import { dateformat } from '@/lib/date-format';
import { decimalToInteger, integerToDecimal } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { matchRoles } from '@/lib/utils';

import {
  CurrencyCode,
  PaymentTransactionType,
  StripeMetadataKey,
} from '@/common/enums';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
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
        creatorId,
        paymentMethodId,
        message = '',
      } = payload;

      if (!userId) throw new ServiceForbiddenException();

      const sponsorshipType =
        payload.sponsorshipType === SponsorshipType.SUBSCRIPTION
          ? SponsorshipType.SUBSCRIPTION
          : SponsorshipType.ONE_TIME_PAYMENT;
      const currency = CurrencyCode.USD;

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
      const user = await this.prisma.user.findFirstOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          stripe_customer_id: true,
        },
      });

      // get a creator
      const creator = await this.prisma.user.findFirstOrThrow({
        where: { username: creatorId },
        select: {
          id: true,
          stripe_customer_id: true,
          username: true,
        },
      });

      // check if the user already sponsors the creator
      if (sponsorshipType === SponsorshipType.SUBSCRIPTION) {
        const subscribed = await this.prisma.sponsorship
          .count({
            where: {
              type: SponsorshipType.SUBSCRIPTION,
              status: SponsorshipStatus.ACTIVE,
              user_id: user.id,
              creator_id: creator.id,
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
        where: { user_id: creator.id, platform: PayoutMethodPlatform.STRIPE },
        select: { stripe_account_id: true },
      });
      const creatorStripeAccountId = payoutMethod.stripe_account_id;

      // get a payment method
      const paymentMethod = await this.prisma.paymentMethod.findFirstOrThrow({
        where: { public_id: paymentMethodId },
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
          let stripeSubscriptionId: string | undefined;
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

            const stripePaymentIntent =
              await this.stripeService.stripe.paymentIntents.create({
                amount: decimalToInteger(oneTimePaymentAmount),
                currency,
                customer: stripeCustomer.id,
                payment_method: stripePaymentMethodId,
                transfer_data: { destination: creatorStripeAccountId },
                payment_method_types: ['card'],
                application_fee_amount: applicationFeeAmount,
                description: '****',
              });
            amount = decimalToInteger(oneTimePaymentAmount);
            stripePaymentIntentId = stripePaymentIntent.id;
            clientSecret = stripePaymentIntent.client_secret;
          }

          // create a subscription stripe payment intent
          if (sponsorshipType === SponsorshipType.SUBSCRIPTION) {
            // get a sponsorship tier
            if (!sponsorshipTierId)
              throw new ServiceBadRequestException(
                'sponsorship tier not available',
              );
            const sponsorshipTier = await tx.sponsorshipTier
              .findFirstOrThrow({
                where: { public_id: sponsorshipTierId },
                select: { id: true, price: true, stripe_price_month_id: true },
              })
              .catch(() => {
                throw new ServiceBadRequestException(
                  'sponsorship tier not available',
                );
              });

            const stripePriceId = sponsorshipTier.stripe_price_month_id;
            const subscriptionAmount = sponsorshipTier.price;
            const applicationFeePercent = APPLICATION_FEE;

            this.logger.log(
              `sponsorship tier ${sponsorshipTier.id} is available to use`,
            );

            // create a subscription
            const subscription =
              await this.stripeService.stripe.subscriptions.create({
                customer: stripeCustomer.id,
                items: [{ price: stripePriceId }],
                default_payment_method: stripePaymentMethodId,
                transfer_data: { destination: creatorStripeAccountId },
                application_fee_percent: applicationFeePercent,
                collection_method: 'charge_automatically',
                payment_behavior: 'allow_incomplete',
                metadata: {
                  description: `@${user.username} sponsors @${creator.username}`,
                },
                payment_settings: {
                  payment_method_types: ['card'],
                  payment_method_options: {
                    card: {
                      request_three_d_secure: 'challenge',
                    },
                  },
                },
              });

            stripeSubscriptionId = subscription.id;

            this.logger.log(`stripe subscription created`);

            //retrieve an invoice
            const invoiceId = subscription.latest_invoice as string;
            const invoice = await this.stripeService.stripe.invoices.retrieve(
              invoiceId,
              { expand: ['payment_intent'] },
            );
            const paymentIntent = invoice.payment_intent as {
              id: string;
              client_secret: string;
            };

            amount = subscriptionAmount;
            (stripePaymentIntentId = paymentIntent.id),
              (clientSecret = paymentIntent.client_secret);

            console.log({
              subscriptionId: subscription.id,
              subscriptionAmount,
              invoice,
              clientSecret,
              stripePaymentIntentId,
            });
          }

          // create a checkout
          const checkout = await tx.checkout.create({
            data: {
              public_id: generator.publicId(),
              status: CheckoutStatus.PENDING,
              transaction_type: PaymentTransactionType.SPONSORSHIP,
              sponsorship_type: sponsorshipType,
              sponsorship_tier_id: sponsorshipTier.id,
              message,
              total: amount,
              user_id: user.id,
              creator_id: creator.id,
              stripe_payment_intent_id: stripePaymentIntentId,
              stripe_subscription_id: stripeSubscriptionId,
            },
            select: {
              id: true,
              public_id: true,
              status: true,
              total: true,
              currency: true,
            },
          });

          // add metadata to the payment intent
          const metadata = {
            [StripeMetadataKey.TRANSACTION]: PaymentTransactionType.SPONSORSHIP,
            [StripeMetadataKey.CHECKOUT_ID]: checkout.id,
            [StripeMetadataKey.USER_ID]: user.id,
            [StripeMetadataKey.CREATOR_ID]: creator.id,
          };

          console.log('update metadata', {
            stripePaymentIntentId,
            metadata,
          });

          if (stripePaymentIntentId) {
            await this.stripeService.stripe.paymentIntents.update(
              stripePaymentIntentId,
              { metadata },
            );
          }

          return { checkout, clientSecret };
        },
        { timeout: 10000 },
      );

      const response: ISponsorCheckoutResponse = {
        clientSecret,
        paymentMethodId: paymentMethod.stripe_payment_method_id,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('sponsor checkout failed');
      throw exception;
    }
  }

  async completeCheckout(
    payload: ISponsorCheckoutCompletePayload,
  ): Promise<void> {
    try {
      const { checkoutId, userId, creatorId } = payload;

      if (!checkoutId)
        throw new ServiceNotFoundException('checkout is not found');

      await this.prisma.$transaction(async (tx) => {
        // get a checkout
        const checkout = await tx.checkout.findFirstOrThrow({
          where: { id: checkoutId },
          select: {
            id: true,
            transaction_type: true,
            total: true,
            currency: true,
            sponsorship_type: true,
            sponsorship_tier_id: true,
            stripe_subscription_id: true,
            message: true,
          },
        });

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
            expiry:
              checkout.sponsorship_type === SponsorshipType.SUBSCRIPTION
                ? expiry
                : undefined,
            tier: { connect: { id: checkout.sponsorship_tier_id } },
            user: {
              connect: { id: userId },
            },
            creator: {
              connect: { id: creatorId },
            },
          },
          select: {
            user_id: true,
            creator_id: true,
          },
        });

        // update the checkout
        await tx.checkout.update({
          where: { id: checkout.id },
          data: {
            status: CheckoutStatus.CONFIRMED,
          },
        });
      });

      // create a notification
      if (creatorId && userId) {
        this.eventService.trigger<IUserNotificationCreatePayload>({
          event: EVENTS.NOTIFICATION_CREATE,
          data: {
            context: UserNotificationContext.SPONSORSHIP,
            userId: creatorId,
            mentionUserId: userId,
          },
        });
      }
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('sponsor checkout not completed');
      throw exception;
    }
  }

  async getSponsorshipTiersByUsername({
    session,
  }: ISessionQuery): Promise<ISponsorshipTierGetAllResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where: Prisma.SponsorshipTierWhereInput = {
        user_id: userId,
        deleted_at: null,
      };

      // get the sponsorship tiers
      const results = await this.prisma.sponsorshipTier.count({ where });
      const data = await this.prisma.sponsorshipTier
        .findMany({
          where,
          select: {
            public_id: true,
            price: true,
            description: true,
            is_available: true,
            user: {
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
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship tiers not found');
        });

      const response = {
        data: data.map(
          ({ price, description, public_id: id, is_available, user }) => ({
            price: integerToDecimal(price),
            description,
            id,
            isAvailable: is_available,
            membersCount: 0,
            creator: user
              ? {
                  username: user.username,
                  name: user.profile.name,
                  picture: user.profile.picture,
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
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorship tiers not found');
      throw exception;
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
        user_id: userId,
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
            user_id: userId,
          },
        });
      }

      const data = await this.prisma.sponsorshipTier.findMany({
        where,
        select: {
          public_id: true,
          price: true,
          stripe_price_month_id: true,
          description: true,
          is_available: true,
          members_count: true,
        },
        orderBy: [{ id: 'desc' }],
        take: 1,
      });

      const response: ISponsorshipTierGetAllResponse = {
        data: data
          .slice(0, 1)
          .map(
            ({
              price,
              description,
              public_id: id,
              is_available,
              members_count,
            }) => ({
              price: integerToDecimal(price),
              description,
              id,
              membersCount: members_count,
              isAvailable: is_available,
            }),
          ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorship tiers not found');
      throw exception;
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
      const { price, isAvailable, description } = payload;
      const { id } = query;

      const currency = CurrencyCode.USD;
      const interval = 'month';

      this.logger.log(`update sponsorship tier ${id}`);

      if (!id) throw new ServiceNotFoundException('sponsorship tier not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get a user
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { id: userId }, select: { id: true } })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // get a payout method
      const payoutMethod = await this.prisma.payoutMethod
        .findFirstOrThrow({
          where: { user_id: userId },
          select: { stripe_account_id: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException('you have no payout methods');
        });

      const stripeAccountId = payoutMethod.stripe_account_id;

      // get a tier
      const tier = await this.prisma.sponsorshipTier
        .findFirstOrThrow({
          where: { public_id: id, user_id: userId, deleted_at: null },
          select: {
            id: true,
            price: true,
            stripe_product_id: true,
            stripe_price_month_id: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship tier not found');
        });

      let stripeProductId = tier.stripe_product_id;
      let stripePriceId = tier.stripe_price_month_id;

      // get a stripe account
      const stripeAccount = await this.stripeService.stripe.accounts
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
        const stripeProduct = await this.stripeService.stripe.products.create({
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
        stripePriceId = stripeProduct.default_price as string;
      }

      const priceChanged = price
        ? price >= 1
          ? tier.price !== price
          : false
        : false;

      // create a stripe price if not attached yet or the amount changed
      if (!stripePriceId || priceChanged) {
        // create a stripe price
        const stripePrice = await this.stripeService.stripe.prices.create({
          currency,
          unit_amount: priceChanged
            ? decimalToInteger(price)
            : config.sponsorship.default_amount,
          recurring: { interval: 'month' },
          product: stripeProductId,
        });

        // set the price as default in the stripe product
        await this.stripeService.stripe.products.update(stripeProductId, {
          default_price: stripePrice.id,
        });

        // archive the previous price
        await this.stripeService.stripe.prices.update(stripePriceId, {
          active: false,
        });

        stripePriceId = stripePrice.id as string;

        this.logger.log(`stripe price updated (${stripePriceId})`);

        // update the sponsorship tier
        await this.prisma.sponsorshipTier.update({
          where: { id: tier.id },
          data: {
            stripe_price_month_id: stripePriceId,
          },
        });
      }

      // update the sponsorship tier
      await this.prisma.sponsorshipTier.update({
        where: { id: tier.id },
        data: {
          price: price ? decimalToInteger(price) : undefined,
          description,
          is_available: isAvailable,
          stripe_product_id: stripeProductId,
          stripe_price_month_id: stripePriceId,
        },
      });

      this.logger.log(`sponsorship tier ${tier.id} updated`);
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorship tier not updated');
      throw exception;
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
          where: { public_id: id, user_id: userId, deleted_at: null },
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
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorship tier not deleted');
      throw exception;
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
        user_id: userId,
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
          creator: {
            select: {
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

      const response: ISponsorshipGetAllResponse = {
        results,
        data: data.map(
          ({
            public_id: id,
            amount,
            currency,
            status,
            creator,
            type,
            message = '',
            created_at,
          }) => ({
            id,
            type: type as SponsorshipType,
            amount: integerToDecimal(amount),
            status,
            currency,
            message,
            creator: creator
              ? {
                  username: creator.username,
                  name: creator.profile.name,
                  picture: creator.profile.picture,
                }
              : undefined,
            createdAt: created_at,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorships not found');
      throw exception;
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
        creator_id: userId,
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
          user: {
            select: {
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

      const response: ISponsorshipGetAllResponse = {
        results,
        data: data.map(
          ({
            public_id: id,
            amount,
            currency,
            status,
            user,
            type,
            created_at,
            message,
          }) => ({
            id,
            type: type as SponsorshipType,
            status,
            amount: integerToDecimal(amount),
            currency,
            message,
            user: user
              ? {
                  username: user.username,
                  name: user.profile.name,
                  picture: user.profile.picture,
                }
              : undefined,
            createdAt: created_at,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorships not found');
      throw exception;
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

      // get a sponsorship
      const sponsorship = await this.prisma.sponsorship
        .findFirst({
          where: {
            public_id: sponsorshipId,
            type: SponsorshipType.SUBSCRIPTION,
            status: SponsorshipStatus.ACTIVE,
            stripe_subscription_id: { not: null },
            deleted_at: null,
          },
          select: { id: true, stripe_subscription_id: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException(`sponsorship can't be canceled`);
        });

      if (!sponsorship.stripe_subscription_id)
        throw new ServiceForbiddenException(`sponsorship can't be canceled`);

      // retrieve a stripe subscription
      const stripeSubscription =
        await this.stripeService.stripe.subscriptions.retrieve(
          sponsorship.stripe_subscription_id,
        );
      if (stripeSubscription.status !== 'active')
        if (!sponsorship.stripe_subscription_id)
          throw new ServiceForbiddenException(`sponsorship can't be canceled`);

      // cancel the subscription on stripe
      await this.stripeService.stripe.subscriptions.cancel(
        stripeSubscription.id,
      );

      // update the sponsorship
      await this.prisma.sponsorship.update({
        where: { id: sponsorship.id },
        data: { status: SponsorshipStatus.CANCELED },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('sponsorship not canceled');
      throw exception;
    }
  }

  @OnEvent(EVENTS.SPONSORSHIP_CHECKOUT_COMPLETE)
  async onSponsorCheckoutComplete(event: IOnSponsorCheckoutCompleteEvent) {
    try {
      const { checkoutId, creatorId, userId } = event;

      this.completeCheckout({
        checkoutId,
        creatorId,
        userId,
      });
    } catch (e) {
      this.logger.error(e);
    }
  }
}
