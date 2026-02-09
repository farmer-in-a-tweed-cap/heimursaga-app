import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';

import { ExpeditionController } from './expedition.controller';
import { ExpeditionService } from './expedition.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ExpeditionController],
  providers: [ExpeditionService],
  exports: [ExpeditionService],
})
export class ExpeditionModule {}
