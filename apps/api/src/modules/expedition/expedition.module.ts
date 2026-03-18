import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '@/modules/prisma';
import { UploadModule } from '@/modules/upload/upload.module';

import { ExpeditionCronService } from './expedition-cron.service';
import { ExpeditionController } from './expedition.controller';
import { ExpeditionService } from './expedition.service';

@Module({
  imports: [ConfigModule, PrismaModule, UploadModule],
  controllers: [ExpeditionController],
  providers: [ExpeditionService, ExpeditionCronService],
  exports: [ExpeditionService],
})
export class ExpeditionModule {}
