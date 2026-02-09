import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IPayoutBalanceGetResponse,
  IPayoutCreatePayload,
  IPayoutCreateResponse,
  IPayoutGetResponse,
  IPayoutMethodCreatePayload,
  IPayoutMethodCreateResponse,
  IPayoutMethodGetResponse,
  IPayoutMethodPlatformLinkGetResponse,
  IStripePlatformAccountLinkGeneratePayload,
  IStripePlatformAccountLinkGenerateResponse,
  PayoutMethodPlatform,
  PayoutStatus,
  StripePlayformAccountLinkMode,
  UserRole,
} from '@repo/types';

import { decimalToInteger, integerToDecimal } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { matchRoles } from '@/lib/utils';

import { CURRENCIES } from '@/common/constants';
import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import {
  IQueryWithSession,
  ISessionQuery,
  ISessionQueryWithPayload,
} from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { StripeService } from '@/modules/stripe';

@Injectable()
export class PayoutService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async getPayoutMethods({
    session,
  }: IQueryWithSession): Promise<IPayoutMethodGetResponse> {
    try {
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      const where = {
        deleted_at: null,
        explorer_id: userId,
      } as Prisma.PayoutMethodWhereInput;

      const take = 20;

      // get payout methods
      const payoutMethod = await this.prisma.payoutMethod.findFirst({
        where,
        select: {
          public_id: true,
          platform: true,
          stripe_account_id: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      const results = payoutMethod ? 1 : 0;

      // get stripe account
      const stripeAccount = payoutMethod?.stripe_account_id
        ? await this.stripeService.accounts.retrieve(
            payoutMethod.stripe_account_id,
          )
        : null;

      const businessType = stripeAccount?.business_type;
      const email =
        businessType === 'individual'
          ? stripeAccount?.individual?.email
          : stripeAccount?.email;
      const phoneNumber =
        businessType === 'individual'
          ? stripeAccount?.individual?.phone
          : stripeAccount?.company?.phone;
      const country = stripeAccount?.country;
      const currency = stripeAccount?.default_currency;
      const businessName = stripeAccount?.business_profile?.name;
      // Account is verified only if it can accept charges and make payouts
      const isVerified =
        stripeAccount?.charges_enabled === true &&
        stripeAccount?.payouts_enabled === true &&
        (stripeAccount?.requirements?.currently_due?.length || 0) === 0;

      // get automatic payout settings
      const stripeInterval =
        stripeAccount?.settings?.payouts?.schedule?.interval;
      const validInterval = ['manual', 'daily', 'weekly', 'monthly'].includes(
        stripeInterval,
      )
        ? (stripeInterval as 'manual' | 'daily' | 'weekly' | 'monthly')
        : ('manual' as const);

      const automaticPayouts = stripeAccount?.settings?.payouts
        ? {
            enabled: validInterval !== 'manual',
            schedule: {
              interval: validInterval,
              delayDays: stripeAccount.settings.payouts.schedule?.delay_days,
            },
          }
        : { enabled: false, schedule: { interval: 'manual' as const } };

      const response: IPayoutMethodGetResponse = {
        results,
        data: payoutMethod
          ? [payoutMethod].map(({ public_id, platform }) => ({
              id: public_id,
              businessName,
              businessType,
              email,
              phoneNumber,
              platform,
              isVerified,
              // Note: stripeAccountId intentionally omitted for security
              currency,
              country,
              automaticPayouts,
            }))
          : [],
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async generateStripePlatformAccountLink({
    payload,
    session,
  }: ISessionQueryWithPayload<
    {},
    IStripePlatformAccountLinkGeneratePayload
  >): Promise<IStripePlatformAccountLinkGenerateResponse> {
    try {
      // const { publicId, mode } = query;
      const { userId } = session;
      const { payoutMethodId, backUrl } = payload;

      const mode = StripePlayformAccountLinkMode.ONBOARDING;

      // check access
      const access = !!payoutMethodId && !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get a payout method
      const payoutMethod = await this.prisma.payoutMethod
        .findFirstOrThrow({
          where: {
            public_id: payoutMethodId,
            explorer_id: userId,
          },
          select: {
            id: true,
            platform: true,
            stripe_account_id: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('payout method not found');
        });

      // get the payout method platform url
      let url = '';

      if (payoutMethod.stripe_account_id) {
        let stripeMode: 'account_onboarding' | 'account_update';

        switch (mode) {
          case StripePlayformAccountLinkMode.ONBOARDING:
            stripeMode = 'account_onboarding';
            break;
          // case StripePlayformAccountLinkMode.UPDATE:
          //   stripeMode = 'account_update';
          //   break;
        }

        // get a stripe platform account link
        url = await this.stripeService.accountLinks
          .create({
            account: payoutMethod.stripe_account_id,
            return_url: backUrl,
            refresh_url: backUrl,
            type: stripeMode,
          })
          .then(({ url }) => url);
      } else {
        throw new ServiceNotFoundException('payout method not found');
      }

      const response = {
        url,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createPayoutMethod({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    IPayoutMethodCreatePayload
  >): Promise<IPayoutMethodCreateResponse> {
    try {
      const { userId } = session;
      const { country } = payload;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // check if the user already has a payout method
      const payoutMethod = await this.prisma.payoutMethod.findFirst({
        where: { explorer_id: userId },
        select: {
          id: true,
          public_id: true,
          stripe_account_id: true,
        },
      });

      if (payoutMethod) {
        throw new ServiceBadRequestException(
          'user already has a payout method',
        );
      } else {
        // create a stripe account with idempotency
        const stripeAccount = await this.stripeService
          .createAccount({ country, userId })
          .catch(() => {
            throw new ServiceForbiddenException('payout method not created');
          });

        // create a payout method
        const payoutMethod = await this.prisma.payoutMethod.create({
          data: {
            public_id: generator.publicId(),
            is_verified: false,
            platform: PayoutMethodPlatform.STRIPE,
            stripe_account_id: stripeAccount.accountId,
            explorer_id: userId,
          },
          select: {
            public_id: true,
          },
        });

        const response: IPayoutMethodCreateResponse = {
          payoutMethodId: payoutMethod.public_id,
        };

        return response;
      }
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getBalance({
    session,
  }: ISessionQuery): Promise<IPayoutBalanceGetResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // get a payout method
      const payoutMethod = await this.prisma.payoutMethod.findFirst({
        where: {
          explorer_id: userId,
          deleted_at: null,
        },
        select: {
          id: true,
          stripe_account_id: true,
        },
      });

      // Return zero balance if no payout method is set up
      if (!payoutMethod || !payoutMethod.stripe_account_id) {
        return {
          available: { amount: 0, currency: 'USD', symbol: '$' },
          pending: { amount: 0, currency: 'USD', symbol: '$' },
        };
      }

      // get a stripe available balance
      const stripeBalance = await this.stripeService.balance.retrieve({
        stripeAccount: payoutMethod.stripe_account_id,
      });

      const currencyCode =
        stripeBalance.available[0]?.currency ||
        stripeBalance.pending[0]?.currency ||
        'usd';
      const currency = CURRENCIES[currencyCode] || { code: 'USD', symbol: '$' };

      const response: IPayoutBalanceGetResponse = {
        available: {
          amount: integerToDecimal(stripeBalance.available[0]?.amount || 0),
          currency: currency.code,
          symbol: currency.symbol,
        },
        pending: {
          amount: integerToDecimal(stripeBalance.pending[0]?.amount || 0),
          currency: currency.code,
          symbol: currency.symbol,
        },
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getPayouts({ session }: ISessionQuery): Promise<IPayoutGetResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      const access =
        !!userId && matchRoles(userRole, [UserRole.CREATOR, UserRole.ADMIN]);
      if (!access) throw new ServiceForbiddenException();

      const where = {
        explorer_id: userId,
        deleted_at: null,
      } as Prisma.PayoutWhereInput;

      // get payouts
      const results = await this.prisma.payout.count({ where });
      const data = await this.prisma.payout.findMany({
        where,
        select: {
          public_id: true,
          status: true,
          amount: true,
          currency: true,
          created_at: true,
          arrival_date: true,
        },
      });

      const response: IPayoutGetResponse = {
        results,
        data: data.map(
          ({
            public_id: id,
            amount,
            created_at: createdAt,
            currency,
            status,
            arrival_date,
          }) => ({
            id,
            amount: integerToDecimal(amount),
            status,
            currency: {
              code: currency,
              symbol: CURRENCIES[currency].symbol,
            },
            created: createdAt,
            arrival: arrival_date,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createPayout({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    IPayoutCreatePayload
  >): Promise<IPayoutCreateResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.CREATOR]);
      if (!access) throw new ServiceForbiddenException();

      // get a user
      const user = await this.prisma.explorer.findFirstOrThrow({
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      });

      // check a payout method
      const payoutMethod = await this.prisma.payoutMethod
        .findFirstOrThrow({
          where: {
            explorer_id: userId,
            is_verified: true,
            stripe_account_id: { not: null },
            deleted_at: null,
          },
          select: {
            id: true,
            stripe_account_id: true,
            currency: true,
          },
          take: 1,
        })
        .catch(() => {
          throw new ServiceBadRequestException('payout method not available');
        });

      // Verify account is still capable of payouts (fresh check with Stripe)
      const stripeAccount = await this.stripeService.accounts.retrieve(
        payoutMethod.stripe_account_id,
      );

      if (!stripeAccount.payouts_enabled) {
        // Update local status if stale
        await this.prisma.payoutMethod.update({
          where: { id: payoutMethod.id },
          data: { is_verified: false },
        });
        throw new ServiceBadRequestException(
          'Account is not enabled for payouts. Please complete verification in Stripe.',
        );
      }

      const { amount } = payload;
      const { currency } = payoutMethod;
      const requestedAmountInCents = decimalToInteger(amount);

      // get available balance
      const stripeBalance = await this.stripeService.balance.retrieve({
        stripeAccount: payoutMethod.stripe_account_id,
      });
      const availableBalance = stripeBalance.available[0]?.amount || 0;

      // Validate balance is sufficient
      if (availableBalance <= 0) {
        throw new ServiceBadRequestException(
          'payout not available, insufficient funds',
        );
      }

      // Validate requested amount doesn't exceed available balance
      if (requestedAmountInCents > availableBalance) {
        const availableFormatted = integerToDecimal(availableBalance);
        throw new ServiceBadRequestException(
          `payout amount exceeds available balance. Maximum available: ${availableFormatted}`,
        );
      }

      // Validate minimum payout amount (Stripe minimum is typically $1)
      const minimumPayoutAmount = 100; // $1.00 in cents
      if (requestedAmountInCents < minimumPayoutAmount) {
        throw new ServiceBadRequestException(
          'payout amount must be at least $1.00',
        );
      }

      // request a payout on stripe with idempotency key
      const payoutPublicId = generator.publicId();
      const idempotencyKey = `payout_${userId}_${payoutPublicId}`;
      const stripePayout = await this.stripeService.payouts.create(
        {
          amount: decimalToInteger(amount),
          currency,
        },
        {
          stripeAccount: payoutMethod.stripe_account_id,
          idempotencyKey,
        },
      );

      // create a payout with PENDING status (webhook updates to COMPLETED when Stripe confirms)
      const payout = await this.prisma.payout.create({
        data: {
          public_id: payoutPublicId,
          status: PayoutStatus.PENDING,
          amount: stripePayout.amount,
          currency: stripePayout.currency,
          stripe_payout_id: stripePayout.id,
          payout_method: {
            connect: { id: payoutMethod.id },
          },
          explorer: {
            connect: { id: user.id },
          },
          arrival_date: new Date(stripePayout.arrival_date * 1000),
        },
        select: {
          public_id: true,
        },
      });

      const response: IPayoutCreateResponse = {
        payoutId: payout.public_id,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
