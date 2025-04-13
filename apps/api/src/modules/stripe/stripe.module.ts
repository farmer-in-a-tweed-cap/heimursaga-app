import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';

import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
