import { Module } from '@nestjs/common';

import { LoggerModule } from '@/modules/logger';
import { PrismaModule } from '@/modules/prisma';

import { ExpeditionNoteController } from './expedition-note.controller';
import { ExpeditionNoteService } from './expedition-note.service';

@Module({
  imports: [LoggerModule, PrismaModule],
  controllers: [ExpeditionNoteController],
  providers: [ExpeditionNoteService],
  exports: [ExpeditionNoteService],
})
export class ExpeditionNoteModule {}
