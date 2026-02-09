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
  UserRole,
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
      const { category, description, flaggedPostId, flaggedCommentId } =
        payload;

      // Check authentication
      if (!userId) {
        throw new ServiceUnauthorizedException(
          'You must be logged in to report content',
        );
      }

      // Validate exactly one content type is flagged
      if (
        (!flaggedPostId && !flaggedCommentId) ||
        (flaggedPostId && flaggedCommentId)
      ) {
        throw new ServiceBadRequestException(
          'You must flag either a post or a comment, not both',
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

      if (flaggedPostId) {
        const post = await this.prisma.entry.findFirst({
          where: {
            public_id: flaggedPostId,
            deleted_at: null,
          },
          select: { id: true },
        });

        if (!post) {
          throw new ServiceNotFoundException('Post not found');
        }

        flaggedPostDbId = post.id;

        // Check if user already flagged this post
        const existingFlag = await this.prisma.flag.findFirst({
          where: {
            reporter_id: userId,
            flagged_entry_id: flaggedPostDbId,
          },
        });

        if (existingFlag) {
          throw new ServiceBadRequestException(
            'You have already reported this post',
          );
        }
      }

      if (flaggedCommentId) {
        const comment = await this.prisma.comment.findFirst({
          where: {
            public_id: flaggedCommentId,
            deleted_at: null,
          },
          select: { id: true },
        });

        if (!comment) {
          throw new ServiceNotFoundException('Comment not found');
        }

        flaggedCommentDbId = comment.id;

        // Check if user already flagged this comment
        const existingFlag = await this.prisma.flag.findFirst({
          where: {
            reporter_id: userId,
            flagged_comment_id: flaggedCommentDbId,
          },
        });

        if (existingFlag) {
          throw new ServiceBadRequestException(
            'You have already reported this comment',
          );
        }
      }

      // Create flag and increment counter in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the flag
        const flag = await tx.flag.create({
          data: {
            public_id: generator.publicId(),
            category,
            description: description || null,
            status: FlagStatus.PENDING,
            reporter_id: userId,
            flagged_entry_id: flaggedPostDbId,
            flagged_comment_id: flaggedCommentDbId,
          },
          select: {
            public_id: true,
          },
        });

        // Increment flags_count on the flagged content
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
      const { userId, userRole } = session;
      const { status, limit = DEFAULT_FLAGS_PER_PAGE, offset = 0 } = query;

      // Check authorization - admin only
      const isAdmin = userRole === UserRole.ADMIN;
      if (!isAdmin) {
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
          },
          take: Math.min(limit, MAX_FLAGS_PER_PAGE),
          skip: offset,
          orderBy: [{ created_at: 'desc' }],
        }),
      ]);

      const flags: IFlagDetail[] = flagsData.map((flag) => {
        const isPost = !!flag.flagged_entry;
        const content = isPost ? flag.flagged_entry : flag.flagged_comment;

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
            type: isPost ? 'post' : 'comment',
            id: content!.public_id!,
            preview: isPost
              ? flag.flagged_entry!.title ||
                flag.flagged_entry!.content.slice(0, CONTENT_PREVIEW_LENGTH)
              : flag.flagged_comment!.content.slice(0, CONTENT_PREVIEW_LENGTH),
            author: {
              username: content!.author.username,
              picture: content!.author.profile?.picture
                ? getStaticMediaUrl(content.author.profile.picture)
                : undefined,
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
      const { userRole } = session;

      // Check authorization - admin only
      const isAdmin = userRole === UserRole.ADMIN;
      if (!isAdmin) {
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
        },
      });

      if (!flag) {
        throw new ServiceNotFoundException('Flag not found');
      }

      const isPost = !!flag.flagged_entry;
      const content = isPost ? flag.flagged_entry : flag.flagged_comment;

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
          type: isPost ? 'post' : 'comment',
          id: content!.public_id!,
          preview: isPost
            ? flag.flagged_entry!.title ||
              flag.flagged_entry!.content.slice(0, 500)
            : flag.flagged_comment!.content.slice(0, 500),
          author: {
            username: content!.author.username,
            picture: content!.author.profile?.picture
              ? getStaticMediaUrl(content.author.profile.picture)
              : undefined,
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
      const { userId, userRole } = session;
      const { status, actionTaken, adminNotes } = payload;

      // Check authorization - admin only
      const isAdmin = userRole === UserRole.ADMIN;
      if (!isAdmin) {
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
