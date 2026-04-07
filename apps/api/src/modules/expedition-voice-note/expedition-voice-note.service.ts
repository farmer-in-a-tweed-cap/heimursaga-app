import { Injectable } from '@nestjs/common';
import { ExplorerRole } from '@repo/types';
import { ONE_TIME_TIER_SLOTS } from '@repo/types/sponsorship-tiers';

import { integerToDecimal } from '@/lib/formatter';

import {
  ServiceBadRequestException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

export interface IVoiceNoteDetail {
  id: string;
  audioUrl: string;
  durationSeconds: number;
  caption?: string;
  createdAt: string;
  author: {
    username: string;
    name?: string;
    picture?: string;
  };
}

export interface IVoiceNotesResponse {
  voiceNotes: IVoiceNoteDetail[];
  dailyLimit: { used: number; max: number };
}

@Injectable()
export class ExpeditionVoiceNoteService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  /**
   * List voice notes for an expedition.
   * Author/admin: always see all.
   * Others: must have Tier 3 access — either an active monthly subscription
   * or cumulative one-time donations reaching the Tier 3 threshold for this expedition.
   */
  async getVoiceNotes({
    session,
    query,
  }: ISessionQuery<{ expeditionId: string }>): Promise<IVoiceNotesResponse> {
    try {
      const { expeditionId } = query;
      const { explorerId, explorerRole } = session || {};

      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: {
          id: true,
          public_id: true,
          author_id: true,
          status: true,
          visibility: true,
        },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      const isOwner = explorerId === expedition.author_id;
      const isAdmin = explorerRole === ExplorerRole.ADMIN;

      // Check tier 3 access for non-owner/non-admin
      // Grants access to: Tier 3 monthly subscribers OR cumulative Tier 3 one-time donors for this expedition
      if (!isOwner && !isAdmin) {
        if (!explorerId) {
          throw new ServiceForbiddenException(
            JSON.stringify({ requiresTier: 3 }),
          );
        }

        // Check for active Tier 3 monthly subscription
        const hasTier3Monthly = await this.prisma.sponsorship.findFirst({
          where: {
            sponsor_id: explorerId,
            sponsored_explorer_id: expedition.author_id,
            type: 'subscription',
            status: { in: ['active', 'ACTIVE'] },
            tier: { priority: 3 },
          },
        });

        if (!hasTier3Monthly) {
          // Check cumulative one-time donations for this expedition
          const oneTimeDonations = await this.prisma.sponsorship.findMany({
            where: {
              sponsor_id: explorerId,
              expedition_public_id: expedition.public_id,
              type: 'one_time_payment',
              status: { in: ['active', 'ACTIVE', 'confirmed'] },
            },
            select: { amount: true },
          });

          const cumulativeDollars = oneTimeDonations.reduce(
            (sum, s) => sum + integerToDecimal(s.amount),
            0,
          );

          const tier3Threshold = ONE_TIME_TIER_SLOTS[2].minPrice; // $75
          if (cumulativeDollars < tier3Threshold) {
            throw new ServiceForbiddenException(
              JSON.stringify({ requiresTier: 3 }),
            );
          }
        }
      }

      const voiceNotes = await this.prisma.expeditionVoiceNote.findMany({
        where: { expedition_id: expedition.id },
        select: {
          public_id: true,
          audio_url: true,
          duration_seconds: true,
          caption: true,
          created_at: true,
          author: {
            select: {
              username: true,
              profile: { select: { name: true, picture: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      // Daily limit for owner
      let dailyUsed = 0;
      if (isOwner) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dailyUsed = await this.prisma.expeditionVoiceNote.count({
          where: {
            expedition_id: expedition.id,
            author_id: explorerId,
            created_at: { gte: today },
          },
        });
      }

      return {
        voiceNotes: voiceNotes.map((vn) => ({
          id: vn.public_id,
          audioUrl: vn.audio_url,
          durationSeconds: vn.duration_seconds,
          caption: vn.caption || undefined,
          createdAt: vn.created_at.toISOString(),
          author: {
            username: vn.author.username,
            name: vn.author.profile?.name || undefined,
            picture: vn.author.profile?.picture || undefined,
          },
        })),
        dailyLimit: { used: dailyUsed, max: 1 },
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Create a voice note (expedition author only, 1 per expedition per day)
   */
  async createVoiceNote({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { expeditionId: string },
    { audioUrl: string; durationSeconds: number; caption?: string }
  >): Promise<{ voiceNoteId: string }> {
    try {
      const { expeditionId } = query;
      const { explorerId } = session;
      const { audioUrl, durationSeconds, caption } = payload;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true, author_id: true, status: true, visibility: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      if (explorerId !== expedition.author_id) {
        throw new ServiceForbiddenException(
          'only the expedition owner can create voice notes',
        );
      }

      if (expedition.status === 'cancelled') {
        throw new ServiceForbiddenException(
          'cannot create voice notes for a cancelled expedition',
        );
      }

      // Validate duration (max 60 seconds)
      if (durationSeconds < 1 || durationSeconds > 60) {
        throw new ServiceBadRequestException(
          'voice note must be between 1 and 60 seconds',
        );
      }

      // Rate limit: 1 voice note per expedition per day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await this.prisma.expeditionVoiceNote.count({
        where: {
          author_id: explorerId,
          expedition_id: expedition.id,
          created_at: { gte: today },
        },
      });

      if (todayCount >= 1) {
        throw new ServiceForbiddenException(
          'daily voice note limit reached (1 per expedition per day)',
        );
      }

      const voiceNote = await this.prisma.expeditionVoiceNote.create({
        data: {
          expedition_id: expedition.id,
          author_id: explorerId,
          audio_url: audioUrl,
          duration_seconds: durationSeconds,
          caption: caption || null,
        },
        select: { public_id: true },
      });

      return { voiceNoteId: voiceNote.public_id };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Delete a voice note (expedition author only)
   */
  async deleteVoiceNote({
    session,
    query,
  }: ISessionQuery<{
    expeditionId: string;
    noteId: string;
  }>): Promise<void> {
    try {
      const { expeditionId, noteId } = query;
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: expeditionId, deleted_at: null },
        select: { id: true, author_id: true },
      });

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      if (explorerId !== expedition.author_id) {
        throw new ServiceForbiddenException(
          'only the expedition owner can delete voice notes',
        );
      }

      const voiceNote = await this.prisma.expeditionVoiceNote.findFirst({
        where: { public_id: noteId, expedition_id: expedition.id },
      });

      if (!voiceNote)
        throw new ServiceNotFoundException('voice note not found');

      await this.prisma.expeditionVoiceNote.delete({
        where: { id: voiceNote.id },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
