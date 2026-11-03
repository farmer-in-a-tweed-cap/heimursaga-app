import { EVENTS, EventService, IEventSendEmail } from '../event';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import {
  CheckoutStatus,
  IPaymentMethodCreatePayload,
  IPaymentMethodGetAllResponse,
  IPaymentMethodGetByIdResponse,
  ISubscriptionPlanUpgradeCompletePayload,
  PlanExpiryPeriod,
  UserRole,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';
import { ensureDefaultSponsorshipTiers } from '@/lib/sponsorship-tiers';

import { EMAIL_TEMPLATES } from '@/common/email-templates';
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

      const result = await this.stripeService.createSetupIntent({ userId });

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
            userId,
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

      // Step 1: DB transaction — read user, create PM record, count existing
      const { user, isFirstPaymentMethod } = await this.prisma.$transaction(
        async (tx) => {
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

          // get the stripe payment method details (read-only Stripe call, safe in tx)
          const stripePaymentMethod =
            await this.stripeService.paymentMethods.retrieve(
              stripePaymentMethodId,
            );

          // create a payment method record
          await tx.paymentMethod.create({
            data: {
              public_id: paymentMethodId,
              stripe_payment_method_id: stripePaymentMethodId,
              label: stripePaymentMethod.card.brand.toUpperCase(),
              last4: stripePaymentMethod.card.last4,
              explorer_id: userId,
            },
          });

          // Count existing methods to determine if this is the first
          const existingPaymentMethodsCount = await tx.paymentMethod.count({
            where: {
              explorer_id: userId,
              deleted_at: null,
            },
          });

          return {
            user,
            isFirstPaymentMethod: existingPaymentMethodsCount === 1,
          };
        },
      );

      // Step 2: After commit — Stripe attach + set default if first PM
      // Get or create Stripe customer (cached lookup by userId, with backfill)
      const stripeCustomer = await this.stripeService.getOrCreateCustomer({
        email: user.email,
        data: {
          email: user.email,
          name: user.username,
        },
        userId,
      });
      if (!stripeCustomer)
        throw new ServiceBadRequestException('customer not found');

      try {
        // Attach the stripe payment method to the stripe customer
        await this.stripeService.paymentMethods.attach(stripePaymentMethodId, {
          customer: stripeCustomer.id,
        });

        // If this is the only payment method, set it as default
        if (isFirstPaymentMethod) {
          await this.stripeService.customers.update(stripeCustomer.id, {
            invoice_settings: {
              default_payment_method: stripePaymentMethodId,
            },
          });
          this.logger.log(
            `Auto-set first payment method ${paymentMethodId} as default for user ${userId}`,
          );
        }
      } catch (stripeError) {
        // Stripe attach failed — soft-delete the orphaned DB record
        this.logger.error(
          `Stripe attach failed for PM ${paymentMethodId}, soft-deleting DB record`,
          stripeError,
        );
        await this.prisma.paymentMethod.updateMany({
          where: { public_id: paymentMethodId },
          data: { deleted_at: new Date() },
        });
        throw stripeError;
      }

      return { id: paymentMethodId };
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

      // Get or create the Stripe customer (cached lookup with backfill)
      const stripeCustomer = await this.stripeService.getOrCreateCustomer({
        email: paymentMethod.explorer.email,
        data: {
          email: paymentMethod.explorer.email,
          name: paymentMethod.explorer.username,
        },
        userId,
      });

      if (!stripeCustomer) {
        throw new ServiceBadRequestException('stripe customer not found');
      }

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

      // Detach from Stripe first — if this fails, we don't want orphaned local records
      try {
        await this.stripeService.paymentMethods.detach(
          paymentMethod.stripe_payment_method_id,
        );
      } catch (stripeError) {
        // If already detached on Stripe, proceed with local cleanup
        if (stripeError?.code !== 'resource_missing') {
          throw stripeError;
        }
      }

      // Soft-delete locally after Stripe detach succeeds
      await this.prisma.paymentMethod.updateMany({
        where: { public_id: publicId, explorer_id: userId },
        data: { deleted_at: dateformat().toDate() },
      });
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
        const periodEnd =
          this.stripeService.getSubscriptionCurrentPeriodEnd(
            stripeSubscription,
          );
        const expiry = periodEnd
          ? new Date(periodEnd * 1000)
          : dateformat().add(1, 'month').toDate();

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
        await ensureDefaultSponsorshipTiers(tx, user.id);

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

        const periodEndForEmail =
          this.stripeService.getSubscriptionCurrentPeriodEnd(
            stripeSubscription,
          );
        const nextBillingDate = (
          periodEndForEmail ? new Date(periodEndForEmail * 1000) : new Date()
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

  async getSubscriptionStatus({ session }: ISessionQuery) {
    try {
      const { userId } = session;
      if (!userId) throw new ServiceForbiddenException();

      // Find the user's plan + linked subscription
      const userPlan = await this.prisma.explorerPlan.findFirst({
        where: { explorer_id: userId },
        select: {
          plan: { select: { slug: true } },
          subscription: {
            select: {
              id: true,
              public_id: true,
              stripe_subscription_id: true,
              period: true,
              expiry: true,
            },
          },
        },
      });

      if (!userPlan?.subscription) {
        // Check for orphaned Stripe subscription (webhook may have failed to create explorerPlan)
        const orphanedSub = await this.prisma.explorerSubscription.findFirst({
          where: {
            explorer_id: userId,
            stripe_subscription_id: { not: null },
          },
          select: {
            public_id: true,
            stripe_subscription_id: true,
            period: true,
            expiry: true,
          },
          orderBy: { created_at: 'desc' },
        });

        if (orphanedSub?.stripe_subscription_id) {
          try {
            const stripeSub = await this.stripeService.subscriptions.retrieve(
              orphanedSub.stripe_subscription_id,
            );
            if (
              stripeSub.status === 'active' ||
              stripeSub.status === 'trialing'
            ) {
              const orphanedPeriodEnd =
                this.stripeService.getSubscriptionCurrentPeriodEnd(stripeSub);
              return {
                subscription: {
                  id: orphanedSub.public_id,
                  planSlug: 'explorer-pro',
                  billingPeriod: orphanedSub.period || 'month',
                  status: stripeSub.status,
                  currentPeriodEnd: orphanedPeriodEnd
                    ? new Date(orphanedPeriodEnd * 1000).toISOString()
                    : null,
                  cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                },
              };
            }
          } catch {
            // Stripe subscription doesn't exist or is invalid
          }
        }

        return { subscription: null };
      }

      const sub = userPlan.subscription;
      let status: string = 'active';
      let currentPeriodEnd: string | null = sub.expiry?.toISOString() ?? null;
      let cancelAtPeriodEnd = false;
      // Apple in-app subscriptions are stored as `iap_<platform>_<txn>`; Apple
      // bills and cancels them, so there is nothing to fetch from Stripe.
      const source = sub.stripe_subscription_id?.startsWith('iap_')
        ? 'apple'
        : 'stripe';

      if (source === 'apple') {
        if (sub.expiry && sub.expiry < new Date()) status = 'canceled';
      } else if (sub.stripe_subscription_id) {
        // If there's a Stripe subscription, fetch live status
        try {
          const stripeSub = await this.stripeService.subscriptions.retrieve(
            sub.stripe_subscription_id,
          );
          status = stripeSub.status;
          const livePeriodEnd =
            this.stripeService.getSubscriptionCurrentPeriodEnd(stripeSub);
          currentPeriodEnd = livePeriodEnd
            ? new Date(livePeriodEnd * 1000).toISOString()
            : currentPeriodEnd;
          cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
        } catch {
          // Stripe subscription may have been deleted — fall back to local data
          this.logger.warn(
            `Could not retrieve Stripe subscription ${sub.stripe_subscription_id}`,
          );
        }
      }

      return {
        subscription: {
          id: sub.public_id,
          planSlug: userPlan.plan.slug,
          billingPeriod: sub.period || 'month',
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd,
          source,
        },
      };
    } catch (e) {
      this.logger.error(e);
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

      if (stripeSubscriptionId?.startsWith('iap_')) {
        throw new ServiceBadRequestException(
          'This subscription was bought through Apple. Cancel it from your Apple account (Settings → Apple ID → Subscriptions).',
        );
      }

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
}
