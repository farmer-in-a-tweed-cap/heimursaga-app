import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CheckoutMode,
  CheckoutStatus,
  ICheckoutPayload,
  ICheckoutResponse,
  IPaymentIntentCreateResponse,
  IPaymentMethodCreatePayload,
  IPaymentMethodGetAllResponse,
  IPaymentMethodGetByIdResponse,
  IPlanUpgradeCheckoutPayload,
  IPlanUpgradeCheckoutResponse,
  IPlanUpgradeCompletePayload,
  ISubscriptionPlanGetAllResponse,
  ISubscriptionPlanGetBySlugResponse,
  PlanExpiryPeriod,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';

import { CurrencyCode, CurrencySymbol } from '@/common/enums';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { IPayloadWithSession, IQueryWithSession } from '@/common/interfaces';
import { config } from '@/config';
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

  async createPaymentIntent({
    session,
  }: IPayloadWithSession<{}>): Promise<IPaymentIntentCreateResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const amount = 500;
      const currency = 'usd';

      // get the user
      const user = await this.prisma.user
        .findFirstOrThrow({
          where: { id: userId },
          select: { email: true, username: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // get the customer
      const customer = await this.stripeService.getOrCreateCustomer({
        email: user.email,
        data: {
          email: user.email,
          name: user.username,
        },
      });

      // create a payment intent
      const paymentIntent =
        await this.stripeService.stripe.paymentIntents.create({
          amount,
          currency,
          payment_method_types: ['card'],
          customer: customer.id,
        });

      console.log({ paymentIntent });

      return {
        secret: paymentIntent.client_secret,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment method not created');
      throw exception;
    }
  }

  // @todo
  async createCheckout({
    session,
    payload,
  }: IPayloadWithSession<ICheckoutPayload>): Promise<ICheckoutResponse> {
    try {
      const { userId } = session;
      const { mode, donation } = payload;

      if (!userId) throw new ServiceForbiddenException();

      let currency = 'usd';
      let amount = 0;

      const period: string = 'year';

      // get the user
      const user = await this.prisma.user
        .findFirstOrThrow({
          where: { id: userId },
          select: { email: true, username: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // define the mode
      switch (mode) {
        case CheckoutMode.UPGRADE:
          const plan = await this.prisma.plan
            .findFirstOrThrow({
              where: { slug: 'premium' },
              select: {
                stripe_price_month_id: true,
                stripe_price_year_id: true,
              },
            })
            .then(async ({ stripe_price_month_id, stripe_price_year_id }) => {
              let price: number = 0;
              let currency: string = 'usd';
              let stripePriceId: string = '';

              switch (period) {
                case 'month':
                  await this.stripeService.stripe.prices
                    .retrieve(stripe_price_month_id)
                    .then((s) => {
                      price = s.unit_amount;
                      currency = s.currency;
                      stripePriceId = s.id;
                    })
                    .catch(() => {
                      throw new ServiceBadRequestException('plan is not found');
                    });
                  break;
                case 'year':
                  await this.stripeService.stripe.prices
                    .retrieve(stripe_price_year_id)
                    .then((s) => {
                      price = s.unit_amount;
                      currency = s.currency;
                      stripePriceId = s.id;
                    })
                    .catch(() => {
                      throw new ServiceBadRequestException('plan is not found');
                    });
                  break;
                default:
                  throw new ServiceBadRequestException('plan is not found');
              }

              return {
                price,
                currency,
                stripePriceId,
              };
            })
            .catch(() => {
              throw new ServiceBadRequestException('plan is not found');
            });

          console.log({ plan });

          amount = plan.price;
          currency = plan.currency;
          break;
        case CheckoutMode.MEMBERSHIP:
          // @todo
          amount = 0;
          currency = config.premium.currency;
          break;
        case CheckoutMode.DONATION:
          // @todo
          amount = donation;
          currency = config.premium.currency;
          break;
      }

      // get the customer
      const customer = await this.stripeService.getOrCreateCustomer({
        email: user.email,
        data: {
          email: user.email,
          name: user.username,
        },
      });

      const { checkout, paymentIntent } = await this.prisma.$transaction(
        async (tx) => {
          // create a payment intent
          const paymentIntent =
            await this.stripeService.stripe.paymentIntents.create({
              amount,
              currency,
              payment_method_types: ['card'],
              customer: customer.id,
            });

          // create a checkout
          const checkout = await tx.checkout.create({
            data: {
              public_id: generator.publicId(),
              status: CheckoutStatus.PENDING,
              // stripe_payment_intent_id: paymentIntent.id,
              total: amount,
              user_id: userId,
            },
            select: { public_id: true, status: true },
          });

          return {
            checkout,
            paymentIntent,
          };
        },
      );

      console.log({ checkout, paymentIntent });

      return {
        checkoutId: checkout.public_id,
        status: checkout.status as CheckoutStatus,
        secret: paymentIntent.client_secret,
        requiresAction: false,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payment method not created');
      throw exception;
    }
  }

  async getPlans({
    session,
  }: IQueryWithSession<{}>): Promise<ISubscriptionPlanGetAllResponse> {
    try {
      const { userId } = session;

      // get plans
      const data = await this.prisma.plan.findMany({
        where: { is_available: true },
        select: {
          slug: true,
          name: true,
          is_available: true,
          stripe_product_id: true,
          price_year: true,
          price_month: true,
          discount_year: true,
        },
      });

      return {
        data: data.map(
          ({ slug, name, price_year, price_month, discount_year }) => ({
            slug,
            name,
            active: false,
            priceMonthly: price_month,
            priceYearly: price_year,
            discountYearly: discount_year,
            currency: CurrencyCode.USD,
            currencySymbol: CurrencySymbol.USD,
          }),
        ),
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('plans not found');
      throw exception;
    }
  }

  async getPlanBySlug({
    query,

    session,
  }: IQueryWithSession<{
    slug: string;
  }>): Promise<ISubscriptionPlanGetBySlugResponse> {
    try {
      const { slug } = query;

      if (!slug) throw new ServiceNotFoundException('plan not found');

      // get the plan by id
      const data = await this.prisma.plan
        .findFirstOrThrow({
          where: { slug, is_available: true },
          select: {
            name: true,
            is_available: true,
            stripe_product_id: true,
            price_year: true,
            price_month: true,
            discount_year: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('plan not found');
        });

      const { name, price_year, price_month, discount_year } = data;

      return {
        slug,
        name,
        active: false,
        priceMonthly: price_month,
        priceYearly: price_year,
        discountYearly: discount_year,
        currency: CurrencyCode.USD,
        currencySymbol: CurrencySymbol.USD,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('plan not found');
      throw exception;
    }
  }

  async checkoutPlanUpgrade({
    session,
    payload,
  }: IPayloadWithSession<IPlanUpgradeCheckoutPayload>): Promise<IPlanUpgradeCheckoutResponse> {
    try {
      const { userId } = session;
      const { planId, period } = payload;

      if (!userId) throw new ServiceForbiddenException();

      let currency = 'usd';
      let amount = 0;

      // get the user
      const user = await this.prisma.user
        .findFirstOrThrow({
          where: { id: userId },
          select: { email: true, username: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // get the plan
      const plan = await this.prisma.plan
        .findFirstOrThrow({
          where: { slug: planId },
          select: {
            stripe_price_month_id: true,
            stripe_price_year_id: true,
          },
        })
        .then(async ({ stripe_price_month_id, stripe_price_year_id }) => {
          let price: number = 0;
          let currency: string = 'usd';
          let stripePriceId: string = '';

          switch (period) {
            case PlanExpiryPeriod.MONTH:
              await this.stripeService.stripe.prices
                .retrieve(stripe_price_month_id)
                .then((s) => {
                  price = s.unit_amount;
                  currency = s.currency;
                  stripePriceId = s.id;
                })
                .catch(() => {
                  throw new ServiceBadRequestException('plan is not found');
                });
              break;
            case PlanExpiryPeriod.YEAR:
              await this.stripeService.stripe.prices
                .retrieve(stripe_price_year_id)
                .then((s) => {
                  price = s.unit_amount;
                  currency = s.currency;
                  stripePriceId = s.id;
                })
                .catch(() => {
                  throw new ServiceBadRequestException('plan is not found');
                });
              break;
            default:
              throw new ServiceBadRequestException('plan is not found');
          }

          return {
            price,
            currency,
            stripePriceId,
          };
        })
        .catch(() => {
          throw new ServiceBadRequestException('plan is not found');
        });

      amount = plan.price;
      currency = plan.currency;

      console.log({ plan, amount, currency });

      // get the customer
      const customer = await this.stripeService.getOrCreateCustomer({
        email: user.email,
        data: {
          email: user.email,
          name: user.username,
        },
      });

      const { checkout, subscription } = await this.prisma.$transaction(
        async (tx) => {
          // create a subscription
          const subscription =
            await this.stripeService.stripe.subscriptions.create({
              customer: customer.id,
              items: [{ price: plan.stripePriceId }],
              payment_behavior: 'default_incomplete',
              payment_settings: {
                save_default_payment_method: 'on_subscription',
              },
              expand: ['latest_invoice.confirmation_secret'],
            });

          // create a checkout
          const checkout = await tx.checkout.create({
            data: {
              public_id: generator.publicId(),
              status: CheckoutStatus.PENDING,
              total: amount,
              user_id: userId,
            },
            select: {
              public_id: true,
              status: true,
              total: true,
              currency: true,
            },
          });

          return {
            checkout,
            subscription,
          };
        },
      );

      console.log({
        checkout,
        subscription,
        clientSecret: subscription.latest_invoice,
      });

      const subscriptionId = subscription.id;
      const clientSecret = (
        subscription.latest_invoice as {
          confirmation_secret?: { client_secret: string };
        }
      )?.confirmation_secret?.client_secret;

      return {
        planId,
        subscriptionId,
        clientSecret,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('plan is not upgraded');
      throw exception;
    }
  }

  async completePlanUpgrade({
    session,
    payload,
  }: IPayloadWithSession<IPlanUpgradeCompletePayload>): Promise<void> {
    try {
      const { userId } = session;
      const { checkoutId } = payload;

      if (!userId) throw new ServiceForbiddenException();

      // get the user
      const user = await this.prisma.user
        .findFirstOrThrow({
          where: { id: userId },
          select: { id: true, email: true, username: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // get the checkout
      const checkout = await this.prisma.checkout.findFirstOrThrow({
        where: {
          public_id: checkoutId,
          status: { in: [CheckoutStatus.PENDING] },
        },
        select: {
          id: true,
          public_id: true,
          plan_id: true,
          stripe_payment_intent_id: true,
        },
      });

      // verify if the checkout is completed
      const checkoutComplete = await this.stripeService.stripe.paymentIntents
        .retrieve(checkout.stripe_payment_intent_id)
        .then(({ status }) => status === 'succeeded')
        .catch(() => false);
      if (!checkoutComplete)
        throw new ServiceBadRequestException(
          'plan upgrade not completed, checkout not confirmed',
        );

      // get the plan
      const plan = await this.prisma.plan
        .findFirstOrThrow({
          where: { id: checkout.plan_id },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceBadRequestException(
            'plan upgrade not completed, plan not found',
          );
        });

      // complete the upgrade
      const {} = await this.prisma.$transaction(async (tx) => {
        // attach the plan to the user
        await tx.userPlan.create({
          data: {
            plan_id: plan.id,
            user_id: user.id,
          },
        });

        // complete the checkout
        await tx.checkout.update({
          where: { id: checkout.id },
          data: {
            status: CheckoutStatus.CONFIRMED,
            confirmed_at: dateformat().toDate(),
          },
        });
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('plan upgrade not completed');
      throw exception;
    }
  }
}
