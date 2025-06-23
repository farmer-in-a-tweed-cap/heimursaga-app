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
        user_id: userId,
      } as Prisma.PayoutMethodWhereInput;

      const take = 20;

      // get payout methods
      const results = 1;
      const payoutMethod = await this.prisma.payoutMethod.findFirstOrThrow({
        where,
        select: {
          public_id: true,
          platform: true,
          stripe_account_id: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      // get stripe account
      const stripeAccount = payoutMethod.stripe_account_id
        ? await this.stripeService.stripe.accounts.retrieve(
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
      const isVerified =
        (stripeAccount?.requirements?.pending_verification?.length || 0) <= 0 ||
        false;

      const response: IPayoutMethodGetResponse = {
        results,
        data: payoutMethod
          ? [payoutMethod].map(
              ({ public_id, stripe_account_id, platform }) => ({
                id: public_id,
                businessName,
                businessType,
                email,
                phoneNumber,
                platform,
                isVerified,
                stripeAccountId: stripe_account_id,
                currency,
                country,
              }),
            )
          : [],
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payout methods not found');
      throw exception;
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
            user_id: userId,
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
        url = await this.stripeService.stripe.accountLinks
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
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payout method not found');
      throw exception;
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
        where: { user_id: userId },
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
        // create a stripe account
        const stripeAccount = await this.stripeService
          .createAccount({ country })
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
            user_id: userId,
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
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payout method not created');
      throw exception;
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
          user_id: userId,
          deleted_at: null,
        },
        select: {
          id: true,
          stripe_account_id: true,
        },
      });

      // get a stripe available balance
      const stripeBalance = await this.stripeService.stripe.balance.retrieve({
        stripeAccount: payoutMethod.stripe_account_id,
      });

      const currencyCode =
        stripeBalance.available[0].currency ||
        stripeBalance.pending[0].currency;
      const currency = CURRENCIES[currencyCode];

      const response: IPayoutBalanceGetResponse = {
        available: {
          amount: integerToDecimal(stripeBalance.available[0].amount),
          currency: currency.code,
          symbol: currency.symbol,
        },
        pending: {
          amount: integerToDecimal(stripeBalance.pending[0].amount),
          currency: currency.code,
          symbol: currency.symbol,
        },
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('balance not available');
      throw exception;
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
        user_id: userId,
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
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('payouts not available');
      throw exception;
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
      const user = await this.prisma.user.findFirstOrThrow({
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
            user_id: userId,
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

      const { amount } = payload;
      const { currency } = payoutMethod;

      // get available balance
      const stripeBalance = await this.stripeService.stripe.balance.retrieve({
        stripeAccount: payoutMethod.stripe_account_id,
      });
      const balance = stripeBalance.available[0].amount;
      if (balance <= 0) {
        throw new ServiceBadRequestException(
          'payout not available, insufficient funds',
        );
      }

      // request a payout on stripe
      const stripePayout = await this.stripeService.stripe.payouts.create(
        {
          amount: decimalToInteger(amount),
          currency,
        },
        { stripeAccount: payoutMethod.stripe_account_id },
      );

      // create a payout
      const payout = await this.prisma.payout.create({
        data: {
          public_id: generator.publicId(),
          status: PayoutStatus.CONFIRMED,
          amount: stripePayout.amount,
          currency: stripePayout.currency,
          stripe_payout_id: stripePayout.id,
          payout_method: {
            connect: { id: payoutMethod.id },
          },
          user: {
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
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payout not created');
      throw exception;
    }
  }
}
