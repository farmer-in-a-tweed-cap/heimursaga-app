import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IPayoutBalanceGetResponse,
  IPayoutMethodCreatePayload,
  IPayoutMethodCreateResponse,
  IPayoutMethodGetAllByUsernameResponse,
  IPayoutMethodPlatformLinkGetResponse,
  PayoutMethodPlatform,
} from '@repo/types';

import { integerToDecimal } from '@/lib/formatter';
import { generator } from '@/lib/generator';

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

  async getUserPayoutMethods({
    session,
  }: IQueryWithSession): Promise<IPayoutMethodGetAllByUsernameResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where = {
        deleted_at: null,
        user_id: userId,
      } as Prisma.PayoutMethodWhereInput;

      const take = 20;

      // get payout methods
      const results = await this.prisma.payoutMethod.count({ where });
      const data = await this.prisma.payoutMethod.findMany({
        where,
        select: {
          public_id: true,
          platform: true,
          is_verified: true,
          stripe_account_id: true,
          business_type: true,
          business_name: true,
          email: true,
          phone_number: true,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      const payoutMethod = data?.[0];
      const stripeAccountId = payoutMethod?.stripe_account_id;

      let email = '';
      let phoneNumber = '';

      // retrieve a stripe account
      if (stripeAccountId) {
        const stripeAccount =
          await this.stripeService.stripe.accounts.retrieve(stripeAccountId);
        email =
          stripeAccount.business_type === 'individual'
            ? stripeAccount.individual?.email
            : stripeAccount?.email;
        phoneNumber =
          stripeAccount.business_type === 'individual'
            ? stripeAccount.individual?.phone
            : stripeAccount.company?.phone;
      }

      const response: IPayoutMethodGetAllByUsernameResponse = {
        results,
        data: payoutMethod
          ? [payoutMethod].map(
              ({
                public_id,
                stripe_account_id,
                business_name,
                business_type,
                platform,
                is_verified,
              }) => ({
                id: public_id,
                businessName: business_name,
                businessType: business_type,
                email,
                phoneNumber,
                platform,
                isVerified: is_verified,
                stripeAccountId: stripe_account_id,
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

  async getPayoutMethodPlatformLink({
    query,
    session,
  }: IQueryWithSession<{
    publicId: string;
    mode: 'account_onboarding' | 'account_update';
  }>): Promise<IPayoutMethodPlatformLinkGetResponse> {
    try {
      const { publicId, mode } = query;
      const { userId } = session;

      if (!publicId || !userId) throw new ServiceForbiddenException();

      // verify access
      const payoutMethod = await this.prisma.payoutMethod
        .findFirstOrThrow({
          where: {
            public_id: publicId,
            user_id: userId,
          },
          select: {
            id: true,
            platform: true,
            stripe_account_id: true,
          },
        })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // compose an app return link
      const appOrigin = process.env.APP_BASE_URL;
      const appRoute = 'user/settings/billing';
      const returnUrl = [appOrigin, appRoute].join('/');

      // get the payout method platform url
      let url = '';

      switch (payoutMethod.platform) {
        case PayoutMethodPlatform.STRIPE:
          if (payoutMethod.stripe_account_id) {
            // get a stripe account update link
            url = await this.stripeService.stripe.accountLinks
              .create({
                account: payoutMethod.stripe_account_id,
                return_url: returnUrl,
                refresh_url: returnUrl,
                type: mode,
              })
              .then(({ url }) => url);
          } else {
            throw new ServiceNotFoundException(
              'payout method platform link not found',
            );
          }

          break;
        default:
          throw new ServiceNotFoundException(
            'payout method platform link not found',
          );
      }

      const response = {
        url,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException(
            'payout method platform link not found',
          );
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
      const { platform, country } = payload;

      if (!userId) throw new ServiceForbiddenException();

      // @todo
      switch (platform) {
      }

      if (platform === PayoutMethodPlatform.STRIPE) {
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
              platform,
              stripe_account_id: stripeAccount.accountId,
              user_id: userId,
            },
            select: {
              public_id: true,
            },
          });

          // get a stripe onboarding url
          const stripeAccountLink = await this.stripeService
            .linkAccount({ accountId: stripeAccount.accountId })
            .catch(() => {
              throw new ServiceForbiddenException('payout method not created');
            });

          const response: IPayoutMethodCreateResponse = {
            payoutMethodId: payoutMethod.public_id,
            platform: {
              onboardingUrl: stripeAccountLink.url,
            },
          };

          return response;
        }
      } else {
        throw new ServiceBadRequestException('payout method not created');
      }
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('payout method not created');
      throw exception;
    }
  }

  async getUserPayoutBalance({
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

      const response: IPayoutBalanceGetResponse = {
        available: {
          amount: integerToDecimal(stripeBalance.available[0].amount),
          currency: stripeBalance.available[0].currency,
        },
        pending: {
          amount: integerToDecimal(stripeBalance.pending[0].amount),
          currency: stripeBalance.pending[0].currency,
        },
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
}
