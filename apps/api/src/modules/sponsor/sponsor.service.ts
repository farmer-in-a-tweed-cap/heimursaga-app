import { EVENTS } from '../event';
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
  SponsorshipType,
  UserRole,
} from '@repo/types';
import Stripe from 'stripe';

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
import { config } from '@/config';
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
        sponsorshipType,
        sponsorshipTierId,
        oneTimePaymentAmount,
        creatorId,
        paymentMethodId,
      } = payload;

      if (!userId) throw new ServiceForbiddenException();

      const currency = CurrencyCode.USD;

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
      const { checkout, clientSecret } = await this.prisma.$transaction(
        async (tx) => {
          let amount = 0;
          let stripePaymentIntentId: string | undefined;
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
            const stripePaymentIntent =
              await this.stripeService.stripe.paymentIntents.create({
                amount: decimalToInteger(oneTimePaymentAmount),
                currency,
                customer: stripeCustomer.id,
                payment_method: stripePaymentMethodId,
                // connected account id
                transfer_data: { destination: creatorStripeAccountId },
                payment_method_types: ['card'],
                application_fee_amount: config.stripe.application_fee, // platform fee in cents
                description: '****',
              });
            amount = decimalToInteger(oneTimePaymentAmount);
            stripePaymentIntentId = stripePaymentIntent.id;
            clientSecret = stripePaymentIntent.client_secret;
          }

          // @todo
          // create a subscription stripe payment intent
          // if (sponsorshipType === SponsorshipType.SUBSCRIPTION) {
          //   // get a sponsorship tier
          //   if (!sponsorshipTierId)
          //     throw new ServiceBadRequestException(
          //       'sponsorship tier not available',
          //     );
          //   const sponsorshipTier = await tx.sponsorshipTier
          //     .findFirstOrThrow({
          //       where: { public_id: sponsorshipTierId },
          //       select: { id: true, price: true },
          //     })
          //     .catch(() => {
          //       throw new ServiceBadRequestException(
          //         'sponsorship tier not available',
          //       );
          //     });
          //   const subscriptionAmount = sponsorshipTier.price;

          //   this.logger.log(
          //     `sponsorship tier ${sponsorshipTier.id} is available to use`,
          //   );

          //   // create a subscription
          //   const subscription =
          //     await this.stripeService.stripe.subscriptions.create({
          //       customer: stripeCustomer.id,
          //       items: [{ price: 'price_1ROXtyAz25Iy6quJ6N1XmhSF' }],
          //       default_payment_method: stripePaymentMethodId,
          //       transfer_data: { destination: creatorStripeAccountId },
          //       application_fee_percent: config.stripe.application_fee,
          //       collection_method: 'charge_automatically',
          //       metadata: {
          //         description: `@${user.username} sponsors @${creator.username}`,
          //       },
          //     });

          //   this.logger.log(`stripe subscription created`);

          //   // create a invoice
          //   const invoice2 =
          //     await this.stripeService.stripe.invoiceItems.create({
          //       customer: stripeCustomer.id,
          //       amount: decimalToInteger(subscriptionAmount),
          //       currency,
          //       subscription: subscription.id,
          //       description: `@${user.username} sponsors @${creator.username}`,
          //     });

          //   console.log({ creatorStripeAccountId });

          //   console.log(
          //     JSON.stringify(
          //       { sponsorshipTier, subscriptionAmount, subscription, invoice2 },
          //       null,
          //       2,
          //     ),
          //   );

          //   throw new ServiceBadRequestException('bad request!');

          //   // retrieve the invoice
          //   const invoice = await this.stripeService.stripe.invoices.retrieve(
          //     subscription.latest_invoice as string,
          //   );

          //   this.logger.log(`stripe invoice created`);

          //   amount = decimalToInteger(subscriptionAmount);
          //   // stripePaymentIntentId = stripePaymentIntent.id;

          //   // console.log({ payment_intent: invoice.payment_intent });

          //   // console.log(s
          //   //   JSON.stringify(
          //   //     {
          //   //       id: invoice.id,
          //   //       status: invoice.status,
          //   //       total: invoice.total, // Should match decimalToInteger(subscriptionAmount)
          //   //       amount_due: invoice.amount_due,
          //   //       lines: invoice.lines.data.map((line) => ({
          //   //         type: line.type,
          //   //         amount: line.amount,
          //   //         description: line.description,
          //   //       })),
          //   //       payment_intent: invoice.payment_intent,
          //   //     },
          //   //     null,
          //   //     2,
          //   //   ),
          //   // );

          //   // const finalizedInvoice =
          //   //   await this.stripeService.stripe.invoices.finalizeInvoice(
          //   //     invoice.id,
          //   //   );
          //   // this.logger.log(
          //   //   `stripe invoice finalized: ${finalizedInvoice.id}, status: ${finalizedInvoice.status}`,
          //   // );

          //   // // Get clientSecret from the PaymentIntent
          //   // let clientSecret = null;
          //   // if (finalizedInvoice.payment_intent) {
          //   //   const paymentIntent =
          //   //     await this.stripeService.stripe.paymentIntents.retrieve(
          //   //       typeof finalizedInvoice.payment_intent === 'string'
          //   //         ? finalizedInvoice.payment_intent
          //   //         : finalizedInvoice.payment_intent.id,
          //   //     );
          //   //   clientSecret = paymentIntent.client_secret;
          //   // } else {
          //   //   this.logger.warn(
          //   //     `No payment_intent for invoice ${finalizedInvoice.id}. Total: ${finalizedInvoice.total}`,
          //   //   );
          //   // }

          //   throw new ServiceBadRequestException('test');

          //   // if (invoice.payment_intent) {
          //   //   const paymentIntent = await stripe.paymentIntents.retrieve(
          //   //     typeof invoice.payment_intent === 'string'
          //   //       ? invoice.payment_intent
          //   //       : invoice.payment_intent.id
          //   //   );
          //   //   clientSecret = paymentIntent.client_secret;
          //   // }

          //   clientSecret = '';
          //   // subscription.latest_invoice.payment_intent.client_secret;

          //   console.log({
          //     subscriptionId: subscription.id,
          //     subscriptionAmount,
          //     invoice,
          //     clientSecret,
          //   });
          // }

          // create a checkout
          const checkout = await tx.checkout.create({
            data: {
              public_id: generator.publicId(),
              status: CheckoutStatus.PENDING,
              total: amount,
              user_id: user.id,
              creator_id: creator.id,
              stripe_payment_intent_id: stripePaymentIntentId,
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

          if (stripePaymentIntentId) {
            await this.stripeService.stripe.paymentIntents.update(
              stripePaymentIntentId,
              { metadata },
            );
          }

          return { checkout, clientSecret };
        },
      );

      console.log(JSON.stringify({ checkout, clientSecret }, null, 2));

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
            total: true,
            currency: true,
          },
        });
        // create a sponsorship
        const sponsorship = await tx.sponsorship.create({
          data: {
            public_id: generator.publicId(),
            type: SponsorshipType.ONE_TIME_PAYMENT,
            amount: checkout.total,
            currency: checkout.currency,
            user: {
              connect: { id: userId },
            },
            creator: {
              connect: { id: creatorId },
            },
          },
        });

        console.log({ sponsorship });
      });
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

      console.log({ response });

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
      const { id } = query;

      const currency = CurrencyCode.USD;
      const interval = 'month';

      this.logger.log(`update sponsorship tier ${id}`);

      if (!id) throw new ServiceNotFoundException('sponsorship tier not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get the sponsorship tier
      const sponsorshipTier = await this.prisma.sponsorshipTier
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

      // get a user stripe account id
      const user = await this.prisma.user.findFirstOrThrow({
        where: { id: userId },
        select: {
          id: true,
          stripe_account_id: true,
          is_stripe_account_connected: true,
        },
      });
      const { description, isAvailable, price = 0 } = payload;

      const stripeAccountId = user.stripe_account_id;
      let stripeProductId = sponsorshipTier.stripe_product_id;
      let stripePriceId = sponsorshipTier.stripe_price_month_id;

      if (!stripeAccountId)
        throw new ServiceForbiddenException(
          'your stripe account is not verified yet',
        );

      // create a stripe product if not attached yet
      if (!stripeProductId) {
        this.logger.log(`stripe product is not found, creating [..]`);

        // retrieve a stripe account
        const stripeAccount = await this.stripeService.stripe.accounts
          .retrieve(stripeAccountId)
          .catch(() => {
            throw new ServiceForbiddenException(
              'your stripe account is not verified yet',
            );
          });

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
          ? sponsorshipTier.price !== price
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
          where: { id: sponsorshipTier.id },
          data: {
            stripe_price_month_id: stripePriceId,
          },
        });
      }

      // update the sponsorship tier
      await this.prisma.sponsorshipTier.update({
        where: { id: sponsorshipTier.id },
        data: {
          price: price ? decimalToInteger(price) : undefined,
          description,
          is_available: isAvailable,
          stripe_product_id: stripeProductId,
          stripe_price_month_id: stripePriceId,
        },
      });

      this.logger.log(`sponsorship tier ${sponsorshipTier.id} updated`);
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

  async getCreatorSponsorships({
    session,
  }: ISessionQuery): Promise<ISponsorshipGetAllResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

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
          currency: true,
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
          ({ public_id: id, amount, currency, user, type, created_at }) => ({
            id,
            type: type as SponsorshipType,
            amount: integerToDecimal(amount),
            currency,
            user: {
              username: user.username,
              name: user.profile.name,
              picture: user.profile.picture,
            },
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

  @OnEvent(EVENTS.SPONSORSHIP.CHECKOUT_COMPLETE)
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
