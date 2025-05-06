import { EVENTS } from '../event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import {
  CheckoutStatus,
  ISponsorCheckoutPayload,
  ISponsorCheckoutResponse,
  ISponsorshipGetAllResponse,
  SponsorshipType,
} from '@repo/types';

import { decimalToInteger } from '@/lib/formatter';
import { generator } from '@/lib/generator';

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

      // @todo: get a sponsorship tier

      // get a creator
      const creator = await this.prisma.user.findFirstOrThrow({
        where: { username: creatorId },
        select: { id: true, stripe_customer_id: true },
      });

      // get a creator payout method
      const payoutMethod = await this.prisma.payoutMethod.findFirstOrThrow({
        where: { user_id: creator.id },
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

      console.log({ user, currency, creator, paymentMethod, payoutMethod });

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

          // create a payment intent
          switch (sponsorshipType) {
            case SponsorshipType.ONE_TIME_PAYMENT:
              const stripePaymentIntent =
                await this.stripeService.stripe.paymentIntents.create({
                  amount: decimalToInteger(oneTimePaymentAmount),
                  currency,
                  customer: stripeCustomer.id,
                  payment_method: paymentMethod.stripe_payment_method_id,
                  transfer_data: {
                    destination: creatorStripeAccountId, // connected account id
                  },
                  payment_method_types: ['card'],
                  application_fee_amount: config.stripe.application_fee, // platform fee in cents
                  description: '****',
                });
              amount = decimalToInteger(oneTimePaymentAmount);
              stripePaymentIntentId = stripePaymentIntent.id;
              clientSecret = stripePaymentIntent.client_secret;
              break;
            case SponsorshipType.SUBSCRIPTION:
              break;
          }

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
            amount,
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
