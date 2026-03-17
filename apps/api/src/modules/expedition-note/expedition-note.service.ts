import { Injectable } from '@nestjs/common';
import { UserNotificationContext } from '@repo/types';

import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { EVENTS, EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { IUserNotificationCreatePayload } from '@/modules/notification';
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
    private eventService: EventService,
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
          public_id: true,
          author_id: true,
          status: true,
          visibility: true,
          notes_access_threshold: true,
          notes_visibility: true,
        },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      // Private expeditions have notes completely disabled
      if (expedition.visibility === 'private') {
        throw new ServiceForbiddenException(
          'Notes are not available for private expeditions',
        );
      }

      // Check access - public notes are accessible to everyone,
      // sponsor-gated notes require owner or qualifying sponsor
      const isOwner = explorerId === expedition.author_id;
      const isPublicNotes =
        (expedition.notes_visibility || 'public') === 'public';
      let hasAccess = isPublicNotes;

      if (!isPublicNotes && explorerId && !isOwner) {
        const threshold = expedition.notes_access_threshold ?? 0;

        if (threshold > 0) {
          // Threshold mode: sum all sponsorships for this specific expedition
          const sponsorships = await this.prisma.sponsorship.findMany({
            where: {
              sponsor_id: explorerId,
              expedition_public_id: expedition.public_id,
              deleted_at: null,
              status: { in: ['active', 'confirmed', 'ACTIVE', 'CONFIRMED'] },
            },
            select: { amount: true },
          });
          const cumulativeAmount = sponsorships.reduce(
            (sum, s) => sum + s.amount,
            0,
          );
          hasAccess = cumulativeAmount >= threshold;
        } else {
          // No threshold: any sponsorship for this explorer grants access
          const sponsorship = await this.prisma.sponsorship.findFirst({
            where: {
              sponsor_id: explorerId,
              sponsored_explorer_id: expedition.author_id,
              status: { in: ['active', 'ACTIVE', 'confirmed', 'CONFIRMED'] },
            },
          });
          hasAccess = !!sponsorship;
        }
      }

      if (!isOwner && !hasAccess) {
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

      // Calculate daily limit for owner
      let dailyUsed = 0;
      const dailyMax = 1;

      if (isOwner) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dailyUsed = await this.prisma.expeditionNote.count({
          where: {
            expedition_id: expedition.id,
            author_id: explorerId,
            created_at: { gte: today },
            deleted_at: null,
          },
        });
      }

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
        select: { id: true, author_id: true, status: true, visibility: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      // Block note creation for private expeditions
      if (expedition.visibility === 'private') {
        throw new ServiceForbiddenException(
          'Notes are not available for private expeditions',
        );
      }

      // Block note creation for completed or cancelled expeditions
      if (
        expedition.status === 'completed' ||
        expedition.status === 'cancelled'
      ) {
        throw new ServiceForbiddenException(
          'Cannot create notes for a completed or cancelled expedition',
        );
      }

      // Only owner can create notes
      if (explorerId !== expedition.author_id) {
        throw new ServiceForbiddenException(
          'only the expedition owner can create notes',
        );
      }

      // Check daily limit (1 note per day per expedition)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayNotes = await this.prisma.expeditionNote.count({
        where: {
          expedition_id: expedition.id,
          author_id: explorerId,
          created_at: { gte: today },
          deleted_at: null,
        },
      });

      if (todayNotes >= 1) {
        throw new ServiceForbiddenException('daily note limit reached');
      }

      // Create the note
      const note = await this.prisma.expeditionNote.create({
        data: {
          expedition_id: expedition.id,
          author_id: explorerId,
          text,
        },
      });

      // Notify all active sponsors of this expedition
      const sponsorships = await this.prisma.sponsorship.findMany({
        where: {
          sponsored_explorer_id: expedition.author_id,
          deleted_at: null,
          status: { in: ['active', 'confirmed', 'ACTIVE', 'CONFIRMED'] },
        },
        select: { sponsor_id: true },
      });

      const uniqueSponsorIds = [
        ...new Set(sponsorships.map((s) => s.sponsor_id)),
      ];

      for (const sponsorId of uniqueSponsorIds) {
        this.eventService.trigger<IUserNotificationCreatePayload>({
          event: EVENTS.NOTIFICATION_CREATE,
          data: {
            context: UserNotificationContext.EXPEDITION_NOTE_CREATED,
            userId: sponsorId,
            mentionUserId: explorerId,
            expeditionPublicId: expeditionId,
            body: text,
          },
        });
      }

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
        select: {
          id: true,
          public_id: true,
          author_id: true,
          status: true,
          visibility: true,
          notes_access_threshold: true,
          notes_visibility: true,
        },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      if (expedition.status === 'cancelled') {
        throw new ServiceForbiddenException(
          'Cannot reply to notes on a cancelled expedition',
        );
      }

      // Private expeditions have notes completely disabled
      if (expedition.visibility === 'private') {
        throw new ServiceForbiddenException(
          'Notes are not available for private expeditions',
        );
      }

      // Check access - public notes allow anyone, sponsor-gated requires sponsor
      const isOwner = explorerId === expedition.author_id;
      const isPublicNotes =
        (expedition.notes_visibility || 'public') === 'public';
      let hasAccess = isPublicNotes;

      if (!isPublicNotes && !isOwner) {
        const threshold = expedition.notes_access_threshold ?? 0;

        if (threshold > 0) {
          const sponsorships = await this.prisma.sponsorship.findMany({
            where: {
              sponsor_id: explorerId,
              expedition_public_id: expedition.public_id,
              deleted_at: null,
              status: { in: ['active', 'confirmed', 'ACTIVE', 'CONFIRMED'] },
            },
            select: { amount: true },
          });
          const cumulativeAmount = sponsorships.reduce(
            (sum, s) => sum + s.amount,
            0,
          );
          hasAccess = cumulativeAmount >= threshold;
        } else {
          const sponsorship = await this.prisma.sponsorship.findFirst({
            where: {
              sponsor_id: explorerId,
              sponsored_explorer_id: expedition.author_id,
              status: { in: ['active', 'ACTIVE', 'confirmed', 'CONFIRMED'] },
            },
          });
          hasAccess = !!sponsorship;
        }
      }

      if (!isOwner && !hasAccess) {
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

      // Notify the expedition owner (skip if replier IS the owner)
      if (!isOwner) {
        this.eventService.trigger<IUserNotificationCreatePayload>({
          event: EVENTS.NOTIFICATION_CREATE,
          data: {
            context: UserNotificationContext.EXPEDITION_NOTE_REPLY,
            userId: expedition.author_id,
            mentionUserId: explorerId,
            expeditionPublicId: expeditionId,
            body: text,
          },
        });
      }

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
        select: { id: true, author_id: true, status: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      if (
        expedition.status === 'completed' ||
        expedition.status === 'cancelled'
      ) {
        throw new ServiceForbiddenException(
          'Notes cannot be modified on completed or cancelled expeditions',
        );
      }

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
   * Edit a note (owner only)
   */
  async updateNote({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { expeditionId: string; noteId: number },
    { text: string }
  >): Promise<void> {
    try {
      const { expeditionId, noteId } = query;
      const { explorerId } = session;
      const { text } = payload;

      if (!explorerId) throw new ServiceForbiddenException();

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true, author_id: true, status: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      if (
        expedition.status === 'completed' ||
        expedition.status === 'cancelled'
      ) {
        throw new ServiceForbiddenException(
          'Notes cannot be modified on completed or cancelled expeditions',
        );
      }

      if (explorerId !== expedition.author_id) {
        throw new ServiceForbiddenException(
          'only the expedition owner can edit notes',
        );
      }

      const note = await this.prisma.expeditionNote.findFirst({
        where: { id: noteId, expedition_id: expedition.id, deleted_at: null },
      });

      if (!note) throw new ServiceNotFoundException('note not found');

      await this.prisma.expeditionNote.update({
        where: { id: noteId },
        data: { text },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Edit a reply (reply author only)
   */
  async updateReply({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { expeditionId: string; noteId: number; replyId: number },
    { text: string }
  >): Promise<void> {
    try {
      const { expeditionId, noteId, replyId } = query;
      const { explorerId } = session;
      const { text } = payload;

      if (!explorerId) throw new ServiceForbiddenException();

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      const reply = await this.prisma.expeditionNoteReply.findFirst({
        where: {
          id: replyId,
          note_id: noteId,
          deleted_at: null,
          note: { expedition_id: expedition.id, deleted_at: null },
        },
      });

      if (!reply) throw new ServiceNotFoundException('reply not found');

      if (reply.author_id !== explorerId) {
        throw new ServiceForbiddenException(
          'only the reply author can edit replies',
        );
      }

      await this.prisma.expeditionNoteReply.update({
        where: { id: replyId },
        data: { text },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Delete a reply (reply author or expedition owner)
   */
  async deleteReply({
    session,
    query,
  }: ISessionQuery<{
    expeditionId: string;
    noteId: number;
    replyId: number;
  }>): Promise<void> {
    try {
      const { expeditionId, noteId, replyId } = query;
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true, author_id: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      const reply = await this.prisma.expeditionNoteReply.findFirst({
        where: {
          id: replyId,
          note_id: noteId,
          deleted_at: null,
          note: { expedition_id: expedition.id, deleted_at: null },
        },
      });

      if (!reply) throw new ServiceNotFoundException('reply not found');

      const isOwner = explorerId === expedition.author_id;
      const isReplyAuthor = reply.author_id === explorerId;

      if (!isOwner && !isReplyAuthor) {
        throw new ServiceForbiddenException(
          'only the reply author or expedition owner can delete replies',
        );
      }

      await this.prisma.expeditionNoteReply.update({
        where: { id: replyId },
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
