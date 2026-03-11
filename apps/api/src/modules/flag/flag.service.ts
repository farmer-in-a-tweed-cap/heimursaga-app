import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  FlagActionType,
  FlagCategory,
  FlagStatus,
  IFlagCreatePayload,
  IFlagCreateResponse,
  IFlagDetail,
  IFlagListResponse,
  IFlagUpdatePayload,
} from '@repo/types';

import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
  ServiceUnauthorizedException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

// Constants for flag system
const MAX_FLAGS_PER_HOUR = 10;
const MAX_FLAGS_PER_PAGE = 100;
const DEFAULT_FLAGS_PER_PAGE = 50;
const CONTENT_PREVIEW_LENGTH = 150;

interface IFlagQuery {
  status?: FlagStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class FlagService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  private async isAdmin(userId: number): Promise<boolean> {
    const explorer = await this.prisma.explorer.findUnique({
      where: { id: userId },
      select: { admin: true },
    });
    return explorer?.admin === true;
  }

  /**
   * Create a new flag
   */
  async createFlag({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    IFlagCreatePayload
  >): Promise<IFlagCreateResponse> {
    try {
      const { userId } = session;
      const {
        category,
        description,
        flaggedPostId,
        flaggedCommentId,
        flaggedExpeditionId,
        flaggedExplorerId,
      } = payload;

      // Check authentication
      if (!userId) {
        throw new ServiceUnauthorizedException(
          'You must be logged in to report content',
        );
      }

      // Validate exactly one content type is flagged
      const contentIds = [
        flaggedPostId,
        flaggedCommentId,
        flaggedExpeditionId,
        flaggedExplorerId,
      ].filter(Boolean);
      if (contentIds.length !== 1) {
        throw new ServiceBadRequestException(
          'You must flag exactly one piece of content',
        );
      }

      // Rate limiting: Check if user has flagged too many items recently
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentFlagsCount = await this.prisma.flag.count({
        where: {
          reporter_id: userId,
          created_at: { gte: oneHourAgo },
        },
      });

      if (recentFlagsCount >= MAX_FLAGS_PER_HOUR) {
        throw new ServiceBadRequestException(
          'Too many reports submitted. Please try again later.',
        );
      }

      // Get the content being flagged and validate it exists
      let flaggedPostDbId: number | null = null;
      let flaggedCommentDbId: number | null = null;
      let flaggedExpeditionDbId: number | null = null;
      let flaggedExplorerDbId: number | null = null;

      if (flaggedPostId) {
        const post = await this.prisma.entry.findFirst({
          where: { public_id: flaggedPostId, deleted_at: null },
          select: { id: true },
        });
        if (!post) throw new ServiceNotFoundException('Entry not found');
        flaggedPostDbId = post.id;

        const existing = await this.prisma.flag.findFirst({
          where: { reporter_id: userId, flagged_entry_id: flaggedPostDbId },
        });
        if (existing) {
          throw new ServiceBadRequestException(
            'You have already reported this entry',
          );
        }
      }

      if (flaggedCommentId) {
        const comment = await this.prisma.comment.findFirst({
          where: { public_id: flaggedCommentId, deleted_at: null },
          select: { id: true },
        });
        if (!comment) throw new ServiceNotFoundException('Comment not found');
        flaggedCommentDbId = comment.id;

        const existing = await this.prisma.flag.findFirst({
          where: {
            reporter_id: userId,
            flagged_comment_id: flaggedCommentDbId,
          },
        });
        if (existing) {
          throw new ServiceBadRequestException(
            'You have already reported this comment',
          );
        }
      }

      if (flaggedExpeditionId) {
        const expedition = await this.prisma.expedition.findFirst({
          where: { public_id: flaggedExpeditionId, deleted_at: null },
          select: { id: true },
        });
        if (!expedition)
          throw new ServiceNotFoundException('Expedition not found');
        flaggedExpeditionDbId = expedition.id;

        const existing = await this.prisma.flag.findFirst({
          where: {
            reporter_id: userId,
            flagged_expedition_id: flaggedExpeditionDbId,
          },
        });
        if (existing) {
          throw new ServiceBadRequestException(
            'You have already reported this expedition',
          );
        }
      }

      if (flaggedExplorerId) {
        const explorer = await this.prisma.explorer.findFirst({
          where: { username: flaggedExplorerId, blocked: false },
          select: { id: true },
        });
        if (!explorer) throw new ServiceNotFoundException('Explorer not found');
        flaggedExplorerDbId = explorer.id;

        if (explorer.id === userId) {
          throw new ServiceBadRequestException('You cannot report yourself');
        }

        const existing = await this.prisma.flag.findFirst({
          where: {
            reporter_id: userId,
            flagged_explorer_id: flaggedExplorerDbId,
          },
        });
        if (existing) {
          throw new ServiceBadRequestException(
            'You have already reported this explorer',
          );
        }
      }

      // Create flag and increment counter in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const flag = await tx.flag.create({
          data: {
            public_id: generator.publicId(),
            category,
            description: description || null,
            status: FlagStatus.PENDING,
            reporter_id: userId,
            flagged_entry_id: flaggedPostDbId,
            flagged_comment_id: flaggedCommentDbId,
            flagged_expedition_id: flaggedExpeditionDbId,
            flagged_explorer_id: flaggedExplorerDbId,
          },
          select: { public_id: true },
        });

        if (flaggedPostDbId) {
          await tx.entry.update({
            where: { id: flaggedPostDbId },
            data: { flags_count: { increment: 1 } },
          });
        }

        if (flaggedCommentDbId) {
          await tx.comment.update({
            where: { id: flaggedCommentDbId },
            data: { flags_count: { increment: 1 } },
          });
        }

        return flag;
      });

      return {
        id: result.public_id,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceException('Failed to create flag');
    }
  }

  /**
   * Get flags (admin only)
   */
  async getFlags({
    session,
    query,
  }: ISessionQueryWithPayload<IFlagQuery, {}>): Promise<IFlagListResponse> {
    try {
      const { userId } = session;
      const { status, limit = DEFAULT_FLAGS_PER_PAGE, offset = 0 } = query;

      // Check authorization - admin only
      if (!userId || !(await this.isAdmin(userId))) {
        throw new ServiceForbiddenException('Only admins can view flags');
      }

      const where: Prisma.FlagWhereInput = {};

      if (status) {
        where.status = status;
      }

      const [total, flagsData] = await Promise.all([
        this.prisma.flag.count({ where }),
        this.prisma.flag.findMany({
          where,
          select: {
            public_id: true,
            category: true,
            description: true,
            status: true,
            action_taken: true,
            admin_notes: true,
            created_at: true,
            reviewed_at: true,
            reporter: {
              select: {
                username: true,
                profile: {
                  select: {
                    picture: true,
                  },
                },
              },
            },
            reviewed_by: {
              select: {
                username: true,
              },
            },
            flagged_entry: {
              select: {
                public_id: true,
                content: true,
                title: true,
                author: {
                  select: {
                    username: true,
                    profile: {
                      select: {
                        picture: true,
                      },
                    },
                  },
                },
              },
            },
            flagged_comment: {
              select: {
                public_id: true,
                content: true,
                author: {
                  select: {
                    username: true,
                    profile: {
                      select: {
                        picture: true,
                      },
                    },
                  },
                },
              },
            },
            flagged_expedition: {
              select: {
                public_id: true,
                title: true,
                description: true,
                author: {
                  select: {
                    username: true,
                    profile: {
                      select: {
                        picture: true,
                      },
                    },
                  },
                },
              },
            },
            flagged_explorer: {
              select: {
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
          take: Math.min(limit, MAX_FLAGS_PER_PAGE),
          skip: offset,
          orderBy: [{ created_at: 'desc' }],
        }),
      ]);

      const flags: IFlagDetail[] = flagsData.map((flag) => {
        let type: 'post' | 'comment' | 'expedition' | 'explorer';
        let id: string;
        let preview: string;
        let authorUsername: string;
        let authorPicture: string | undefined;

        if (flag.flagged_entry) {
          type = 'post';
          id = flag.flagged_entry.public_id!;
          preview =
            flag.flagged_entry.title ||
            flag.flagged_entry.content.slice(0, CONTENT_PREVIEW_LENGTH);
          authorUsername = flag.flagged_entry.author.username;
          authorPicture = flag.flagged_entry.author.profile?.picture
            ? getStaticMediaUrl(flag.flagged_entry.author.profile.picture)
            : undefined;
        } else if (flag.flagged_comment) {
          type = 'comment';
          id = flag.flagged_comment.public_id!;
          preview = flag.flagged_comment.content.slice(
            0,
            CONTENT_PREVIEW_LENGTH,
          );
          authorUsername = flag.flagged_comment.author.username;
          authorPicture = flag.flagged_comment.author.profile?.picture
            ? getStaticMediaUrl(flag.flagged_comment.author.profile.picture)
            : undefined;
        } else if (flag.flagged_expedition) {
          type = 'expedition';
          id = flag.flagged_expedition.public_id!;
          preview =
            flag.flagged_expedition.title ||
            flag.flagged_expedition.description?.slice(
              0,
              CONTENT_PREVIEW_LENGTH,
            ) ||
            'Untitled expedition';
          authorUsername = flag.flagged_expedition.author.username;
          authorPicture = flag.flagged_expedition.author.profile?.picture
            ? getStaticMediaUrl(flag.flagged_expedition.author.profile.picture)
            : undefined;
        } else if (flag.flagged_explorer) {
          type = 'explorer';
          id = flag.flagged_explorer.username;
          preview =
            flag.flagged_explorer.profile?.name ||
            flag.flagged_explorer.username;
          authorUsername = flag.flagged_explorer.username;
          authorPicture = flag.flagged_explorer.profile?.picture
            ? getStaticMediaUrl(flag.flagged_explorer.profile.picture)
            : undefined;
        } else {
          // Orphaned flag — content was deleted
          type = 'post';
          id = 'unknown';
          preview = '[Content deleted]';
          authorUsername = 'unknown';
          authorPicture = undefined;
        }

        return {
          id: flag.public_id,
          category: flag.category as FlagCategory,
          description: flag.description || undefined,
          status: flag.status as FlagStatus,
          actionTaken: (flag.action_taken as FlagActionType) || undefined,
          adminNotes: flag.admin_notes || undefined,
          createdAt: flag.created_at,
          reviewedAt: flag.reviewed_at || undefined,
          reporter: {
            username: flag.reporter.username,
            picture: flag.reporter.profile?.picture
              ? getStaticMediaUrl(flag.reporter.profile.picture)
              : undefined,
          },
          reviewedBy: flag.reviewed_by
            ? {
                username: flag.reviewed_by.username,
              }
            : undefined,
          flaggedContent: {
            type,
            id,
            preview,
            author: {
              username: authorUsername,
              picture: authorPicture,
            },
          },
        };
      });

      return {
        flags,
        total,
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceException('Failed to get flags');
    }
  }

  /**
   * Get single flag by ID (admin only)
   */
  async getFlagById({
    session,
    flagId,
  }: ISessionQuery & { flagId: string }): Promise<IFlagDetail> {
    try {
      const { userId } = session;

      // Check authorization - admin only
      if (!userId || !(await this.isAdmin(userId))) {
        throw new ServiceForbiddenException(
          'Only admins can view flag details',
        );
      }

      const flag = await this.prisma.flag.findFirst({
        where: { public_id: flagId },
        select: {
          public_id: true,
          category: true,
          description: true,
          status: true,
          action_taken: true,
          admin_notes: true,
          created_at: true,
          reviewed_at: true,
          reporter: {
            select: {
              username: true,
              profile: {
                select: {
                  picture: true,
                },
              },
            },
          },
          reviewed_by: {
            select: {
              username: true,
            },
          },
          flagged_entry: {
            select: {
              public_id: true,
              content: true,
              title: true,
              author: {
                select: {
                  username: true,
                  profile: {
                    select: {
                      picture: true,
                    },
                  },
                },
              },
            },
          },
          flagged_comment: {
            select: {
              public_id: true,
              content: true,
              author: {
                select: {
                  username: true,
                  profile: {
                    select: {
                      picture: true,
                    },
                  },
                },
              },
            },
          },
          flagged_expedition: {
            select: {
              public_id: true,
              title: true,
              description: true,
              author: {
                select: {
                  username: true,
                  profile: {
                    select: {
                      picture: true,
                    },
                  },
                },
              },
            },
          },
          flagged_explorer: {
            select: {
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
      });

      if (!flag) {
        throw new ServiceNotFoundException('Flag not found');
      }

      let type: 'post' | 'comment' | 'expedition' | 'explorer';
      let id: string;
      let preview: string;
      let authorUsername: string;
      let authorPicture: string | undefined;

      if (flag.flagged_entry) {
        type = 'post';
        id = flag.flagged_entry.public_id!;
        preview =
          flag.flagged_entry.title || flag.flagged_entry.content.slice(0, 500);
        authorUsername = flag.flagged_entry.author.username;
        authorPicture = flag.flagged_entry.author.profile?.picture
          ? getStaticMediaUrl(flag.flagged_entry.author.profile.picture)
          : undefined;
      } else if (flag.flagged_comment) {
        type = 'comment';
        id = flag.flagged_comment.public_id!;
        preview = flag.flagged_comment.content.slice(0, 500);
        authorUsername = flag.flagged_comment.author.username;
        authorPicture = flag.flagged_comment.author.profile?.picture
          ? getStaticMediaUrl(flag.flagged_comment.author.profile.picture)
          : undefined;
      } else if (flag.flagged_expedition) {
        type = 'expedition';
        id = flag.flagged_expedition.public_id!;
        preview =
          flag.flagged_expedition.title ||
          flag.flagged_expedition.description?.slice(0, 500) ||
          'Untitled expedition';
        authorUsername = flag.flagged_expedition.author.username;
        authorPicture = flag.flagged_expedition.author.profile?.picture
          ? getStaticMediaUrl(flag.flagged_expedition.author.profile.picture)
          : undefined;
      } else if (flag.flagged_explorer) {
        type = 'explorer';
        id = flag.flagged_explorer.username;
        preview =
          flag.flagged_explorer.profile?.name || flag.flagged_explorer.username;
        authorUsername = flag.flagged_explorer.username;
        authorPicture = flag.flagged_explorer.profile?.picture
          ? getStaticMediaUrl(flag.flagged_explorer.profile.picture)
          : undefined;
      } else {
        type = 'post';
        id = 'unknown';
        preview = '[Content deleted]';
        authorUsername = 'unknown';
        authorPicture = undefined;
      }

      return {
        id: flag.public_id,
        category: flag.category as FlagCategory,
        description: flag.description || undefined,
        status: flag.status as FlagStatus,
        actionTaken: (flag.action_taken as FlagActionType) || undefined,
        adminNotes: flag.admin_notes || undefined,
        createdAt: flag.created_at,
        reviewedAt: flag.reviewed_at || undefined,
        reporter: {
          username: flag.reporter.username,
          picture: flag.reporter.profile?.picture
            ? getStaticMediaUrl(flag.reporter.profile.picture)
            : undefined,
        },
        reviewedBy: flag.reviewed_by
          ? {
              username: flag.reviewed_by.username,
            }
          : undefined,
        flaggedContent: {
          type,
          id,
          preview,
          author: {
            username: authorUsername,
            picture: authorPicture,
          },
        },
      };
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceException('Failed to get flag');
    }
  }

  /**
   * Update flag (admin only)
   */
  async updateFlag({
    session,
    flagId,
    payload,
  }: ISessionQuery & {
    flagId: string;
    payload: IFlagUpdatePayload;
  }): Promise<void> {
    try {
      const { userId } = session;
      const { status, actionTaken, adminNotes } = payload;

      // Check authorization - admin only
      if (!userId || !(await this.isAdmin(userId))) {
        throw new ServiceForbiddenException('Only admins can update flags');
      }

      // Get the flag
      const flag = await this.prisma.flag.findFirst({
        where: { public_id: flagId },
        select: {
          id: true,
          public_id: true,
          flagged_entry_id: true,
          flagged_comment_id: true,
          status: true,
        },
      });

      if (!flag) {
        throw new ServiceNotFoundException('Flag not found');
      }

      // Perform admin action in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Update the flag
        await tx.flag.update({
          where: { id: flag.id },
          data: {
            status,
            action_taken: actionTaken || null,
            admin_notes: adminNotes || null,
            reviewed_by_id: userId,
            reviewed_at: new Date(),
          },
        });

        // Decrement flags_count if dismissing or taking action
        if (
          flag.status === FlagStatus.PENDING &&
          (status === FlagStatus.DISMISSED ||
            status === FlagStatus.ACTION_TAKEN)
        ) {
          if (flag.flagged_entry_id) {
            await tx.entry.update({
              where: {
                id: flag.flagged_entry_id,
                flags_count: { gt: 0 }, // Only decrement if count > 0
              },
              data: { flags_count: { decrement: 1 } },
            });
          }

          if (flag.flagged_comment_id) {
            await tx.comment.update({
              where: {
                id: flag.flagged_comment_id,
                flags_count: { gt: 0 }, // Only decrement if count > 0
              },
              data: { flags_count: { decrement: 1 } },
            });
          }
        }

        // Perform admin action if specified
        if (actionTaken === FlagActionType.CONTENT_DELETED) {
          // Soft delete the content
          if (flag.flagged_entry_id) {
            await tx.entry.update({
              where: { id: flag.flagged_entry_id },
              data: { deleted_at: new Date() },
            });
            this.logger.log(
              `[AUDIT] Admin ${userId} deleted post ${flag.flagged_entry_id} via flag ${flag.public_id}`,
            );
          }

          if (flag.flagged_comment_id) {
            await tx.comment.update({
              where: { id: flag.flagged_comment_id },
              data: { deleted_at: new Date() },
            });
            this.logger.log(
              `[AUDIT] Admin ${userId} deleted comment ${flag.flagged_comment_id} via flag ${flag.public_id}`,
            );
          }
        }

        if (actionTaken === FlagActionType.USER_BLOCKED) {
          // Block the content author
          if (flag.flagged_entry_id) {
            const post = await tx.entry.findUnique({
              where: { id: flag.flagged_entry_id },
              select: { author_id: true },
            });

            if (post) {
              await tx.explorer.update({
                where: { id: post.author_id },
                data: { blocked: true },
              });
              this.logger.log(
                `[AUDIT] Admin ${userId} blocked user ${post.author_id} via flag ${flag.public_id}`,
              );
            }
          }

          if (flag.flagged_comment_id) {
            const comment = await tx.comment.findUnique({
              where: { id: flag.flagged_comment_id },
              select: { author_id: true },
            });

            if (comment) {
              await tx.explorer.update({
                where: { id: comment.author_id },
                data: { blocked: true },
              });
              this.logger.log(
                `[AUDIT] Admin ${userId} blocked user ${comment.author_id} via flag ${flag.public_id}`,
              );
            }
          }
        }
      });
    } catch (e) {
      this.logger.error(e);
      if (e instanceof ServiceException) throw e;
      throw new ServiceException('Failed to update flag');
    }
  }
}
