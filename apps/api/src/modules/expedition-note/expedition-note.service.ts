import { Injectable } from '@nestjs/common';

import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

export interface IExpeditionNoteDetail {
  id: number;
  text: string;
  timestamp: string;
  expeditionStatus: 'PLANNING' | 'ACTIVE' | 'COMPLETE';
  replies: {
    id: number;
    noteId: number;
    authorId: string;
    authorName: string;
    authorPicture?: string;
    isExplorer: boolean;
    text: string;
    timestamp: string;
  }[];
}

export interface IExpeditionNotesResponse {
  notes: IExpeditionNoteDetail[];
  dailyLimit: {
    used: number;
    max: number;
  };
}

@Injectable()
export class ExpeditionNoteService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all notes for an expedition
   * Only accessible by the expedition owner or sponsors
   */
  async getNotes({
    session,
    query,
  }: ISessionQuery<{
    expeditionId: string;
  }>): Promise<IExpeditionNotesResponse> {
    try {
      const { expeditionId } = query;
      const { explorerId } = session;

      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');

      // Get the expedition
      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: {
          id: true,
          author_id: true,
          status: true,
        },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      // Check access - must be owner or sponsor
      const isOwner = explorerId === expedition.author_id;
      let isSponsor = false;

      if (explorerId && !isOwner) {
        // Check if user is sponsoring the expedition owner
        const sponsorship = await this.prisma.sponsorship.findFirst({
          where: {
            sponsor_id: explorerId,
            sponsored_explorer_id: expedition.author_id,
            status: 'active',
          },
        });
        isSponsor = !!sponsorship;
      }

      if (!isOwner && !isSponsor) {
        throw new ServiceForbiddenException('access denied');
      }

      // Get notes with replies
      const notes = await this.prisma.expeditionNote.findMany({
        where: {
          expedition_id: expedition.id,
          deleted_at: null,
        },
        select: {
          id: true,
          text: true,
          created_at: true,
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  name: true,
                  picture: true,
                },
              },
            },
          },
          replies: {
            where: { deleted_at: null },
            select: {
              id: true,
              text: true,
              created_at: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      name: true,
                      picture: true,
                    },
                  },
                },
              },
            },
            orderBy: { created_at: 'asc' },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // Map expedition status
      const expeditionStatus = this.mapStatus(expedition.status);

      // Calculate daily limit for owner - DISABLED FOR TESTING
      const dailyUsed = 0;
      const dailyMax = 999; // Unlimited for testing (normally 1)

      return {
        notes: notes.map((note) => ({
          id: note.id,
          text: note.text,
          timestamp: note.created_at?.toISOString() || new Date().toISOString(),
          expeditionStatus,
          replies: note.replies.map((reply) => ({
            id: reply.id,
            noteId: note.id,
            authorId: reply.author.username,
            authorName: reply.author.profile?.name || reply.author.username,
            authorPicture: getStaticMediaUrl(reply.author.profile?.picture),
            isExplorer: reply.author.id === expedition.author_id,
            text: reply.text,
            timestamp:
              reply.created_at?.toISOString() || new Date().toISOString(),
          })),
        })),
        dailyLimit: {
          used: dailyUsed,
          max: dailyMax,
        },
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Create a new note (owner only, 1 per day limit)
   */
  async createNote({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { expeditionId: string },
    { text: string }
  >): Promise<{ noteId: number }> {
    try {
      const { expeditionId } = query;
      const { explorerId } = session;
      const { text } = payload;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');

      // Get the expedition
      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true, author_id: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      // Only owner can create notes
      if (explorerId !== expedition.author_id) {
        throw new ServiceForbiddenException(
          'only the expedition owner can create notes',
        );
      }

      // Check daily limit - DISABLED FOR TESTING
      // const today = new Date();
      // today.setHours(0, 0, 0, 0);

      // const todayNotes = await this.prisma.expeditionNote.count({
      //   where: {
      //     expedition_id: expedition.id,
      //     author_id: explorerId,
      //     created_at: { gte: today },
      //     deleted_at: null,
      //   },
      // });

      // if (todayNotes >= 1) {
      //   throw new ServiceForbiddenException('daily note limit reached');
      // }

      // Create the note
      const note = await this.prisma.expeditionNote.create({
        data: {
          expedition_id: expedition.id,
          author_id: explorerId,
          text,
        },
      });

      return { noteId: note.id };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Create a reply to a note (owner or sponsors)
   */
  async createReply({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { expeditionId: string; noteId: number },
    { text: string }
  >): Promise<{ replyId: number }> {
    try {
      const { expeditionId, noteId } = query;
      const { explorerId } = session;
      const { text } = payload;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');
      if (!noteId) throw new ServiceNotFoundException('note not found');

      // Get the expedition
      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true, author_id: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      // Check access - must be owner or sponsor
      const isOwner = explorerId === expedition.author_id;
      let isSponsor = false;

      if (!isOwner) {
        const sponsorship = await this.prisma.sponsorship.findFirst({
          where: {
            sponsor_id: explorerId,
            sponsored_explorer_id: expedition.author_id,
            status: 'active',
          },
        });
        isSponsor = !!sponsorship;
      }

      if (!isOwner && !isSponsor) {
        throw new ServiceForbiddenException('access denied');
      }

      // Get the note
      const note = await this.prisma.expeditionNote.findFirst({
        where: {
          id: noteId,
          expedition_id: expedition.id,
          deleted_at: null,
        },
      });

      if (!note) throw new ServiceNotFoundException('note not found');

      // Create the reply
      const reply = await this.prisma.expeditionNoteReply.create({
        data: {
          note_id: noteId,
          author_id: explorerId,
          text,
        },
      });

      return { replyId: reply.id };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Delete a note (owner only)
   */
  async deleteNote({
    session,
    query,
  }: ISessionQuery<{ expeditionId: string; noteId: number }>): Promise<void> {
    try {
      const { expeditionId, noteId } = query;
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      // Get the expedition
      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true, author_id: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      // Only owner can delete notes
      if (explorerId !== expedition.author_id) {
        throw new ServiceForbiddenException(
          'only the expedition owner can delete notes',
        );
      }

      // Soft delete the note
      await this.prisma.expeditionNote.update({
        where: { id: noteId },
        data: { deleted_at: new Date() },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Get note count for an expedition (public - for locked state display)
   */
  async getNoteCount({
    query,
  }: {
    query: { expeditionId: string };
  }): Promise<{ count: number }> {
    try {
      const { expeditionId } = query;

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      const count = await this.prisma.expeditionNote.count({
        where: {
          expedition_id: expedition.id,
          deleted_at: null,
        },
      });

      return { count };
    } catch (e) {
      this.logger.error(e);
      return { count: 0 };
    }
  }

  private mapStatus(status: string | null): 'PLANNING' | 'ACTIVE' | 'COMPLETE' {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'ACTIVE';
      case 'completed':
        return 'COMPLETE';
      default:
        return 'PLANNING';
    }
  }
}
