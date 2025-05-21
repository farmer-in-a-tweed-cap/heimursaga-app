import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';
import { StripeModule } from '@/modules/stripe';

import {
  SponsorController,
  SponsorshipController,
  SponsorshipTierController,
} from './sponsor.controller';
import { SponsorService } from './sponsor.service';

@Module({
  imports: [ConfigModule, PrismaModule, StripeModule],
  controllers: [
    SponsorController,
    SponsorshipController,
    SponsorshipTierController,
  ],
  providers: [SponsorService],
  exports: [SponsorService],
})
export class SponsorModule {}
