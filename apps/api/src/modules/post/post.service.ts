import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { dateformat } from '@/lib/date-format';

import {
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import {
  IPostBookmarkResponse,
  IPostCreatePayload,
  IPostDeletePayload,
  IPostLikePayload,
  IPostLikeResponse,
  IPostSearchPayload,
  IPostUpdatePayload,
} from './post.interface';

@Injectable()
export class PostService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async search(payload: IPostSearchPayload) {
    try {
      const { userId } = payload;
      const where = { deleted_at: null } as Prisma.PostWhereInput;

      // search posts
      const results = await this.prisma.post.count({ where });
      const data = await this.prisma.post
        .findMany({
          where,
          select: {
            id: true,
            title: true,
            content: true,
            likesCount: true,
            bookmarksCount: true,
            author: {
              select: {
                profile: {
                  select: { first_name: true, picture: true },
                },
              },
            },
            created_at: true,
          },
          orderBy: [{ id: 'desc' }],
        })
        .then((posts) =>
          posts.map((post) => ({
            id: post.id,
            title: post.title,
            author: {
              name: post.author?.profile?.first_name,
              picture: post.author?.profile?.picture,
            },
            likesCount: post.likesCount,
            bookmarksCount: post.bookmarksCount,
            createdAt: post.created_at,
          })),
        );

      return { results, data };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not created');
      throw exception;
    }
  }

  async getById(id: number) {
    try {
      // get the post
      const data = await this.prisma.post
        .findFirstOrThrow({
          where: { id, deleted_at: null },
          select: {
            id: true,
            title: true,
            content: true,
            author: {
              select: {
                profile: {
                  select: { first_name: true, picture: true },
                },
              },
            },
            created_at: true,
          },
        })
        .then((post) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          author: {
            name: post.author?.profile?.first_name,
            picture: post.author?.profile?.picture,
          },
          createdAt: post.created_at,
        }));

      return data;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('post not found');
      throw exception;
    }
  }

  async create(payload: IPostCreatePayload): Promise<void> {
    try {
      const { userId, ...data } = payload;

      // create a post
      const post = await this.prisma.post.create({
        data: {
          ...data,
          author: { connect: { id: userId } },
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not created');
      throw exception;
    }
  }

  async update(payload: IPostUpdatePayload): Promise<void> {
    try {
      const { id, userId, ...data } = payload;

      if (!id || !userId) throw new ServiceNotFoundException('post not found');

      // access check
      const access = await this.prisma.post
        .findFirstOrThrow({
          where: { id, author_id: userId },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceForbiddenException('post can not be updated');

      // update the post
      const post = await this.prisma.post.update({
        where: { id, author_id: userId },
        data,
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not updated');
      throw exception;
    }
  }

  async delete(payload: IPostDeletePayload): Promise<void> {
    try {
      const { id, userId } = payload;

      if (!id || !userId) throw new ServiceNotFoundException('post not found');

      // access check
      const access = await this.prisma.post
        .findFirstOrThrow({
          where: { id, author_id: userId },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceForbiddenException('post can not be deleted');

      // update the post
      const post = await this.prisma.post.update({
        where: { id, author_id: userId, deleted_at: null },
        data: { deleted_at: dateformat().toDate() },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not deleted');
      throw exception;
    }
  }

  async like(payload: IPostLikePayload): Promise<IPostLikeResponse> {
    try {
      const { id, userId } = payload;

      if (!id || !userId) throw new ServiceNotFoundException('post not found');

      // check if the post exists
      const post = await this.prisma.post
        .findFirstOrThrow({
          where: { id, deleted_at: null },
          select: {
            id: true,
            likesCount: true,
          },
        })
        .catch(() => null);

      if (!post) throw new ServiceNotFoundException('post not found');

      // check if it is liked already
      const liked = await this.prisma.postLike.findUnique({
        where: {
          post_id_user_id: {
            post_id: id,
            user_id: userId,
          },
        },
      });

      if (liked) {
        // delete the like
        await this.prisma.postLike.delete({
          where: {
            post_id_user_id: {
              post_id: id,
              user_id: userId,
            },
          },
        });
      } else {
        // create a like
        await this.prisma.postLike.create({
          data: {
            post_id: id,
            user_id: userId,
          },
        });
      }

      // update the like count
      const updatedPost = await this.prisma.post.update({
        where: { id },
        data: { likesCount: liked ? { decrement: 1 } : { increment: 1 } },
      });

      const response: IPostLikeResponse = {
        likesCount: updatedPost.likesCount,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not liked');
      throw exception;
    }
  }

  async bookmark(payload: IPostLikePayload): Promise<IPostBookmarkResponse> {
    try {
      const { id, userId } = payload;

      if (!id || !userId) throw new ServiceNotFoundException('post not found');

      // check if the post exists
      const post = await this.prisma.post
        .findFirstOrThrow({
          where: { id, deleted_at: null },
          select: {
            id: true,
            bookmarksCount: true,
          },
        })
        .catch(() => null);

      if (!post) throw new ServiceNotFoundException('post not found');

      // check if it is bookmarked already
      const liked = await this.prisma.postBookmark.findUnique({
        where: {
          post_id_user_id: {
            post_id: id,
            user_id: userId,
          },
        },
      });

      if (liked) {
        // delete the bookmark
        await this.prisma.postBookmark.delete({
          where: {
            post_id_user_id: {
              post_id: id,
              user_id: userId,
            },
          },
        });
      } else {
        // create a bookmark
        await this.prisma.postBookmark.create({
          data: {
            post_id: id,
            user_id: userId,
          },
        });
      }

      // update the bookmark count
      const updatedPost = await this.prisma.post.update({
        where: { id },
        data: { bookmarksCount: liked ? { decrement: 1 } : { increment: 1 } },
      });

      const response: IPostBookmarkResponse = {
        bookmarksCount: updatedPost.bookmarksCount,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not bookmarked');
      throw exception;
    }
  }
}
