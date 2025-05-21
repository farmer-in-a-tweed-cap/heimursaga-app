import { EVENTS } from '../event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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
  ISubscriptionPlanGetAllResponse,
  ISubscriptionPlanGetBySlugResponse,
  ISubscriptionPlanUpgradeCheckoutPayload,
  ISubscriptionPlanUpgradeCheckoutResponse,
  ISubscriptionPlanUpgradeCompletePayload,
  PlanExpiryPeriod,
  UserRole,
} from '@repo/types';
import Stripe from 'stripe';

import { dateformat } from '@/lib/date-format';
import { integerToDecimal } from '@/lib/formatter';
import { generator } from '@/lib/generator';

import {
  CurrencyCode,
  CurrencySymbol,
  PaymentTransactionType,
  StripeMetadataKey,
} from '@/common/enums';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import {
  IPayloadWithSession,
  IQueryWithSession,
  ISessionQuery,
} from '@/common/interfaces';
import { config } from '@/config';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { StripeService } from '@/modules/stripe';

import { IOnSubscriptionUpgradeCompleteEvent } from './payment.interface';

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
          users: {
            select: {
              user_id: true,
              subscription: {
                select: {
                  expiry: true,
                },
              },
            },
          },
        },
      });

      const response: ISubscriptionPlanGetAllResponse = {
        data: data.map(
          ({
            slug,
            name,
            price_year,
            price_month,
            discount_year,
            users = [],
          }) => ({
            slug,
            name,
            active:
              users.length >= 1
                ? users.some(({ user_id }) => userId === user_id)
                : false,
            expiry:
              users.length >= 1
                ? users.find(({ user_id }) => userId === user_id)?.subscription
                    ?.expiry
                : undefined,
            priceMonthly: integerToDecimal(price_month),
            priceYearly: integerToDecimal(price_year),
            discountYearly: discount_year,
            currency: CurrencyCode.USD,
            currencySymbol: CurrencySymbol.USD,
          }),
        ),
      };

      return response;
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
      const { userId } = session;

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
            users: {
              select: {
                user_id: true,
                subscription: {
                  select: {
                    expiry: true,
                  },
                },
              },
            },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('plan not found');
        });

      const { name, price_year, price_month, discount_year, users } = data;

      const response: ISubscriptionPlanGetBySlugResponse = {
        slug,
        name,
        priceMonthly: integerToDecimal(price_month),
        priceYearly: integerToDecimal(price_year),
        discountYearly: discount_year,
        currency: CurrencyCode.USD,
        currencySymbol: CurrencySymbol.USD,
        active:
          users.length >= 1
            ? users.some(({ user_id }) => userId === user_id)
            : false,
        expiry:
          users.length >= 1
            ? users.find(({ user_id }) => userId === user_id)?.subscription
                ?.expiry
            : undefined,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('plan not found');
      throw exception;
    }
  }

  async checkoutSubscriptionPlanUpgrade({
    session,
    payload,
  }: IPayloadWithSession<ISubscriptionPlanUpgradeCheckoutPayload>): Promise<ISubscriptionPlanUpgradeCheckoutResponse> {
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
          select: { email: true, username: true, id: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // get the plan
      const plan = await this.prisma.plan
        .findFirstOrThrow({
          where: { slug: planId },
          select: {
            id: true,
            stripe_price_month_id: true,
            stripe_price_year_id: true,
          },
        })
        .then(async ({ id, stripe_price_month_id, stripe_price_year_id }) => {
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
            id,
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

      // get the customer
      const customer = await this.stripeService.getOrCreateCustomer({
        email: user.email,
        data: {
          email: user.email,
          name: user.username,
        },
      });

      const { stripeSubscription } = await this.prisma.$transaction(
        async (tx) => {
          // create a subscription
          const stripeSubscription =
            await this.stripeService.stripe.subscriptions.create({
              customer: customer.id,
              items: [{ price: plan.stripePriceId }],
              payment_behavior: 'default_incomplete',
              payment_settings: {
                save_default_payment_method: 'on_subscription',
              },
              expand: [
                'latest_invoice.confirmation_secret',
                'latest_invoice.payment_intent',
              ],
            });

          const invoice = stripeSubscription.latest_invoice as {
            payment_intent: Stripe.PaymentIntent;
          };
          const paymentIntent = invoice.payment_intent;

          // create a checkout
          const checkout = await tx.checkout.create({
            data: {
              public_id: generator.publicId(),
              status: CheckoutStatus.PENDING,
              total: amount,
              user_id: userId,
              plan_id: plan.id,
              stripe_subscription_id: stripeSubscription.id,
              stripe_payment_intent_id: paymentIntent.id,
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
            [StripeMetadataKey.TRANSACTION]:
              PaymentTransactionType.SUBSCRIPTION,
            [StripeMetadataKey.USER_ID]: user.id,
            [StripeMetadataKey.SUBSCRIPTION_PLAN_ID]: plan.id,
            [StripeMetadataKey.CHECKOUT_ID]: checkout.id,
          };

          if (paymentIntent) {
            await this.stripeService.stripe.paymentIntents.update(
              paymentIntent.id,
              { metadata },
            );
          }

          return {
            checkout,
            stripeSubscription,
          };
        },
      );

      const subscriptionPlanId = plan.id;
      const subscriptionId = stripeSubscription.id;
      const clientSecret = (
        stripeSubscription.latest_invoice as {
          confirmation_secret?: { client_secret: string };
        }
      )?.confirmation_secret?.client_secret;

      return {
        subscriptionPlanId,
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

  async completeSubscriptionPlanUpgrade(
    payload: ISubscriptionPlanUpgradeCompletePayload,
  ): Promise<void> {
    try {
      const { checkoutId } = payload;

      if (!checkoutId)
        throw new ServiceBadRequestException('plan upgrade not completed');

      this.logger.log(
        `upgrade subscription plan if checkout ${checkoutId} is completed`,
      );

      // get the checkout
      const checkout = await this.prisma.checkout
        .findFirstOrThrow({
          where: {
            id: checkoutId,
            status: { in: [CheckoutStatus.PENDING] },
          },
          select: {
            id: true,
            public_id: true,
            plan_id: true,
            user_id: true,
            stripe_subscription_id: true,
            stripe_payment_intent_id: true,
          },
        })
        .catch(() => {
          throw new ServiceBadRequestException(
            'plan upgrade not completed, checkout not found',
          );
        });

      // get the user
      const user = await this.prisma.user
        .findFirstOrThrow({
          where: { id: checkout.user_id },
          select: { id: true, email: true, username: true },
        })
        .catch(() => {
          throw new ServiceBadRequestException(
            'plan upgrade not completed, user not found',
          );
        });

      // verify if the stripe payment intent is completed
      const stripePaymentIntent =
        await this.stripeService.stripe.paymentIntents.retrieve(
          checkout.stripe_payment_intent_id,
        );

      const stripePaymentIntentComplete =
        stripePaymentIntent.status === 'succeeded';

      if (!stripePaymentIntentComplete)
        throw new ServiceBadRequestException(
          'plan upgrade not completed, checkout not confirmed',
        );

      // retrieve a stripe subscription
      const stripeSubscription = await this.stripeService.stripe.subscriptions
        .retrieve(checkout.stripe_subscription_id)
        .catch(() => {
          throw new ServiceBadRequestException(
            'plan upgrade not completed, checkout not confirmed',
          );
        });

      this.logger.log(
        `stripe payment intent ${checkout.stripe_payment_intent_id} is completed`,
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

      // complete the subscription upgrade
      await this.prisma.$transaction(async (tx) => {
        // get the user plan
        const userPlan = await tx.userPlan.findFirst({
          where: { user_id: user.id, plan_id: plan.id },
        });

        // create a subscription
        const expiry = new Date(stripeSubscription.current_period_end * 1000);

        const subscription = await tx.userSubscription.create({
          data: {
            public_id: generator.publicId(),
            stripe_subscription_id: checkout.stripe_subscription_id,
            period: PlanExpiryPeriod.MONTH,
            expiry,
            user: { connect: { id: user.id } },
          },
        });

        if (userPlan) {
          // update the user plan
          await tx.userPlan.updateMany({
            where: { plan_id: plan.id, user_id: user.id },
            data: {
              plan_id: plan.id,
              user_id: user.id,
              subscription_id: subscription.id,
            },
          });
        } else {
          // create a plan and attach to the user
          await tx.userPlan.create({
            data: {
              plan_id: plan.id,
              user_id: user.id,
              subscription_id: subscription.id,
            },
          });
        }

        this.logger.log(`plan ${plan.id} attached to user ${user.id}`);

        // update the user
        await tx.user.update({
          where: { id: user.id },
          data: { role: UserRole.CREATOR },
        });

        this.logger.log(`user ${user.id} role changed to ${UserRole.CREATOR}`);

        // create a basic sponsorship tier for the user
        await tx.sponsorshipTier.create({
          data: {
            public_id: generator.publicId(),
            price: 0,
            is_available: false,
            user: {
              connect: { id: user.id },
            },
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

        this.logger.log(`checkout ${checkout.id} completed`);
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('plan upgrade not completed');
      throw exception;
    }
  }

  async downgradeSubscriptionPlan({ session }: ISessionQuery): Promise<void> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // check access
      await this.prisma.user
        .findFirstOrThrow({ where: { id: userId } })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // downgrade the subscription plan
      await this.prisma.$transaction(async (tx) => {
        // get the user plan
        const userPlan = await tx.userPlan
          .findFirstOrThrow({
            where: {
              user_id: userId,
            },
            select: {
              plan_id: true,
              subscription: {
                select: {
                  stripe_subscription_id: true,
                },
              },
            },
          })
          .catch(() => {
            throw new ServiceBadRequestException(
              'user does not have any subscription plans',
            );
          });

        // delete the subscription plan
        await tx.userPlan.deleteMany({
          where: { user_id: userId, plan_id: userPlan.plan_id },
        });
        this.logger.log(`delete user ${userId} subscription plan`);

        // update the user
        await tx.user.update({
          where: { id: userId },
          data: {
            role: UserRole.USER,
          },
        });
        this.logger.log(`update user ${userId} role to ${UserRole.USER}`);

        // cancel the stripe subscription
        const stripeSubscriptionId =
          userPlan?.subscription?.stripe_subscription_id;

        if (stripeSubscriptionId) {
          // retrieve the stripe subscription
          const stripeSubscription =
            await this.stripeService.stripe.subscriptions
              .retrieve(stripeSubscriptionId)
              .catch(() => {
                throw new ServiceBadRequestException(
                  'user does not have any active subscriptions',
                );
              });

          // cancel the stripe subscription
          await this.stripeService.stripe.subscriptions
            .cancel(stripeSubscription.id)
            .catch(() => {
              throw new ServiceBadRequestException(
                'subscription plan downgrade not completed, subscription not canceled',
              );
            });

          this.logger.log(
            `stripe subscription ${stripeSubscription.id} canceled`,
          );
        }
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException(
            'subscription plan downgrade not completed',
          );
      throw exception;
    }
  }

  @OnEvent(EVENTS.SUBSCRIPTION.UPGRADE.COMPLETE)
  async onSubscriptionUpgradeComplete(
    event: IOnSubscriptionUpgradeCompleteEvent,
  ) {
    const { checkoutId } = event;

    this.completeSubscriptionPlanUpgrade({ checkoutId });

    try {
    } catch (e) {
      this.logger.error(e);
    }
  }
}
