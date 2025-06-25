import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IPostCreatePayload,
  IPostCreateResponse,
  IPostGetAllResponse,
  IPostGetByIdResponse,
  IPostUpdatePayload,
  UserNotificationContext,
  UserRole,
} from '@repo/types';
import { IPostBookmarkResponse, IPostLikeResponse } from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { normalizeText } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { EVENTS, EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { IUserNotificationCreatePayload } from '@/modules/notification';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class PostService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async getPosts({ session }: ISessionQuery): Promise<IPostGetAllResponse> {
    try {
      const { userId, userRole } = session;

      let where = {
        public_id: { not: null },
      } as Prisma.PostWhereInput;

      const take = 500;

      // filter based on role
      switch (userRole) {
        case UserRole.ADMIN:
          where = {
            ...where,
            deleted_at: null,
          };
          break;
        case UserRole.CREATOR:
          where = {
            ...where,
            public: true,
            deleted_at: null,
          };
          break;
        case UserRole.USER:
          where = {
            ...where,
            public: true,
            deleted_at: null,
          };
          break;
        default:
          where = {
            ...where,
            public: true,
            deleted_at: null,
          };
          break;
      }

      // get posts
      const results = await this.prisma.post.count({ where });
      const data = await this.prisma.post
        .findMany({
          where,
          select: {
            public_id: true,
            title: true,
            content: true,
            public: true,
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
                role: true,
                profile: {
                  select: { name: true, picture: true },
                },
              },
            },
            created_at: true,
          },
          take,
          orderBy: [{ date: 'desc' }],
        })
        .then((posts) =>
          posts.map((post) => ({
            id: post.public_id,
            lat: post.lat,
            lon: post.lon,
            place: post.place,
            date: post.date,
            title: post.title,
            public: post.public,
            content: post.content.slice(0, 140),
            author: post.author
              ? {
                  username: post.author.username,
                  name: post.author.profile?.name,
                  picture: post.author.profile?.picture
                    ? getStaticMediaUrl(post.author.profile.picture)
                    : undefined,
                  creator: post.author.role === UserRole.CREATOR,
                }
              : undefined,
            liked: userId ? post.likes.length > 0 : false,
            bookmarked: userId ? post.bookmarks.length > 0 : false,
            likesCount: post.likes_count,
            bookmarksCount: post.bookmarks_count,
            createdAt: post.created_at,
          })),
        );

      const response: IPostGetAllResponse = {
        data,
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('post not found');
      throw exception;
    }
  }

  async getById({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<IPostGetByIdResponse> {
    try {
      const { publicId } = query;
      const { userId, userRole } = session;

      if (!publicId) throw new ServiceNotFoundException('post not found');

      let where = {
        public_id: publicId,
      } as Prisma.PostWhereInput;

      // filter based on user role
      switch (userRole) {
        case UserRole.ADMIN:
          where = { ...where, deleted_at: null };
          break;
        case UserRole.CREATOR:
          where = {
            ...where,
            deleted_at: null,
            OR: [{ author_id: userId }, { public: true }],
          };
          break;
        case UserRole.USER:
          where = {
            ...where,
            deleted_at: null,
            OR: [{ author_id: userId }, { public: true }],
          };
          break;
        default:
          where = { ...where, deleted_at: null, public: true };
          break;
      }

      // get a post
      const post = await this.prisma.post.findFirstOrThrow({
        where,
        select: {
          public_id: true,
          title: true,
          content: true,
          public: true,
          sponsored: true,
          place: true,
          date: true,
          waypoint: { select: { lat: true, lon: true } },
          likes_count: true,
          bookmarks_count: true,
          media: {
            select: {
              upload: {
                select: {
                  public_id: true,
                  thumbnail: true,
                },
              },
            },
          },
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
              role: true,
              profile: {
                select: { name: true, picture: true },
              },
            },
          },
          created_at: true,
        },
      });

      const response: IPostGetByIdResponse = {
        id: post.public_id,
        title: post.title,
        content: post.content,
        place: post.place,
        date: post.date,
        liked: userId ? post.likes.length > 0 : undefined,
        bookmarked: userId ? post.bookmarks.length > 0 : undefined,
        likesCount: post.likes_count,
        bookmarksCount: post.bookmarks_count,
        public: post.public,
        sponsored: post.sponsored,
        waypoint: post.waypoint,
        media: post.media
          ? post.media.map(({ upload }) => ({
              id: upload?.public_id,
              thumbnail: getStaticMediaUrl(upload?.thumbnail),
            }))
          : [],
        author: post.author
          ? {
              username: post.author.username,
              // name: post.author.profile.name,
              picture: post.author.profile.picture
                ? getStaticMediaUrl(post.author.profile.picture)
                : undefined,
              creator: post.author.role === UserRole.CREATOR,
            }
          : undefined,
        createdByMe: userId ? userId === post.author?.id : undefined,
        createdAt: post.created_at,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('post not found');
      throw exception;
    }
  }

  async create({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    IPostCreatePayload
  >): Promise<IPostCreateResponse> {
    try {
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      const { title, lat, lon, date, place, waypointId } = payload;
      const privacy = {
        public: payload.public,
        sponsored: payload.sponsored,
      };
      const content = normalizeText(payload.content);

      if (waypointId) {
        // get the waypoint
        await this.prisma.waypoint
          .findFirstOrThrow({ where: { id: waypointId, deleted_at: null } })
          .catch(() => {
            throw new ServiceBadRequestException('waypoint is not available');
          });

        // check if the waypoint attached already
        await this.prisma.post
          .count({ where: { waypoint: { id: waypointId } } })
          .catch(() => {
            throw new ServiceBadRequestException('waypoint is not available');
          });
      }

      // create a post
      const { post } = await this.prisma.$transaction(async (tx) => {
        // create a post
        const post = await tx.post.create({
          data: {
            public_id: generator.publicId(),
            title,
            content,
            date,
            place,
            public: privacy.public,
            sponsored: privacy.sponsored,
            author: { connect: { id: userId } },
            waypoint: waypointId
              ? { connect: { id: waypointId } }
              : { create: { lat, lon } },
          },
          select: { id: true, public_id: true },
        });

        // create post media
        const uploads = await tx.upload.findMany({
          where: { public_id: { in: payload.uploads || [] } },
          select: { id: true },
        });

        if (uploads.length >= 1) {
          await tx.postMedia.createMany({
            data: uploads.map((upload) => ({
              post_id: post.id,
              upload_id: upload.id,
            })),
          });
        }

        // update the user
        await tx.user.update({
          where: { id: userId },
          data: { posts_count: { increment: 1 } },
        });

        return { post };
      });

      const response: IPostCreateResponse = {
        id: post.public_id,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not created');
      throw exception;
    }
  }

  async update({
    query,
    session,
    payload,
  }: ISessionQueryWithPayload<
    { publicId: string },
    IPostUpdatePayload
  >): Promise<void> {
    try {
      const { publicId } = query;
      const { userId } = session;
      const { uploads = [] } = payload;

      if (!publicId) throw new ServiceNotFoundException('post not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // check post
      const post = await this.prisma.post
        .findFirstOrThrow({
          where: {
            public_id: publicId,
            author_id: userId,
            deleted_at: null,
          },
          select: {
            id: true,
            waypoint_id: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('post not found');
        });
      const { waypoint } = payload;

      // update the post
      await this.prisma.$transaction(async (tx) => {
        // update the post
        await tx.post.update({
          where: { id: post.id },
          data: {
            title: payload.title,
            content: normalizeText(payload.content),
            public: payload.public,
            sponsored: payload.sponsored,
            place: payload.place,
            date: payload.date,
          },
        });

        // update the waypoint
        if (waypoint) {
          if (post.waypoint_id) {
            await tx.waypoint.update({
              where: { id: post.waypoint_id },
              data: {
                lat: waypoint.lat,
                lon: waypoint.lon,
              },
            });
          }
        }

        // update post media
        const media = await tx.postMedia.findMany({
          where: { post_id: post.id },
          select: {
            upload: { select: { id: true, public_id: true, thumbnail: true } },
          },
        });

        // filter post uploads
        const mediaAdded = uploads.filter(
          (uploadId) =>
            !media.find(({ upload }) => upload.public_id === uploadId),
        );
        const mediaRemoved = media.filter(
          ({ upload }) =>
            !uploads.find((uploadId) => uploadId === upload.public_id),
        );

        // delete post media
        if (mediaRemoved.length >= 1) {
          await tx.postMedia.deleteMany({
            where: {
              upload_id: { in: mediaRemoved.map(({ upload }) => upload.id) },
            },
          });
        }

        // create post media
        if (mediaAdded.length >= 1) {
          const uploads = await tx.upload.findMany({
            where: { public_id: { in: mediaAdded } },
            select: { id: true },
          });

          await tx.postMedia.createMany({
            data: uploads.map((upload) => ({
              post_id: post.id,
              upload_id: upload.id,
            })),
          });
        }
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('post not updated');
      throw exception;
    }
  }

  async delete({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<void> {
    try {
      const { publicId } = query;
      const { userId, userRole } = session;

      if (!userId) throw new ServiceForbiddenException();
      if (!publicId) throw new ServiceNotFoundException('post not found');

      let where = {
        public_id: publicId,
        deleted_at: null,
      } as Prisma.PostWhereInput;

      // filter based on user role
      switch (userRole) {
        case UserRole.ADMIN:
          where = { ...where };
          break;
        case UserRole.CREATOR:
          where = {
            ...where,
            author_id: userId,
          };
          break;
        case UserRole.USER:
          where = {
            ...where,
            author_id: userId,
          };
          break;
        default:
          throw new ServiceForbiddenException();
      }

      // check access
      const post = await this.prisma.post
        .findFirstOrThrow({ where, select: { id: true } })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // update the post
      await this.prisma.post.update({
        where: { id: post.id },
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

  async like({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<IPostLikeResponse> {
    try {
      const { publicId } = query;
      const { userId } = session;

      if (!publicId || !userId)
        throw new ServiceNotFoundException('post not found');

      // check if the post exists
      const post = await this.prisma.post
        .findFirstOrThrow({
          where: { public_id: publicId, deleted_at: null },
          select: {
            id: true,
            likes_count: true,
            author_id: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('post not found');
        });

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

        // create a notification
        if (userId !== post.author_id) {
          await this.eventService.trigger<IUserNotificationCreatePayload>({
            event: EVENTS.NOTIFICATIONS.CREATE,
            data: {
              context: UserNotificationContext.LIKE,
              userId: post.author_id,
              mentionUserId: userId,
              mentionPostId: post.id,
            },
          });
        }
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

  async bookmark({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<IPostBookmarkResponse> {
    try {
      const { publicId } = query;
      const { userId } = session;

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
