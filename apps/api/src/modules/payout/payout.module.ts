import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';
import { StripeModule } from '@/modules/stripe';

import { BalanceController, PayoutMethodController } from './payout.controller';
import { PayoutService } from './payout.service';

@Module({
  imports: [ConfigModule, PrismaModule, StripeModule],
  controllers: [PayoutMethodController, BalanceController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
