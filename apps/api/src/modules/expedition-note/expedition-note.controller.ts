import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { Public, Session } from '@/common/decorators';
import { ISession } from '@/common/interfaces';

import {
  ExpeditionNoteCreateDto,
  ExpeditionNoteIdParamDto,
  ExpeditionNoteParamDto,
  ExpeditionNoteReplyCreateDto,
  ExpeditionNoteReplyIdParamDto,
  ExpeditionNoteUpdateDto,
} from './expedition-note.dto';
import { ExpeditionNoteService } from './expedition-note.service';

@Controller('trips/:expedition_id/notes')
export class ExpeditionNoteController {
  constructor(private readonly expeditionNoteService: ExpeditionNoteService) {}

  /**
   * Get all notes for an expedition (requires auth - owner or sponsor)
   */
  @Get()
  async getNotes(
    @Session() session: ISession,
    @Param() params: ExpeditionNoteParamDto,
  ) {
    return this.expeditionNoteService.getNotes({
      session,
      query: { expeditionId: params.expedition_id },
    });
  }

  /**
   * Get note count (public - for locked state display)
   */
  @Public()
  @Get('count')
  async getNoteCount(@Param() params: ExpeditionNoteParamDto) {
    return this.expeditionNoteService.getNoteCount({
      query: { expeditionId: params.expedition_id },
    });
  }

  /**
   * Create a new note (owner only)
   */
  @Post()
  async createNote(
    @Session() session: ISession,
    @Param() params: ExpeditionNoteParamDto,
    @Body() body: ExpeditionNoteCreateDto,
  ) {
    return this.expeditionNoteService.createNote({
      session,
      query: { expeditionId: params.expedition_id },
      payload: body,
    });
  }

  /**
   * Create a reply to a note (owner or sponsors)
   */
  @Post(':note_id/replies')
  async createReply(
    @Session() session: ISession,
    @Param() params: ExpeditionNoteIdParamDto,
    @Body() body: ExpeditionNoteReplyCreateDto,
  ) {
    return this.expeditionNoteService.createReply({
      session,
      query: {
        expeditionId: params.expedition_id,
        noteId: params.note_id,
      },
      payload: body,
    });
  }

  /**
   * Edit a note (owner only)
   */
  @Patch(':note_id')
  async updateNote(
    @Session() session: ISession,
    @Param() params: ExpeditionNoteIdParamDto,
    @Body() body: ExpeditionNoteUpdateDto,
  ) {
    return this.expeditionNoteService.updateNote({
      session,
      query: {
        expeditionId: params.expedition_id,
        noteId: params.note_id,
      },
      payload: body,
    });
  }

  /**
   * Delete a note (owner only)
   */
  @Delete(':note_id')
  async deleteNote(
    @Session() session: ISession,
    @Param() params: ExpeditionNoteIdParamDto,
  ) {
    return this.expeditionNoteService.deleteNote({
      session,
      query: {
        expeditionId: params.expedition_id,
        noteId: params.note_id,
      },
    });
  }

  /**
   * Edit a reply (reply author only)
   */
  @Patch(':note_id/replies/:reply_id')
  async updateReply(
    @Session() session: ISession,
    @Param() params: ExpeditionNoteReplyIdParamDto,
    @Body() body: ExpeditionNoteUpdateDto,
  ) {
    return this.expeditionNoteService.updateReply({
      session,
      query: {
        expeditionId: params.expedition_id,
        noteId: params.note_id,
        replyId: params.reply_id,
      },
      payload: body,
    });
  }

  /**
   * Delete a reply (reply author or expedition owner)
   */
  @Delete(':note_id/replies/:reply_id')
  async deleteReply(
    @Session() session: ISession,
    @Param() params: ExpeditionNoteReplyIdParamDto,
  ) {
    return this.expeditionNoteService.deleteReply({
      session,
      query: {
        expeditionId: params.expedition_id,
        noteId: params.note_id,
        replyId: params.reply_id,
      },
    });
  }
}
