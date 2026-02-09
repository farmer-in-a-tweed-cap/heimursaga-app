import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventModule } from '@/modules/event';
import { PrismaModule } from '@/modules/prisma';
import { StripeModule } from '@/modules/stripe';

import {
  PaymentIntentController,
  PaymentMethodController,
  PlanController,
  PlansController,
} from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [ConfigModule, PrismaModule, StripeModule, EventModule],
  controllers: [
    PaymentMethodController,
    PaymentIntentController,
    PlanController,
    PlansController,
  ],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
