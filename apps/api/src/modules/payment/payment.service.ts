import { EVENTS, EventService, IEventSendEmail } from '../event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import {
  CheckoutMode,
  CheckoutStatus,
  DEFAULT_MONTHLY_TIERS,
  DEFAULT_ONE_TIME_TIERS,
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

import { EMAIL_TEMPLATES } from '@/common/email-templates';
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
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import {
  IQueryWithSession,
  ISession,
  ISessionQuery,
  ISessionQueryWithPayload,
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
    private eventService: EventService,
  ) {}

  /**
   * Create a Stripe setup intent for adding a new payment method
   */
  async createSetupIntent({
    session,
  }: {
    session: ISession;
  }): Promise<{ clientSecret: string }> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const result = await this.stripeService.createSetupIntent(userId);

      return {
        clientSecret: result.secret,
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getPaymentMethods({
    session,
  }: IQueryWithSession): Promise<IPaymentMethodGetAllResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where = {
        public_id: { not: null },
        deleted_at: null,
        explorer_id: userId,
      } as Prisma.PaymentMethodWhereInput;

      const take = 20;

      // Get the user to find their Stripe customer
      const user = await this.prisma.explorer.findFirst({
        where: { id: userId },
        select: { email: true, username: true },
      });

      // Get the default payment method from Stripe
      let defaultStripePaymentMethodId: string | null = null;
      if (user) {
        const stripeCustomer = await this.stripeService
          .getOrCreateCustomer({
            email: user.email,
            data: { email: user.email, name: user.username },
          })
          .catch(() => null);

        if (stripeCustomer?.invoice_settings?.default_payment_method) {
          const defaultPm =
            stripeCustomer.invoice_settings.default_payment_method;
          defaultStripePaymentMethodId =
            typeof defaultPm === 'string' ? defaultPm : defaultPm.id;
        }
      }

      // search payment methods
      const results = await this.prisma.paymentMethod.count({ where });
      const data = await this.prisma.paymentMethod.findMany({
        where,
        select: {
          public_id: true,
          label: true,
          last4: true,
          stripe_payment_method_id: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      return {
        results,
        data: data.map(
          ({ label, last4, public_id: id, stripe_payment_method_id }) => ({
            id,
            label,
            last4,
            isDefault:
              stripe_payment_method_id === defaultStripePaymentMethodId,
          }),
        ),
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
          explorer_id: userId,
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createPaymentMethod({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, IPaymentMethodCreatePayload>) {
    try {
      const { stripePaymentMethodId } = payload;
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const paymentMethodId = generator.publicId({ prefix: 'pm' });

      await this.prisma.$transaction(async (tx) => {
        // get the user
        const user = await tx.explorer
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
          await this.stripeService.paymentMethods.retrieve(
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

        // Save stripe customer ID to explorer if not already saved
        if (!user.stripe_customer_id) {
          await tx.explorer.update({
            where: { id: userId },
            data: { stripe_customer_id: stripeCustomer.id },
          });
        }

        // create a payment method
        const paymentMethod = await tx.paymentMethod.create({
          data: {
            public_id: paymentMethodId,
            stripe_payment_method_id: stripePaymentMethodId,
            label:
              `${stripePaymentMethod.card.brand} ${stripePaymentMethod.card.last4}`.toUpperCase(),
            last4: stripePaymentMethod.card.last4,
            explorer_id: userId,
          },
        });

        // attach the stripe payment method to the stripe customer
        await this.stripeService.paymentMethods.attach(stripePaymentMethodId, {
          customer: stripeCustomer.id,
        });

        // Check if this is the user's first payment method
        const existingPaymentMethodsCount = await tx.paymentMethod.count({
          where: {
            explorer_id: userId,
            deleted_at: null,
          },
        });

        // If this is the only payment method, set it as default
        if (existingPaymentMethodsCount === 1) {
          await this.stripeService.customers.update(stripeCustomer.id, {
            invoice_settings: {
              default_payment_method: stripePaymentMethodId,
            },
          });
          this.logger.log(
            `Auto-set first payment method ${paymentMethodId} as default for user ${userId}`,
          );
        }
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Set a payment method as the default for the user
   */
  async setDefaultPaymentMethod({
    query,
    session,
  }: IQueryWithSession<{ publicId: string }>): Promise<{ success: boolean }> {
    try {
      const { publicId } = query;
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // Get the payment method and verify ownership
      const paymentMethod = await this.prisma.paymentMethod
        .findFirstOrThrow({
          where: {
            public_id: publicId,
            explorer_id: userId,
            deleted_at: null,
          },
          select: {
            id: true,
            stripe_payment_method_id: true,
            explorer: {
              select: {
                email: true,
                username: true,
              },
            },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('payment method not found');
        });

      // Get or create the Stripe customer (same as createPaymentMethod)
      const stripeCustomer = await this.stripeService.getOrCreateCustomer({
        email: paymentMethod.explorer.email,
        data: {
          email: paymentMethod.explorer.email,
          name: paymentMethod.explorer.username,
        },
      });

      if (!stripeCustomer) {
        throw new ServiceBadRequestException('stripe customer not found');
      }

      // Save stripe customer ID to explorer if not already saved
      await this.prisma.explorer.update({
        where: { id: userId },
        data: { stripe_customer_id: stripeCustomer.id },
      });

      // Update the default payment method in Stripe
      await this.stripeService.customers.update(stripeCustomer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.stripe_payment_method_id,
        },
      });

      this.logger.log(
        `Set default payment method ${publicId} for user ${userId}`,
      );

      return { success: true };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
          where: { public_id: publicId, explorer_id: userId, deleted_at: null },
          select: { id: true, stripe_payment_method_id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('payment method not found');
        });

      // delete the payment method
      await this.prisma.paymentMethod.updateMany({
        where: { public_id: publicId, explorer_id: userId },
        data: { deleted_at: dateformat().toDate() },
      });

      // delete the stripe payment method
      await this.stripeService.paymentMethods
        .detach(paymentMethod.stripe_payment_method_id)
        .catch(() => {
          // ..
        });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createPaymentIntent({
    session,
  }: ISessionQueryWithPayload<{}>): Promise<IPaymentIntentCreateResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const amount = 500;
      const currency = 'usd';

      // get the user
      const user = await this.prisma.explorer
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
      const paymentIntent = await this.stripeService.paymentIntents.create({
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  // @todo
  async createCheckout({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    ICheckoutPayload
  >): Promise<ICheckoutResponse> {
    try {
      const { userId } = session;
      const { mode, donation } = payload;

      if (!userId) throw new ServiceForbiddenException();

      let currency = 'usd';
      let amount = 0;

      const period: string = 'year';

      // get the user
      const user = await this.prisma.explorer
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
                  await this.stripeService.prices
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
                  await this.stripeService.prices
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
          const paymentIntent = await this.stripeService.paymentIntents.create({
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
              explorer_id: userId,
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
      if (e.status) throw e;
      throw new ServiceInternalException();
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
          explorers: {
            select: {
              explorer_id: true,
              subscription: {
                select: {
                  expiry: true,
                  stripe_subscription_id: true,
                },
              },
            },
          },
        },
      });

      const planData = await Promise.all(
        data.map(
          async ({
            slug,
            name,
            price_year,
            price_month,
            discount_year,
            explorers = [],
          }) => {
            const userPlan = explorers.find(
              ({ explorer_id }) => userId === explorer_id,
            );
            const isActive = explorers.length >= 1 && userPlan !== undefined;

            let actualExpiry = userPlan?.subscription?.expiry;
            let promoInfo = null;

            // If user has active subscription, get real expiry from Stripe (includes promos)
            if (isActive && userPlan?.subscription?.stripe_subscription_id) {
              try {
                const stripeSubscription =
                  await this.stripeService.subscriptions.retrieve(
                    userPlan.subscription.stripe_subscription_id,
                    { expand: ['discount.coupon'] },
                  );

                // Use Stripe's current_period_end which includes promo extensions
                actualExpiry = new Date(
                  stripeSubscription.current_period_end * 1000,
                );

                // Check for active discount/promo
                if (
                  stripeSubscription.discount &&
                  stripeSubscription.discount.coupon
                ) {
                  const coupon = stripeSubscription.discount.coupon;
                  promoInfo = {
                    hasActivePromo: true,
                    isFreePeriod:
                      coupon.percent_off === 100 ||
                      coupon.amount_off >=
                        stripeSubscription.items.data[0].price.unit_amount,
                    percentOff: coupon.percent_off,
                    amountOff: coupon.amount_off,
                    duration: coupon.duration,
                    durationInMonths: coupon.duration_in_months,
                    promoEnd: stripeSubscription.discount.end
                      ? new Date(stripeSubscription.discount.end * 1000)
                      : null,
                  };
                }
              } catch (error) {
                // If Stripe fails, fall back to database expiry
                this.logger.warn(
                  `Failed to fetch Stripe subscription ${userPlan.subscription.stripe_subscription_id}: ${error.message}`,
                );
                actualExpiry = userPlan?.subscription?.expiry;
              }
            }

            return {
              slug,
              name,
              active: isActive,
              expiry: actualExpiry,
              priceMonthly: integerToDecimal(price_month),
              priceYearly: integerToDecimal(price_year),
              discountYearly: discount_year,
              currency: CurrencyCode.USD,
              currencySymbol: CurrencySymbol.USD,
              promo: promoInfo,
            };
          },
        ),
      );

      const response: ISubscriptionPlanGetAllResponse = {
        data: planData,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
            explorers: {
              select: {
                explorer_id: true,
                subscription: {
                  select: {
                    expiry: true,
                    stripe_subscription_id: true,
                  },
                },
              },
            },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('plan not found');
        });

      const { name, price_year, price_month, discount_year, explorers } = data;

      const userPlan = explorers.find(
        ({ explorer_id }) => userId === explorer_id,
      );
      const isActive = explorers.length >= 1 && userPlan !== undefined;

      let actualExpiry = userPlan?.subscription?.expiry;
      let promoInfo = null;

      // If user has active subscription, get real expiry from Stripe (includes promos)
      if (isActive && userPlan?.subscription?.stripe_subscription_id) {
        try {
          const stripeSubscription =
            await this.stripeService.subscriptions.retrieve(
              userPlan.subscription.stripe_subscription_id,
              { expand: ['discount.coupon'] },
            );

          // Use Stripe's current_period_end which includes promo extensions
          actualExpiry = new Date(stripeSubscription.current_period_end * 1000);

          // Check for active discount/promo
          if (
            stripeSubscription.discount &&
            stripeSubscription.discount.coupon
          ) {
            const coupon = stripeSubscription.discount.coupon;
            promoInfo = {
              hasActivePromo: true,
              isFreePeriod:
                coupon.percent_off === 100 ||
                coupon.amount_off >=
                  stripeSubscription.items.data[0].price.unit_amount,
              percentOff: coupon.percent_off,
              amountOff: coupon.amount_off,
              duration: coupon.duration,
              durationInMonths: coupon.duration_in_months,
              promoEnd: stripeSubscription.discount.end
                ? new Date(stripeSubscription.discount.end * 1000)
                : null,
            };
          }
        } catch (error) {
          // If Stripe fails, fall back to database expiry
          this.logger.warn(
            `Failed to fetch Stripe subscription ${userPlan.subscription.stripe_subscription_id}: ${error.message}`,
          );
          actualExpiry = userPlan?.subscription?.expiry;
        }
      }

      const response: ISubscriptionPlanGetBySlugResponse = {
        slug,
        name,
        priceMonthly: integerToDecimal(price_month),
        priceYearly: integerToDecimal(price_year),
        discountYearly: discount_year,
        currency: CurrencyCode.USD,
        currencySymbol: CurrencySymbol.USD,
        active: isActive,
        expiry: actualExpiry,
        promo: promoInfo,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async checkoutSubscriptionPlanUpgrade({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    ISubscriptionPlanUpgradeCheckoutPayload
  >): Promise<ISubscriptionPlanUpgradeCheckoutResponse> {
    try {
      const { userId } = session;
      const { planId, period, promoCode } = payload;

      if (!userId) throw new ServiceForbiddenException();

      let currency = 'usd';
      let amount = 0;

      // get the user
      const user = await this.prisma.explorer
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
              await this.stripeService.prices
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
              await this.stripeService.prices
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

      // validate promo code if provided
      let validatedPromotionCode: string | undefined;
      if (promoCode) {
        try {
          const promotionCodes = await this.stripeService.promotionCodes.list({
            code: promoCode,
            active: true,
            limit: 1,
          });

          if (promotionCodes.data.length > 0) {
            validatedPromotionCode = promotionCodes.data[0].id;
          }
        } catch (error) {
          // Invalid promotion code - continue without it
          this.logger.warn(`Invalid promo code attempted`);
        }
      }

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
          const subscriptionParams: any = {
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
          };

          // apply promotion code if validated
          if (validatedPromotionCode) {
            subscriptionParams.promotion_code = validatedPromotionCode;
          }

          const idempotencyKey = `sub_upgrade_${userId}_${plan.stripePriceId}`;
          const stripeSubscription =
            await this.stripeService.subscriptions.create(subscriptionParams, {
              idempotencyKey,
            });

          const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
          const paymentIntent = invoice.payment_intent;

          // Get payment intent ID - can be string or object
          const paymentIntentId =
            typeof paymentIntent === 'string'
              ? paymentIntent
              : paymentIntent?.id || null;

          // create a checkout - use original amount since promo discounts are handled by Stripe
          const checkout = await tx.checkout.create({
            data: {
              public_id: generator.publicId(),
              status: CheckoutStatus.PENDING,
              total: amount,
              explorer_id: userId,
              plan_id: plan.id,
              stripe_subscription_id: stripeSubscription.id,
              stripe_payment_intent_id: paymentIntentId,
            },
            select: {
              id: true,
              public_id: true,
              status: true,
              total: true,
              currency: true,
            },
          });

          // add metadata to the subscription (for free subscriptions) and payment intent (for paid subscriptions)
          const metadata = {
            [StripeMetadataKey.TRANSACTION]:
              PaymentTransactionType.SUBSCRIPTION,
            [StripeMetadataKey.USER_ID]: user.id,
            [StripeMetadataKey.SUBSCRIPTION_PLAN_ID]: plan.id,
            [StripeMetadataKey.CHECKOUT_ID]: checkout.id,
          };

          // Always add metadata to subscription for free subscriptions
          await this.stripeService.subscriptions.update(stripeSubscription.id, {
            metadata,
          });

          // Also add to payment intent if it exists (for paid subscriptions)
          if (paymentIntentId) {
            await this.stripeService.paymentIntents.update(paymentIntentId, {
              metadata,
            });
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
        clientSecret: clientSecret || null, // Explicitly return null for free subscriptions
        isFreeSubscription: !clientSecret, // Flag to indicate free subscription
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
            explorer_id: true,
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
      const user = await this.prisma.explorer
        .findFirstOrThrow({
          where: { id: checkout.explorer_id },
          select: { id: true, email: true, username: true },
        })
        .catch(() => {
          throw new ServiceBadRequestException(
            'plan upgrade not completed, user not found',
          );
        });

      // verify if the stripe payment intent is completed (skip for free subscriptions)
      if (checkout.stripe_payment_intent_id) {
        const stripePaymentIntent =
          await this.stripeService.paymentIntents.retrieve(
            checkout.stripe_payment_intent_id,
          );

        if (stripePaymentIntent.status !== 'succeeded')
          throw new ServiceBadRequestException(
            'plan upgrade not completed, checkout not confirmed',
          );

        this.logger.log(
          `stripe payment intent ${checkout.stripe_payment_intent_id} is completed`,
        );
      }

      // retrieve and verify the stripe subscription status
      const stripeSubscription = await this.stripeService.subscriptions
        .retrieve(checkout.stripe_subscription_id)
        .catch(() => {
          throw new ServiceBadRequestException(
            'plan upgrade not completed, checkout not confirmed',
          );
        });

      // Verify subscription is in a valid active state (covers both paid and free)
      const validStatuses = ['active', 'trialing'];
      if (!validStatuses.includes(stripeSubscription.status)) {
        throw new ServiceBadRequestException(
          `plan upgrade not completed, subscription status: ${stripeSubscription.status}`,
        );
      }

      if (!checkout.stripe_payment_intent_id) {
        this.logger.log(`free subscription completed without payment intent`);
      }

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
        const userPlan = await tx.explorerPlan.findFirst({
          where: { explorer_id: user.id, plan_id: plan.id },
        });

        // create a subscription
        const expiry = new Date(stripeSubscription.current_period_end * 1000);

        // Determine billing period from Stripe subscription interval
        const interval =
          stripeSubscription.items.data[0]?.plan?.interval || 'month';
        const period =
          interval === 'year' ? PlanExpiryPeriod.YEAR : PlanExpiryPeriod.MONTH;

        const subscription = await tx.explorerSubscription.create({
          data: {
            public_id: generator.publicId(),
            stripe_subscription_id: checkout.stripe_subscription_id,
            period,
            expiry,
            explorer: { connect: { id: user.id } },
          },
        });

        if (userPlan) {
          // update the user plan
          await tx.explorerPlan.updateMany({
            where: { plan_id: plan.id, explorer_id: user.id },
            data: {
              plan_id: plan.id,
              explorer_id: user.id,
              subscription_id: subscription.id,
            },
          });
        } else {
          // create a plan and attach to the user
          await tx.explorerPlan.create({
            data: {
              plan_id: plan.id,
              explorer_id: user.id,
              subscription_id: subscription.id,
            },
          });
        }

        this.logger.log(`plan ${plan.id} attached to user ${user.id}`);

        // update the user
        await tx.explorer.update({
          where: { id: user.id },
          data: { role: UserRole.CREATOR },
        });

        this.logger.log(`user ${user.id} role changed to ${UserRole.CREATOR}`);

        // Create default platform sponsorship tiers for the user
        // Uses pre-defined tier slots with fixed labels and price ranges

        // Create default one-time tiers (first 3 slots)
        for (const tierConfig of DEFAULT_ONE_TIME_TIERS) {
          await tx.sponsorshipTier.create({
            data: {
              public_id: generator.publicId(),
              type: 'ONE_TIME',
              price: tierConfig.defaultPrice * 100, // convert to cents
              description: tierConfig.label,
              priority: tierConfig.slot,
              is_available: true,
              explorer: {
                connect: { id: user.id },
              },
            },
          });
        }

        // Create default monthly tiers (first 2 slots)
        for (const tierConfig of DEFAULT_MONTHLY_TIERS) {
          await tx.sponsorshipTier.create({
            data: {
              public_id: generator.publicId(),
              type: 'MONTHLY',
              price: tierConfig.defaultPrice * 100, // convert to cents
              description: tierConfig.label,
              priority: tierConfig.slot,
              is_available: true,
              explorer: {
                connect: { id: user.id },
              },
            },
          });
        }

        this.logger.log(
          `created default sponsorship tiers for user ${user.id}`,
        );

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

      // Send upgrade confirmation email
      try {
        const planDetails = await this.prisma.plan.findUnique({
          where: { id: checkout.plan_id },
          select: { name: true, price_month: true, price_year: true },
        });

        // Get the subscription to determine billing period
        const stripeSubscription =
          await this.stripeService.subscriptions.retrieve(
            checkout.stripe_subscription_id,
          );

        const nextBillingDate = new Date(
          stripeSubscription.current_period_end * 1000,
        ).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Determine billing period from the subscription interval
        const interval =
          stripeSubscription.items.data[0]?.plan?.interval || 'month';
        const billingPeriod: 'monthly' | 'annual' =
          interval === 'year' ? 'annual' : 'monthly';
        const price =
          interval === 'year'
            ? (planDetails?.price_year || 0) / 100
            : (planDetails?.price_month || 0) / 100;

        this.eventService.trigger<IEventSendEmail>({
          event: EVENTS.SEND_EMAIL,
          data: {
            to: user.email,
            template: EMAIL_TEMPLATES.UPGRADE_CONFIRMATION,
            vars: {
              username: user.username,
              planName: planDetails?.name || 'EXPLORER PRO',
              price,
              currency: '$',
              billingPeriod,
              nextBillingDate,
            },
          },
        });

        this.logger.log(`Sent upgrade confirmation email to ${user.email}`);
      } catch (emailError) {
        this.logger.error(
          'Failed to send upgrade confirmation email:',
          emailError,
        );
      }
    } catch (e) {
      this.logger.error('Error completing subscription plan upgrade:', e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async downgradeSubscriptionPlan({ session }: ISessionQuery): Promise<void> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // check access
      await this.prisma.explorer
        .findFirstOrThrow({ where: { id: userId } })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // get the user plan
      const userPlan = await this.prisma.explorerPlan
        .findFirstOrThrow({
          where: {
            explorer_id: userId,
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

      // Schedule cancellation at end of billing period (user keeps access until then)
      const stripeSubscriptionId =
        userPlan?.subscription?.stripe_subscription_id;

      if (stripeSubscriptionId) {
        await this.stripeService.subscriptions
          .update(stripeSubscriptionId, {
            cancel_at_period_end: true,
          })
          .catch(() => {
            throw new ServiceBadRequestException(
              'subscription plan downgrade not completed',
            );
          });

        this.logger.log(
          `stripe subscription ${stripeSubscriptionId} scheduled for cancellation at period end`,
        );
      } else {
        // No Stripe subscription - do immediate local downgrade
        await this.prisma.$transaction(async (tx) => {
          await tx.explorerPlan.deleteMany({
            where: { explorer_id: userId, plan_id: userPlan.plan_id },
          });
          await tx.explorer.update({
            where: { id: userId },
            data: { role: UserRole.USER },
          });
        });
        this.logger.log(
          `user ${userId} immediately downgraded (no stripe subscription)`,
        );
      }
      // Note: Actual role downgrade happens via customer.subscription.deleted webhook
      // when Stripe cancels the subscription at period end
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  @OnEvent(EVENTS.SUBSCRIPTION_UPGRADE_COMPLETE)
  async onSubscriptionUpgradeComplete(
    event: IOnSubscriptionUpgradeCompleteEvent,
  ) {
    const { checkoutId } = event;

    try {
      await this.completeSubscriptionPlanUpgrade({ checkoutId });
    } catch (e) {
      this.logger.error('Failed to complete subscription upgrade:', e);
    }
  }

  async validatePromoCode({
    session,
    payload,
  }: {
    session: ISession;
    payload: { promoCode: string; planId: string; period: string };
  }) {
    try {
      const { userId } = session;
      const { promoCode, planId, period } = payload;

      if (!userId) {
        this.logger.error('No userId in session');
        throw new ServiceForbiddenException();
      }

      this.logger.log(
        `User ID: ${userId}, Plan ID: ${planId}, Period: ${period}`,
      );

      // get the plan and price
      this.logger.log('Fetching plan from database...');
      const plan = await this.prisma.plan
        .findFirstOrThrow({
          where: { slug: planId },
          select: {
            id: true,
            stripe_price_month_id: true,
            stripe_price_year_id: true,
          },
        })
        .then(async ({ stripe_price_month_id, stripe_price_year_id }) => {
          this.logger.log(
            `Plan found. Price IDs - Month: ${stripe_price_month_id}, Year: ${stripe_price_year_id}`,
          );
          const stripePriceId =
            period === 'month' ? stripe_price_month_id : stripe_price_year_id;
          this.logger.log(
            `Using price ID: ${stripePriceId} for period: ${period}`,
          );

          try {
            this.logger.log('Fetching price from Stripe...');
            const price =
              await this.stripeService.prices.retrieve(stripePriceId);
            this.logger.log(
              `Price retrieved: ${price.unit_amount} ${price.currency}`,
            );

            return {
              stripePriceId,
              unitAmount: price.unit_amount,
              currency: price.currency,
            };
          } catch (stripeError) {
            this.logger.error(
              `Failed to retrieve Stripe price ${stripePriceId}:`,
              stripeError,
            );
            throw new ServiceBadRequestException('Plan price not found');
          }
        });

      // validate the promotion code
      this.logger.log(`Validating promo code`);
      const promotionCodes = await this.stripeService.promotionCodes.list({
        code: promoCode,
        active: true,
        limit: 1,
      });

      if (promotionCodes.data.length === 0) {
        this.logger.warn(`Promotion code not found`);
        return {
          success: false,
          error: 'Invalid promo code',
        };
      }

      const promotionCode = promotionCodes.data[0];
      this.logger.log(`Promotion code retrieved successfully`);
      this.logger.log(`Promotion code ID: ${promotionCode.id}`);
      this.logger.log(`Promotion code active: ${promotionCode.active}`);

      // Get the underlying coupon
      const coupon = promotionCode.coupon;

      // calculate discount
      let discountAmount = 0;
      let finalAmount = plan.unitAmount;

      if (coupon.percent_off) {
        discountAmount = Math.round(
          (plan.unitAmount * coupon.percent_off) / 100,
        );
      } else if (coupon.amount_off) {
        discountAmount = coupon.amount_off;
      }

      finalAmount = Math.max(0, plan.unitAmount - discountAmount);

      const response = {
        success: true,
        data: {
          valid: true,
          coupon: {
            id: coupon.id,
            name: coupon.name,
            percentOff: coupon.percent_off,
            amountOff: coupon.amount_off,
            currency: coupon.currency,
            duration: coupon.duration,
            durationInMonths: coupon.duration_in_months,
          },
          pricing: {
            originalAmount: plan.unitAmount,
            discountAmount,
            finalAmount,
            currency: plan.currency,
          },
        },
      };

      this.logger.log(`Final response structure:`, {
        success: response.success,
        dataKeys: Object.keys(response.data || {}),
        couponKeys: Object.keys(response.data?.coupon || {}),
        pricingKeys: Object.keys(response.data?.pricing || {}),
      });
      return response;
    } catch (error) {
      this.logger.error(`Error validating promo code:`, {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      return {
        success: false,
        error: 'Invalid promo code',
      };
    }
  }

  /**
   * Manually complete a pending checkout (admin/dev use)
   * Verifies the user owns the checkout before completing
   */
  async manuallyCompleteCheckout({
    session,
    checkoutId,
  }: {
    session: ISession;
    checkoutId: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // Verify the checkout belongs to this user
      const checkout = await this.prisma.checkout.findFirst({
        where: {
          id: checkoutId,
          explorer_id: userId,
        },
        select: {
          id: true,
          status: true,
          explorer_id: true,
        },
      });

      if (!checkout) {
        throw new ServiceNotFoundException(
          'Checkout not found or not owned by user',
        );
      }

      if (checkout.status === 'confirmed') {
        return { success: true, message: 'Checkout already completed' };
      }

      // Complete the subscription upgrade
      await this.completeSubscriptionPlanUpgrade({ checkoutId });

      return { success: true, message: 'Checkout completed successfully' };
    } catch (e) {
      this.logger.error('Error manually completing checkout:', e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
