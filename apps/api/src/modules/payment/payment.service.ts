import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IPaymentMethodCreatePayload,
  IPaymentMethodGetAllResponse,
  IPaymentMethodGetByIdResponse,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { IPayloadWithSession, IQueryWithSession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { StripeService } from '@/modules/stripe';

@Injectable()
export class PaymentService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async getPaymentMethods({
    session,
  }: IQueryWithSession): Promise<IPaymentMethodGetAllResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where = {
        public_id: { not: null },
        deleted_at: null,
        user_id: userId,
      } as Prisma.PaymentMethodWhereInput;

      const take = 20;

      // search payment methods
      const results = await this.prisma.paymentMethod.count({ where });
      const data = await this.prisma.paymentMethod.findMany({
        where,
        select: {
          public_id: true,
          label: true,
          last4: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      return {
        results,
        data: data.map(({ label, last4, public_id: id }) => ({
          id,
          label,
          last4,
        })),
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment methods not found');
      throw exception;
    }
  }

  async getPaymentMethodById({
    query,
    session,
  }: IQueryWithSession<{
    publicId: string;
  }>): Promise<IPaymentMethodGetByIdResponse> {
    try {
      const { publicId } = query;
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();
      if (!publicId)
        throw new ServiceNotFoundException('payment method not found');

      // get the payment method
      const paymentMethod = await this.prisma.paymentMethod.findFirstOrThrow({
        where: {
          public_id: publicId,
          deleted_at: null,
          user_id: userId,
        },
        select: {
          public_id: true,
          label: true,
          last4: true,
        },
        orderBy: [{ id: 'desc' }],
      });

      const { last4, public_id: id, label } = paymentMethod;

      return {
        id,
        label,
        last4,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment method not found');
      throw exception;
    }
  }

  async createPaymentMethod({
    payload,
    session,
  }: IPayloadWithSession<IPaymentMethodCreatePayload>) {
    try {
      const { stripePaymentMethodId } = payload;
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const paymentMethodId = generator.publicId({ prefix: 'pm' });

      await this.prisma.$transaction(async (tx) => {
        // get the user
        const user = await tx.user
          .findFirstOrThrow({
            where: { id: userId },
            select: {
              id: true,
              username: true,
              email: true,
              stripe_customer_id: true,
            },
          })
          .catch(() => {
            throw new ServiceForbiddenException();
          });

        // get the stripe payment method
        const stripePaymentMethod =
          await this.stripeService.stripe.paymentMethods.retrieve(
            stripePaymentMethodId,
          );

        // get the stripe customer or create if it doesn't exist
        const stripeCustomer = await this.stripeService.getOrCreateCustomer({
          email: user.email,
          data: {
            email: user.email,
            name: user.username,
          },
        });
        if (!stripeCustomer)
          throw new ServiceBadRequestException('customer not found');

        // create a payment method
        const paymentMethod = await tx.paymentMethod.create({
          data: {
            public_id: paymentMethodId,
            stripe_payment_method_id: stripePaymentMethodId,
            label:
              `${stripePaymentMethod.card.brand} ${stripePaymentMethod.card.last4}`.toUpperCase(),
            last4: stripePaymentMethod.card.last4,
            user_id: userId,
          },
        });

        // attach the stripe payment method to the stripe customer
        await this.stripeService.stripe.paymentMethods.attach(
          stripePaymentMethodId,
          { customer: stripeCustomer.id },
        );

        console.log({ paymentMethod, stripeCustomer, stripePaymentMethod });
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment method not created');
      throw exception;
    }
  }

  async deletePaymentMethod({
    query,
    session,
  }: IQueryWithSession<{ publicId: string }>) {
    try {
      const { publicId } = query;
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // check the payment method
      const paymentMethod = await this.prisma.paymentMethod
        .findFirstOrThrow({
          where: { public_id: publicId, deleted_at: null },
          select: { id: true, stripe_payment_method_id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('payment method not found');
        });

      // delete the payment method
      await this.prisma.paymentMethod.updateMany({
        where: { public_id: publicId },
        data: { deleted_at: dateformat().toDate() },
      });

      // delete the stripe payment method
      await this.stripeService.stripe.paymentMethods
        .detach(paymentMethod.stripe_payment_method_id)
        .catch(() => {
          // ..
        });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment method not deleted');
      throw exception;
    }
  }
}
