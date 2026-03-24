import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import {
  VoiceNoteCreateDto,
  VoiceNoteExpeditionParamDto,
  VoiceNoteIdParamDto,
} from './expedition-voice-note.dto';
import { ExpeditionVoiceNoteService } from './expedition-voice-note.service';

@Controller('trips/:expedition_id/voice-notes')
export class ExpeditionVoiceNoteController {
  constructor(private readonly voiceNoteService: ExpeditionVoiceNoteService) {}

  /**
   * List voice notes for an expedition (tier-gated)
   */
  @Get()
  async getVoiceNotes(
    @Session() session: ISession,
    @Param() params: VoiceNoteExpeditionParamDto,
  ) {
    return this.voiceNoteService.getVoiceNotes({
      session,
      query: { expeditionId: params.expedition_id },
    });
  }

  /**
   * Create a voice note (expedition author only)
   */
  @Post()
  async createVoiceNote(
    @Session() session: ISession,
    @Param() params: VoiceNoteExpeditionParamDto,
    @Body() body: VoiceNoteCreateDto,
  ) {
    return this.voiceNoteService.createVoiceNote({
      session,
      query: { expeditionId: params.expedition_id },
      payload: body,
    });
  }

  /**
   * Delete a voice note (expedition author only)
   */
  @Delete(':note_id')
  async deleteVoiceNote(
    @Session() session: ISession,
    @Param() params: VoiceNoteIdParamDto,
  ) {
    return this.voiceNoteService.deleteVoiceNote({
      session,
      query: {
        expeditionId: params.expedition_id,
        noteId: params.note_id,
      },
    });
  }
}
