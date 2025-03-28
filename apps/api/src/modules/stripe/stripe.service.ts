import { Injectable, RawBodyRequest } from '@nestjs/common';
import Stripe from 'stripe';

import {
  ServiceException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { IRequest } from '@/common/interfaces';
import { Logger } from '@/modules/logger';

@Injectable()
export class StripeService {
  public stripe: Stripe;

  constructor(private logger: Logger) {
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

      this.logger.log(
        `stripe: ${event.type}\n${JSON.stringify(data, null, 2)}`,
      );

      // @todo: handle stripe webhook events
    } catch (e) {
      this.logger.error(e);
    }
  }

  async getOrCreateCustomer(options: {
    email: string;
    data: {
      email: string;
      name: string;
    };
  }): Promise<Stripe.Customer> {
    try {
      const { email, data } = options || {};

      // check if the customer exists
      const customer = await this.stripe.customers
        .list({ email })
        .then(({ data }) => (data.length >= 1 ? data?.[0] : null))
        .catch(() => null);

      if (!customer) {
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
}
