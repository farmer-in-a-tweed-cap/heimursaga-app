import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';

import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService],
})
export class TripModule {}
