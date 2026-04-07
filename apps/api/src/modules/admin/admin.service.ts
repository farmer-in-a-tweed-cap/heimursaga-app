import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  FlagStatus,
  IAdminEntryListResponse,
  IAdminExpeditionListResponse,
  IAdminExplorerListResponse,
  IAdminInviteCodeCreateResponse,
  IAdminInviteCodeListResponse,
  IAdminStats,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { StripeService } from '@/modules/stripe';

const MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 50;

@Injectable()
export class AdminService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  private async assertAdmin(session: ISession) {
    if (!session?.userId) {
      throw new ServiceForbiddenException('Admin access required');
    }
    const explorer = await this.prisma.explorer.findUnique({
      where: { id: session.userId },
      select: { admin: true },
    });
    if (!explorer?.admin) {
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
            admin: true,
            blocked: true,
            is_guide: true,
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
          admin: e.admin,
          blocked: e.blocked,
          isGuide: e.is_guide ?? false,
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

      // Soft-delete comments
      await this.prisma.comment.updateMany({
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

      // Restore content that was soft-deleted when blocked
      await this.prisma.entry.updateMany({
        where: { author_id: explorer.id, deleted_at: { not: null } },
        data: { deleted_at: null },
      });
      await this.prisma.expedition.updateMany({
        where: { author_id: explorer.id, deleted_at: { not: null } },
        data: { deleted_at: null },
      });
      await this.prisma.comment.updateMany({
        where: { author_id: explorer.id, deleted_at: { not: null } },
        data: { deleted_at: null },
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

  async refundPayment(
    session: ISession,
    chargeId: string,
    reason?: string,
  ): Promise<{ success: boolean; refundId: string }> {
    try {
      await this.assertAdmin(session);

      if (!chargeId) {
        throw new ServiceBadRequestException('Charge ID is required');
      }

      // Retrieve the charge to verify it exists and is not already refunded
      const charge = await this.stripeService.charges.retrieve(chargeId);

      if (!charge) {
        throw new ServiceNotFoundException('Charge not found');
      }

      if (charge.refunded) {
        throw new ServiceBadRequestException(
          'Charge has already been refunded',
        );
      }

      // Issue the refund from the platform account
      const refund = await this.stripeService.refunds.create({
        charge: chargeId,
        reason: 'requested_by_customer',
        reverse_transfer: true,
        refund_application_fee: true,
        metadata: {
          issued_by: 'admin',
          admin_id: session.userId.toString(),
          admin_reason: reason || 'Refund issued by admin',
        },
      });

      this.logger.log(
        `[AUDIT] Admin ${session.userId} refunded charge ${chargeId}: ${refund.id}`,
      );

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async getInviteCodes(
    session: ISession,
    query: { limit?: number; offset?: number },
  ): Promise<IAdminInviteCodeListResponse> {
    try {
      await this.assertAdmin(session);

      const limit = Math.min(query.limit || DEFAULT_PER_PAGE, MAX_PER_PAGE);
      const offset = query.offset || 0;

      const [total, codes] = await Promise.all([
        this.prisma.inviteCode.count(),
        this.prisma.inviteCode.findMany({
          select: {
            id: true,
            code: true,
            label: true,
            used_at: true,
            expires_at: true,
            created_at: true,
            creator: { select: { username: true } },
            redeemer: { select: { username: true } },
          },
          take: limit,
          skip: offset,
          orderBy: { created_at: 'desc' },
        }),
      ]);

      const now = new Date();

      return {
        data: codes.map((c) => {
          let status: 'available' | 'used' | 'expired' = 'available';
          if (c.used_at) {
            status = 'used';
          } else if (c.expires_at && c.expires_at < now) {
            status = 'expired';
          }

          return {
            id: c.id,
            code: c.code,
            label: c.label ?? undefined,
            createdBy: c.creator.username,
            usedBy: c.redeemer?.username,
            usedAt: c.used_at?.toISOString(),
            expiresAt: c.expires_at?.toISOString(),
            createdAt: c.created_at.toISOString(),
            status,
          };
        }),
        total,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async createInviteCodes(
    session: ISession,
    payload: { label?: string; expiresAt?: string; count?: number },
  ): Promise<IAdminInviteCodeCreateResponse> {
    try {
      await this.assertAdmin(session);

      const count = Math.min(payload.count || 1, 50);
      const expiresAt = payload.expiresAt
        ? new Date(payload.expiresAt)
        : undefined;

      const codes = Array.from({ length: count }, () =>
        generator.publicId({ prefix: 'gc' }),
      );

      await this.prisma.inviteCode.createMany({
        data: codes.map((code) => ({
          code,
          label: payload.label || null,
          created_by: session.userId,
          expires_at: expiresAt,
        })),
      });

      this.logger.log(
        `[AUDIT] Admin ${session.userId} created ${count} invite code(s)`,
      );

      return { codes };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async revokeInviteCode(session: ISession, id: number): Promise<void> {
    try {
      await this.assertAdmin(session);

      const code = await this.prisma.inviteCode.findUnique({
        where: { id },
        select: { id: true, code: true, used_by: true },
      });

      if (!code) {
        throw new ServiceNotFoundException('Invite code not found');
      }

      if (code.used_by !== null) {
        throw new ServiceBadRequestException(
          'Cannot revoke a code that has already been used',
        );
      }

      await this.prisma.inviteCode.delete({ where: { id } });

      this.logger.log(
        `[AUDIT] Admin ${session.userId} revoked invite code ${code.code}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceInternalException();
    }
  }

  async backfillExpeditionLocations(
    session: ISession,
  ): Promise<{ updated: number; failed: number; skipped: number }> {
    await this.assertAdmin(session);

    const { reverseGeocodeLocation } = await import('@/lib/geocoding');

    // Find all expeditions without location data that have at least one waypoint
    const expeditions = await this.prisma.expedition.findMany({
      where: {
        location_name: null,
        deleted_at: null,
        waypoints: { some: {} },
      },
      select: {
        id: true,
        public_id: true,
        waypoints: {
          select: {
            waypoint: {
              select: { lat: true, lon: true },
            },
          },
          orderBy: { sequence: 'asc' },
          take: 1,
        },
      },
    });

    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (const exp of expeditions) {
      const firstWp = exp.waypoints[0]?.waypoint;
      if (!firstWp?.lat || !firstWp?.lon) {
        skipped++;
        continue;
      }

      try {
        const geo = await reverseGeocodeLocation(firstWp.lat, firstWp.lon);
        if (!geo) {
          skipped++;
          continue;
        }

        await this.prisma.expedition.update({
          where: { id: exp.id },
          data: {
            location_name: geo.locationName,
            country_code: geo.countryCode,
            country_name: geo.countryName,
            state_province: geo.stateProvince,
          },
        });
        updated++;

        // Rate limit: Mapbox free tier allows 600 req/min
        await new Promise((r) => setTimeout(r, 150));
      } catch (e) {
        this.logger.error(
          `Failed to geocode expedition ${exp.public_id}: ${e}`,
        );
        failed++;
      }
    }

    this.logger.log(
      `[AUDIT] Admin ${session.userId} backfilled locations: ${updated} updated, ${failed} failed, ${skipped} skipped`,
    );

    return { updated, failed, skipped };
  }
}
