import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { dateformat } from '@/lib/date-format';
import { generator } from '@/lib/generator';
import { getUploadStaticUrl } from '@/lib/upload';

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
  IPostFindByIdPayload,
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
      const where = {
        public_id: { not: null },
        public: true,
        deleted_at: null,
      } as Prisma.PostWhereInput;

      const take = 20;

      // search posts
      const results = await this.prisma.post.count({ where });
      const data = await this.prisma.post
        .findMany({
          where,
          select: {
            public_id: true,
            title: true,
            content: true,
            lat: true,
            lon: true,
            place: true,
            date: true,
            likes_count: true,
            bookmarks_count: true,
            // check if the session user has liked this post
            likes: userId
              ? {
                  where: { user_id: userId },
                  select: { post_id: true },
                }
              : undefined,
            // check if the session user has bookmarked this post
            bookmarks: userId
              ? {
                  where: { user_id: userId },
                  select: { post_id: true },
                }
              : undefined,
            author: {
              select: {
                username: true,
                profile: {
                  select: { first_name: true, picture: true },
                },
              },
            },
            created_at: true,
          },
          take,
          orderBy: [{ id: 'desc' }],
        })
        .then((posts) =>
          posts.map((post) => ({
            id: post.public_id,
            lat: post.lat,
            lon: post.lon,
            place: post.place,
            date: post.date,
            title: post.title,
            content: post.content.slice(0, 140),
            author: {
              username: post.author?.username,
              name: post.author?.profile?.first_name,
              picture: post.author?.profile?.picture
                ? getUploadStaticUrl(post.author?.profile?.picture)
                : undefined,
            },
            liked: userId ? post.likes.length > 0 : false,
            bookmarked: userId ? post.bookmarks.length > 0 : false,
            likesCount: post.likes_count,
            bookmarksCount: post.bookmarks_count,
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

  async getById(payload: IPostFindByIdPayload) {
    try {
      const { publicId, userId } = payload;

      // get the post
      const data = await this.prisma.post
        .findFirstOrThrow({
          where: { public_id: publicId },
          select: {
            public_id: true,
            title: true,
            content: true,
            public: true,
            draft: true,
            lat: true,
            lon: true,
            place: true,
            date: true,
            likes_count: true,
            bookmarks_count: true,
            // check if the session user has liked this post
            likes: userId
              ? {
                  where: { user_id: userId },
                  select: { post_id: true },
                }
              : undefined,
            // check if the session user has bookmarked this post
            bookmarks: userId
              ? {
                  where: { user_id: userId },
                  select: { post_id: true },
                }
              : undefined,
            author: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: { first_name: true, picture: true },
                },
              },
            },
            created_at: true,
          },
        })
        .then((post) => ({
          id: post.public_id,
          title: post.title,
          content: post.content,
          lat: post.lat,
          lon: post.lon,
          place: post.place,
          date: post.date,
          liked: userId ? post.likes.length > 0 : undefined,
          bookmarked: userId ? post.bookmarks.length > 0 : undefined,
          likesCount: post.likes_count,
          bookmarksCount: post.bookmarks_count,
          public: post.public,
          author: {
            id: post.author?.id,
            username: post.author?.username,
            name: post.author?.profile?.first_name,
            picture: post.author?.profile?.picture
              ? getUploadStaticUrl(post.author?.profile?.picture)
              : undefined,
          },
          createdByMe: userId ? userId === post.author?.id : undefined,
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

  async create(payload: IPostCreatePayload) {
    try {
      const { userId, ...data } = payload;

      const publicId = generator.publicId();

      // create a post
      const post = await this.prisma.post.create({
        data: {
          ...data,
          public: true,
          draft: false,
          public_id: publicId,
          author: { connect: { id: userId } },
        },
        select: {
          public_id: true,
        },
      });

      return {
        id: post.public_id,
      };
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
      const { publicId, userId, ...data } = payload;

      if (!publicId || !userId)
        throw new ServiceNotFoundException('post not found');

      // access check
      const access = await this.prisma.post
        .findFirstOrThrow({
          where: { public_id: publicId, author_id: userId },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceForbiddenException('post can not be updated');

      // update the post
      const post = await this.prisma.post.updateMany({
        where: { public_id: publicId, author_id: userId },
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
      const { publicId, userId } = payload;

      if (!publicId || !userId)
        throw new ServiceNotFoundException('post not found');

      // access check
      const access = await this.prisma.post
        .findFirstOrThrow({
          where: { public_id: publicId, author_id: userId },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceForbiddenException('post can not be deleted');

      // update the post
      const post = await this.prisma.post.updateMany({
        where: { public_id: publicId, author_id: userId, deleted_at: null },
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
      const { publicId, userId } = payload;

      if (!publicId || !userId)
        throw new ServiceNotFoundException('post not found');

      // check if the post exists
      const post = await this.prisma.post
        .findFirstOrThrow({
          where: { public_id: publicId, deleted_at: null },
          select: {
            id: true,
            likes_count: true,
          },
        })
        .catch(() => null);
      if (!post) throw new ServiceNotFoundException('post not found');

      // check if it is liked already
      const liked = await this.prisma.postLike.findUnique({
        where: {
          post_id_user_id: {
            post_id: post.id,
            user_id: userId,
          },
        },
      });

      if (liked) {
        // delete the like
        await this.prisma.postLike.delete({
          where: {
            post_id_user_id: {
              post_id: post.id,
              user_id: userId,
            },
          },
        });
      } else {
        // create a like
        await this.prisma.postLike.create({
          data: {
            post_id: post.id,
            user_id: userId,
          },
        });
      }

      // update the like count
      const updatedPost = await this.prisma.post.update({
        where: { id: post.id },
        data: { likes_count: liked ? { decrement: 1 } : { increment: 1 } },
      });

      const response: IPostLikeResponse = {
        likesCount: updatedPost.likes_count,
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
      const { publicId, userId } = payload;

      if (!publicId || !userId)
        throw new ServiceNotFoundException('post not found');

      // check if the post exists
      const post = await this.prisma.post
        .findFirstOrThrow({
          where: { public_id: publicId, deleted_at: null },
          select: {
            id: true,
            bookmarks_count: true,
          },
        })
        .catch(() => null);

      if (!post) throw new ServiceNotFoundException('post not found');

      // check if it is bookmarked already
      const bookmarked = await this.prisma.postBookmark.findUnique({
        where: {
          post_id_user_id: {
            post_id: post.id,
            user_id: userId,
          },
        },
      });

      if (bookmarked) {
        // delete the bookmark
        await this.prisma.postBookmark.delete({
          where: {
            post_id_user_id: {
              post_id: post.id,
              user_id: userId,
            },
          },
        });
      } else {
        // create a bookmark
        await this.prisma.postBookmark.create({
          data: {
            post_id: post.id,
            user_id: userId,
          },
        });
      }

      // update the user bookmark count
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          bookmarks_count: bookmarked ? { decrement: 1 } : { increment: 1 },
        },
      });

      // update the bookmark count
      const updatedPost = await this.prisma.post.update({
        where: { id: post.id },
        data: {
          bookmarks_count: bookmarked ? { decrement: 1 } : { increment: 1 },
        },
      });

      const response: IPostBookmarkResponse = {
        bookmarksCount: updatedPost.bookmarks_count,
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
