import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { generator } from '@/lib/generator';
import { UserRole, UserNotificationContext } from '@repo/types';

import {
  ServiceBadRequestException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { EventService, EVENTS } from '@/modules/event';
import { IUserNotificationCreatePayload } from '@/modules/notification';

import { CommentCreateDto, CommentQueryDto, CommentUpdateDto } from './comment.dto';

export interface ICommentDetail {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    username: string;
    picture?: string;
    creator?: boolean;
  };
  createdByMe: boolean;
  parentId?: string;
  repliesCount?: number;
  replies?: ICommentDetail[];
}

export interface ICommentListResponse {
  data: ICommentDetail[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

@Injectable()
export class CommentService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  /**
   * Get all comments for a post
   */
  async getCommentsByPost(
    postId: string,
    query: CommentQueryDto,
    { session }: ISessionQuery,
  ): Promise<ICommentListResponse> {
    try {
      const { userId } = session;

      // Find the post by public_id
      const post = await this.prisma.post.findFirst({
        where: {
          public_id: postId,
          deleted_at: null,
        },
        select: {
          id: true,
          comments_enabled: true,
        },
      });

      if (!post) {
        throw new ServiceNotFoundException('Post not found');
      }

      const limit = Math.min(query.limit || 20, 100);
      const where: Prisma.CommentWhereInput = {
        post_id: post.id,
        deleted_at: null,
        parent_id: null, // Only fetch top-level comments
      };

      // Handle cursor-based pagination
      if (query.cursor) {
        where.id = { lt: parseInt(query.cursor, 10) };
      }

      // Get top-level comments with author info and replies
      const comments = await this.prisma.comment.findMany({
        where,
        select: {
          id: true,
          public_id: true,
          content: true,
          author_id: true,
          parent_id: true,
          created_at: true,
          updated_at: true,
          author: {
            select: {
              username: true,
              role: true,
              profile: {
                select: {
                  picture: true,
                },
              },
            },
          },
          replies: {
            where: {
              deleted_at: null,
            },
            select: {
              id: true,
              public_id: true,
              content: true,
              author_id: true,
              created_at: true,
              updated_at: true,
              author: {
                select: {
                  username: true,
                  role: true,
                  profile: {
                    select: {
                      picture: true,
                    },
                  },
                },
              },
            },
            orderBy: [{ created_at: 'asc' }], // Replies ordered oldest first
          },
        },
        orderBy: [{ created_at: 'desc' }],
        take: limit + 1, // Fetch one extra to check if there are more
      });

      const hasMore = comments.length > limit;
      const data = comments.slice(0, limit);

      const processedData: ICommentDetail[] = data.map((comment) => ({
        id: comment.public_id,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        author: {
          username: comment.author.username,
          picture: comment.author.profile?.picture,
          creator: comment.author.role === UserRole.CREATOR,
        },
        createdByMe: userId === comment.author_id,
        repliesCount: comment.replies?.length || 0,
        replies: comment.replies?.map((reply) => ({
          id: reply.public_id,
          content: reply.content,
          createdAt: reply.created_at,
          updatedAt: reply.updated_at,
          author: {
            username: reply.author.username,
            picture: reply.author.profile?.picture,
            creator: reply.author.role === UserRole.CREATOR,
          },
          createdByMe: userId === reply.author_id,
          parentId: comment.public_id,
        })) || [],
      }));

      const nextCursor = hasMore ? data[data.length - 1].id.toString() : undefined;

      const count = await this.prisma.comment.count({ where });

      return {
        data: processedData,
        count,
        hasMore,
        nextCursor,
      };
    } catch (error) {
      this.logger.error('Failed to get comments', error);
      throw error;
    }
  }

  /**
   * Create a new comment
   */
  async createComment(
    postId: string,
    payload: CommentCreateDto,
    { session }: ISessionQueryWithPayload<CommentCreateDto>,
  ): Promise<ICommentDetail> {
    try {
      const { userId } = session;

      if (!userId) {
        throw new ServiceForbiddenException('You must be logged in to comment');
      }

      // Find the post and check if comments are enabled
      const post = await this.prisma.post.findFirst({
        where: {
          public_id: postId,
          deleted_at: null,
        },
        select: {
          id: true,
          public_id: true,
          title: true,
          author_id: true,
          comments_enabled: true,
        },
      });

      if (!post) {
        throw new ServiceNotFoundException('Post not found');
      }

      if (!post.comments_enabled) {
        throw new ServiceForbiddenException('Comments are disabled for this post');
      }

      // Handle parent comment (for replies)
      let parentCommentId: number | undefined;
      if (payload.parentId) {
        const parentComment = await this.prisma.comment.findFirst({
          where: {
            public_id: payload.parentId,
            post_id: post.id,
            deleted_at: null,
          },
          select: {
            id: true,
            parent_id: true,
          },
        });

        if (!parentComment) {
          throw new ServiceNotFoundException('Parent comment not found');
        }

        // Prevent nesting beyond one level (no replies to replies)
        if (parentComment.parent_id !== null) {
          throw new ServiceBadRequestException('Cannot reply to a reply. Please reply to the parent comment instead.');
        }

        parentCommentId = parentComment.id;
      }

      // Create the comment
      const comment = await this.prisma.comment.create({
        data: {
          public_id: generator.publicId({ prefix: 'cm' }),
          content: payload.content,
          author_id: userId,
          post_id: post.id,
          parent_id: parentCommentId,
        },
        select: {
          id: true,
          public_id: true,
          content: true,
          author_id: true,
          created_at: true,
          updated_at: true,
          author: {
            select: {
              username: true,
              role: true,
              profile: {
                select: {
                  picture: true,
                },
              },
            },
          },
        },
      });

      // Increment the comment count on the post
      await this.prisma.post.update({
        where: { id: post.id },
        data: {
          comments_count: { increment: 1 },
        },
      });

      // Send notifications
      if (parentCommentId) {
        // This is a reply - notify the parent comment author
        const parentCommentAuthor = await this.prisma.comment.findUnique({
          where: { id: parentCommentId },
          select: { author_id: true },
        });

        if (parentCommentAuthor && parentCommentAuthor.author_id !== userId) {
          await this.eventService.trigger<IUserNotificationCreatePayload>({
            event: EVENTS.NOTIFICATION_CREATE,
            data: {
              context: UserNotificationContext.COMMENT_REPLY,
              userId: parentCommentAuthor.author_id,
              mentionUserId: userId,
              mentionPostId: post.id,
              body: post.title,
            },
          });
        }
      } else {
        // This is a top-level comment - notify the post author
        if (userId !== post.author_id) {
          const notificationBody = post.title;

          await this.eventService.trigger<IUserNotificationCreatePayload>({
            event: EVENTS.NOTIFICATION_CREATE,
            data: {
              context: UserNotificationContext.COMMENT,
              userId: post.author_id,
              mentionUserId: userId,
              mentionPostId: post.id,
              body: notificationBody,
            },
          });
        }
      }

      return {
        id: comment.public_id,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        author: {
          username: comment.author.username,
          picture: comment.author.profile?.picture,
          creator: comment.author.role === UserRole.CREATOR,
        },
        createdByMe: true,
      };
    } catch (error) {
      this.logger.error('Failed to create comment', error);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    payload: CommentUpdateDto,
    { session }: ISessionQueryWithPayload<CommentUpdateDto>,
  ): Promise<ICommentDetail> {
    try {
      const { userId } = session;

      if (!userId) {
        throw new ServiceForbiddenException('You must be logged in to update a comment');
      }

      // Find the comment
      const existingComment = await this.prisma.comment.findFirst({
        where: {
          public_id: commentId,
          deleted_at: null,
        },
        select: {
          id: true,
          author_id: true,
        },
      });

      if (!existingComment) {
        throw new ServiceNotFoundException('Comment not found');
      }

      // Check if the user is the author
      if (existingComment.author_id !== userId) {
        throw new ServiceForbiddenException('You can only edit your own comments');
      }

      // Update the comment
      const comment = await this.prisma.comment.update({
        where: { id: existingComment.id },
        data: {
          content: payload.content,
        },
        select: {
          id: true,
          public_id: true,
          content: true,
          author_id: true,
          created_at: true,
          updated_at: true,
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
      });

      return {
        id: comment.public_id,
        content: comment.content,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        author: {
          username: comment.author.username,
          picture: comment.author.profile?.picture,
        },
        createdByMe: true,
      };
    } catch (error) {
      this.logger.error('Failed to update comment', error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    commentId: string,
    { session }: ISessionQuery,
  ): Promise<{ success: boolean }> {
    try {
      const { userId, userRole } = session;

      if (!userId) {
        throw new ServiceForbiddenException('You must be logged in to delete a comment');
      }

      // Find the comment
      const existingComment = await this.prisma.comment.findFirst({
        where: {
          public_id: commentId,
          deleted_at: null,
        },
        select: {
          id: true,
          author_id: true,
          post_id: true,
          replies: {
            where: {
              deleted_at: null,
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (!existingComment) {
        throw new ServiceNotFoundException('Comment not found');
      }

      // Check if the user is the author or an admin
      const isAuthor = existingComment.author_id === userId;
      const isAdmin = userRole === 'admin';

      if (!isAuthor && !isAdmin) {
        throw new ServiceForbiddenException('You can only delete your own comments');
      }

      // Count how many comments will be deleted (parent + replies)
      const totalDeleted = 1 + (existingComment.replies?.length || 0);
      const now = new Date();

      // Soft delete the comment
      await this.prisma.comment.update({
        where: { id: existingComment.id },
        data: {
          deleted_at: now,
        },
      });

      // Soft delete all replies (if any)
      if (existingComment.replies && existingComment.replies.length > 0) {
        await this.prisma.comment.updateMany({
          where: {
            parent_id: existingComment.id,
            deleted_at: null,
          },
          data: {
            deleted_at: now,
          },
        });
      }

      // Decrement the comment count on the post by total deleted
      await this.prisma.post.update({
        where: { id: existingComment.post_id },
        data: {
          comments_count: { decrement: totalDeleted },
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to delete comment', error);
      throw error;
    }
  }

  /**
   * Toggle comments on/off for a post
   */
  async toggleComments(
    postId: string,
    { session }: ISessionQuery,
  ): Promise<{ commentsEnabled: boolean }> {
    try {
      const { userId } = session;

      if (!userId) {
        throw new ServiceForbiddenException('You must be logged in');
      }

      // Find the post
      const post = await this.prisma.post.findFirst({
        where: {
          public_id: postId,
          deleted_at: null,
        },
        select: {
          id: true,
          author_id: true,
          comments_enabled: true,
        },
      });

      if (!post) {
        throw new ServiceNotFoundException('Post not found');
      }

      // Check if the user is the author
      if (post.author_id !== userId) {
        throw new ServiceForbiddenException('You can only toggle comments on your own posts');
      }

      // Toggle comments
      const updatedPost = await this.prisma.post.update({
        where: { id: post.id },
        data: {
          comments_enabled: !post.comments_enabled,
        },
        select: {
          comments_enabled: true,
        },
      });

      return { commentsEnabled: updatedPost.comments_enabled ?? true };
    } catch (error) {
      this.logger.error('Failed to toggle comments', error);
      throw error;
    }
  }
}
