import { IOnSubscriptionUpgradeCompleteEvent } from '../payment';
import { Injectable, RawBodyRequest } from '@nestjs/common';
import { IStripeCreateSetupIntentResponse } from '@repo/types';
import Stripe from 'stripe';

import { sleep } from '@/lib/utils';

import { PaymentTransactionType, StripeMetadataKey } from '@/common/enums';
import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { IRequest } from '@/common/interfaces';
import { config } from '@/config';
import { EVENTS, EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { IStripeCreatePaymentIntentPayload } from './stripe.interface';

@Injectable()
export class StripeService {
  public stripe: Stripe;

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

  async webhook(request: RawBodyRequest<IRequest>) {
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

      await sleep(2000);

      // handle stripe webhook events
      switch (event.type) {
        case 'payment_intent.succeeded':
          this.onPaymentIntent(data as Stripe.PaymentIntent);
          break;
      }

      // save logs
      this.logger.log(`stripe: ${event.type}`); // \n${JSON.stringify(data, null, 2)}
    } catch (e) {
      this.logger.error(e);
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
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('stripe customer not created');
      throw exception;
    }
  }

  async createPaymentIntent(
    payload: IStripeCreatePaymentIntentPayload,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const { userId, amount } = payload;

      if (!userId) throw new ServiceForbiddenException('customer not found');

      const currency = config.stripe.default_currency;

      // get the user
      const user = await this.prisma.user.findFirst({
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

      console.log({ user });

      // get the customer
      const customer = await this.getOrCreateCustomer({
        email: user.email,
        data: {
          email: user.email,
          name: user.profile.name,
        },
      });
      if (!customer) throw new ServiceForbiddenException('customer not found');

      console.log({ customer });

      // create a payment intent with the order amount and currency
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: false },
        payment_method_types: ['card'],
        customer: customer.id,
      });

      console.log({ paymentIntent });

      return paymentIntent;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('stripe payment intent not created');
      throw exception;
    }
  }

  async createSetupIntent(): Promise<IStripeCreateSetupIntentResponse> {
    try {
      const intent = await this.stripe.setupIntents.create();

      return {
        secret: intent.client_secret,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('stripe setup intent not created');
      throw exception;
    }
  }

  async onPaymentIntent(event: Stripe.PaymentIntent) {
    try {
      const { metadata } = event;

      const transaction = metadata?.[
        StripeMetadataKey.TRANSACTION
      ] as PaymentTransactionType;

      const userId = metadata?.[StripeMetadataKey.USER_ID];
      const subscriptionPlanId =
        metadata?.[StripeMetadataKey.SUBSCRIPTION_PLAN_ID];
      const checkoutId = metadata?.[StripeMetadataKey.CHECKOUT_ID];

      switch (transaction) {
        case PaymentTransactionType.SUBSCRIPTION:
          await this.eventService.trigger<IOnSubscriptionUpgradeCompleteEvent>({
            event: EVENTS.SUBSCRIPTION.UPGRADE.COMPLETE,
            data: {
              userId: parseInt(userId),
              subscriptionPlanId: parseInt(subscriptionPlanId),
              checkoutId: parseInt(checkoutId),
            },
          });
          break;
      }
    } catch (e) {
      this.logger.error(e);
    }
  }
}
