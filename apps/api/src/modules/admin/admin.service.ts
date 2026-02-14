import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  FlagStatus,
  IAdminEntryListResponse,
  IAdminExpeditionListResponse,
  IAdminExplorerListResponse,
  IAdminStats,
  UserRole,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

const MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 50;

@Injectable()
export class AdminService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  private async assertAdmin(session: ISession) {
    if (!session?.userId || session.userRole !== UserRole.ADMIN) {
      throw new ServiceForbiddenException('Admin access required');
    }
  }

  async getStats(session: ISession): Promise<IAdminStats> {
    try {
      await this.assertAdmin(session);

      const [explorers, entries, expeditions, pendingFlags, blockedExplorers] =
        await Promise.all([
          this.prisma.explorer.count(),
          this.prisma.entry.count({ where: { deleted_at: null } }),
          this.prisma.expedition.count({ where: { deleted_at: null } }),
          this.prisma.flag.count({ where: { status: FlagStatus.PENDING } }),
          this.prisma.explorer.count({ where: { blocked: true } }),
        ]);

      return {
        explorers,
        entries,
        expeditions,
        pendingFlags,
        blockedExplorers,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async getEntries(
    session: ISession,
    query: { search?: string; limit?: number; offset?: number },
  ): Promise<IAdminEntryListResponse> {
    try {
      await this.assertAdmin(session);

      const limit = Math.min(query.limit || DEFAULT_PER_PAGE, MAX_PER_PAGE);
      const offset = query.offset || 0;

      const where: Prisma.EntryWhereInput = {};
      if (query.search) {
        where.title = { contains: query.search, mode: 'insensitive' };
      }

      const [total, entries] = await Promise.all([
        this.prisma.entry.count({ where }),
        this.prisma.entry.findMany({
          where,
          select: {
            public_id: true,
            title: true,
            created_at: true,
            deleted_at: true,
            author: {
              select: {
                username: true,
                profile: { select: { picture: true } },
              },
            },
          },
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' },
        }),
      ]);

      return {
        data: entries.map((e) => ({
          id: e.public_id,
          title: e.title,
          author: {
            username: e.author.username,
            picture: e.author.profile?.picture
              ? getStaticMediaUrl(e.author.profile.picture)
              : undefined,
          },
          createdAt: e.created_at,
          deletedAt: e.deleted_at || undefined,
        })),
        total,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async deleteEntry(session: ISession, publicId: string): Promise<void> {
    try {
      await this.assertAdmin(session);

      const entry = await this.prisma.entry.findFirst({
        where: { public_id: publicId },
        select: { id: true },
      });

      if (!entry) {
        throw new ServiceNotFoundException('Entry not found');
      }

      await this.prisma.entry.update({
        where: { id: entry.id },
        data: { deleted_at: new Date() },
      });

      this.logger.log(
        `[AUDIT] Admin ${session.userId} deleted entry ${publicId}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async getExpeditions(
    session: ISession,
    query: { search?: string; limit?: number; offset?: number },
  ): Promise<IAdminExpeditionListResponse> {
    try {
      await this.assertAdmin(session);

      const limit = Math.min(query.limit || DEFAULT_PER_PAGE, MAX_PER_PAGE);
      const offset = query.offset || 0;

      const where: Prisma.ExpeditionWhereInput = {};
      if (query.search) {
        where.title = { contains: query.search, mode: 'insensitive' };
      }

      const [total, expeditions] = await Promise.all([
        this.prisma.expedition.count({ where }),
        this.prisma.expedition.findMany({
          where,
          select: {
            public_id: true,
            title: true,
            status: true,
            created_at: true,
            deleted_at: true,
            author: {
              select: {
                username: true,
                profile: { select: { picture: true } },
              },
            },
          },
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' },
        }),
      ]);

      return {
        data: expeditions.map((e) => ({
          id: e.public_id,
          title: e.title,
          status: e.status || undefined,
          author: {
            username: e.author.username,
            picture: e.author.profile?.picture
              ? getStaticMediaUrl(e.author.profile.picture)
              : undefined,
          },
          createdAt: e.created_at,
          deletedAt: e.deleted_at || undefined,
        })),
        total,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async deleteExpedition(session: ISession, publicId: string): Promise<void> {
    try {
      await this.assertAdmin(session);

      const expedition = await this.prisma.expedition.findFirst({
        where: { public_id: publicId },
        select: { id: true },
      });

      if (!expedition) {
        throw new ServiceNotFoundException('Expedition not found');
      }

      await this.prisma.expedition.update({
        where: { id: expedition.id },
        data: { deleted_at: new Date() },
      });

      this.logger.log(
        `[AUDIT] Admin ${session.userId} deleted expedition ${publicId}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async getExplorers(
    session: ISession,
    query: {
      search?: string;
      limit?: number;
      offset?: number;
      blocked?: boolean;
    },
  ): Promise<IAdminExplorerListResponse> {
    try {
      await this.assertAdmin(session);

      const limit = Math.min(query.limit || DEFAULT_PER_PAGE, MAX_PER_PAGE);
      const offset = query.offset || 0;

      const where: Prisma.ExplorerWhereInput = {};

      if (query.search) {
        where.OR = [
          { username: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      if (query.blocked !== undefined) {
        where.blocked = query.blocked;
      }

      const [total, explorers] = await Promise.all([
        this.prisma.explorer.count({ where }),
        this.prisma.explorer.findMany({
          where,
          select: {
            username: true,
            email: true,
            role: true,
            blocked: true,
            created_at: true,
            profile: { select: { picture: true } },
          },
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' },
        }),
      ]);

      return {
        data: explorers.map((e) => ({
          username: e.username,
          email: e.email,
          role: e.role,
          blocked: e.blocked,
          createdAt: e.created_at,
          picture: e.profile?.picture
            ? getStaticMediaUrl(e.profile.picture)
            : undefined,
        })),
        total,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async blockExplorer(session: ISession, username: string): Promise<void> {
    try {
      await this.assertAdmin(session);

      const explorer = await this.prisma.explorer.findFirst({
        where: { username },
        select: { id: true },
      });

      if (!explorer) {
        throw new ServiceNotFoundException('Explorer not found');
      }

      await this.prisma.explorer.update({
        where: { id: explorer.id },
        data: { blocked: true },
      });

      // Invalidate sessions
      await this.prisma.explorerSession.updateMany({
        where: { explorer_id: explorer.id },
        data: { expired: true, expires_at: dateformat().toDate() },
      });

      // Soft-delete entries
      await this.prisma.entry.updateMany({
        where: { author_id: explorer.id },
        data: { deleted_at: dateformat().toDate() },
      });

      // Soft-delete expeditions
      await this.prisma.expedition.updateMany({
        where: { author_id: explorer.id },
        data: { deleted_at: dateformat().toDate() },
      });

      this.logger.log(
        `[AUDIT] Admin ${session.userId} blocked explorer ${username}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async unblockExplorer(session: ISession, username: string): Promise<void> {
    try {
      await this.assertAdmin(session);

      const explorer = await this.prisma.explorer.findFirst({
        where: { username },
        select: { id: true },
      });

      if (!explorer) {
        throw new ServiceNotFoundException('Explorer not found');
      }

      await this.prisma.explorer.update({
        where: { id: explorer.id },
        data: { blocked: false },
      });

      this.logger.log(
        `[AUDIT] Admin ${session.userId} unblocked explorer ${username}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }
}
