import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@repo/types';

import { Public, Roles, Session } from '@/common/decorators';
import { IRequest, ISession } from '@/common/interfaces';
import { PrismaService } from '@/modules/prisma';

import {
  StripeAccountLinkDto,
} from './stripe.dto';
import { StripeService } from './stripe.service';

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Post('')
  stripeWebhook(@Req() req: RawBodyRequest<IRequest>) {
    return this.stripeService.webhook(req);
  }

  @Post('create-setup-intent')
  createStripeSetupIntent(@Session() session: ISession) {
    // Require authenticated user
    if (!session?.userId) {
      throw new ForbiddenException('Authentication required');
    }
    return this.stripeService.createSetupIntent(session.userId);
  }

  @Roles(UserRole.CREATOR)
  @Get('account')
  async getAccount(@Session() session: ISession) {
    // Look up payout method by authenticated user - no need to expose Stripe account IDs
    const payoutMethod = await this.prisma.payoutMethod.findFirst({
      where: {
        explorer_id: session.userId,
        deleted_at: null,
      },
      select: { stripe_account_id: true },
    });

    if (!payoutMethod?.stripe_account_id) {
      throw new ForbiddenException('No payout method found');
    }

    return this.stripeService.getAccount({
      accountId: payoutMethod.stripe_account_id,
    });
  }

  @Roles(UserRole.CREATOR)
  @Post('account')
  async createAccount(
    @Session() session: ISession,
    @Body() body: { country: string },
  ) {
    // Require authenticated creator
    if (!session?.userId) {
      throw new ForbiddenException('Authentication required');
    }

    return this.stripeService.createAccount({
      country: body.country || 'US',
      userId: session.userId,
    });
  }

  @Roles(UserRole.CREATOR)
  @Post('account-link')
  async linkAccount(
    @Session() session: ISession,
    @Body() body: StripeAccountLinkDto,
  ) {
    const { accountId } = body;

    // Verify user owns this account
    const payoutMethod = await this.prisma.payoutMethod.findFirst({
      where: {
        stripe_account_id: accountId,
        explorer_id: session.userId,
      },
    });

    if (!payoutMethod) {
      throw new ForbiddenException('Not authorized to link this account');
    }

    return this.stripeService.linkAccount({ accountId });
  }
}
