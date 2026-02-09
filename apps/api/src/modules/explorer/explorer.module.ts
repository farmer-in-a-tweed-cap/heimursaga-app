import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventModule } from '@/modules/event';
import { ExpeditionModule } from '@/modules/expedition';
import { PrismaModule } from '@/modules/prisma';
import { SponsorModule } from '@/modules/sponsor';
import { UploadModule } from '@/modules/upload';

import {
  ExplorerController,
  SessionExplorerController,
} from './explorer.controller';
import { ExplorerService, SessionExplorerService } from './explorer.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EventModule,
    UploadModule,
    SponsorModule,
    ExpeditionModule,
  ],
  controllers: [ExplorerController, SessionExplorerController],
  providers: [ExplorerService, SessionExplorerService],
  exports: [ExplorerService, SessionExplorerService],
})
export class ExplorerModule {}
