import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';
import { StripeModule } from '@/modules/stripe';

import { PaymentMethodController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [ConfigModule, PrismaModule, StripeModule],
  controllers: [PaymentMethodController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
