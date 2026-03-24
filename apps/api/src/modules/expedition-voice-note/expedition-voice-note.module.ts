import { Module } from '@nestjs/common';

import { LoggerModule } from '@/modules/logger';
import { PrismaModule } from '@/modules/prisma';

import { ExpeditionVoiceNoteController } from './expedition-voice-note.controller';
import { ExpeditionVoiceNoteService } from './expedition-voice-note.service';

@Module({
  imports: [LoggerModule, PrismaModule],
  controllers: [ExpeditionVoiceNoteController],
  providers: [ExpeditionVoiceNoteService],
  exports: [ExpeditionVoiceNoteService],
})
export class ExpeditionVoiceNoteModule {}
