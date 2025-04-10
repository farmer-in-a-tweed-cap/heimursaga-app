import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserPictureUploadPayload,
  IUserPostsQueryResponse,
  IUserProfileDetail,
  IUserSettingsProfileResponse,
  IUserSettingsUpdateQuery,
  MediaUploadContext,
} from '@repo/types';

import { getUploadStaticUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { IPayloadWithSession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { UploadService } from '@/modules/upload';

@Injectable()
export class UserService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async getByUsername({
    username,
    userId,
  }: {
    username: string;
    userId: number;
  }) {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      // get the user
      const user = await this.prisma.user.findFirstOrThrow({
        where: { username },
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              first_name: true,
              last_name: true,
              picture: true,
              bio: true,
            },
          },
          followers: userId
            ? {
                where: { follower_id: userId },
                select: { follower_id: true },
              }
            : undefined,
          created_at: true,
        },
      });

      const response: IUserProfileDetail = {
        username: user.username,
        picture: user.profile.picture
          ? getUploadStaticUrl(user.profile.picture)
          : '',
        bio: user.profile?.bio,
        firstName: user.profile.first_name,
        lastName: user.profile.last_name,
        memberDate: user.created_at,
        followed: userId ? user.followers.length > 0 : false,
        you: userId ? userId === user.id : false,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user not found');
      throw exception;
    }
  }

  async getPosts({ username, userId }: { username: string; userId: number }) {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      let where = {
        draft: false,
        public: true,
        deleted_at: null,
        lat: { not: null },
        lon: { not: null },
        author: { username },
      } as Prisma.PostWhereInput;

      let select = {
        public_id: true,
        title: true,
        content: true,
        lat: true,
        lon: true,
        date: true,
        place: true,
        created_at: true,
        likes_count: true,
        bookmarks_count: true,
        likes: userId
          ? {
              where: { user_id: userId },
              select: { post_id: true },
            }
          : undefined,
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
              select: { first_name: true, last_name: true, picture: true },
            },
          },
        },
      };

      // fetch results
      const results = await this.prisma.post.count({
        where,
      });
      const data = await this.prisma.post.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
      });

      const response: IUserPostsQueryResponse = {
        data: data.map(
          ({
            public_id: id,
            title,
            created_at: date,
            content,
            lat,
            lon,
            author,
            likes,
            likes_count,
            bookmarks,
            bookmarks_count,
          }) => ({
            id,
            title,
            date,
            content,
            lat,
            lon,
            author: {
              name: author.profile?.first_name,
              username: author?.username,
              picture: author?.profile?.picture
                ? getUploadStaticUrl(author?.profile.picture)
                : '',
            },
            liked: userId ? likes.length > 0 : false,
            bookmarked: userId ? bookmarks.length > 0 : false,
            likesCount: likes_count,
            bookmarksCount: bookmarks_count,
            you: userId ? userId === author.id : false,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('posts not found');
      throw exception;
    }
  }

  async getFollowers({
    username,
    userId,
  }: {
    username: string;
    userId: number;
  }): Promise<IUserFollowersQueryResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      // check if the user exists
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!user) throw new ServiceNotFoundException('user not found');

      const where = {
        followee_id: user.id,
      } as Prisma.UserFollowWhereInput;

      const results = await this.prisma.userFollow.count({
        where,
      });
      const data = await this.prisma.userFollow.findMany({
        where,
        select: {
          follower: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  first_name: true,
                  picture: true,
                },
              },
            },
          },
        },
        orderBy: [{ id: 'desc' }],
      });

      const response: IUserFollowersQueryResponse = {
        data: data.map(({ follower: { username, profile } }) => ({
          username,
          firstName: profile.first_name,
          lastName: profile.first_name,
          picture: profile.picture ? getUploadStaticUrl(profile?.picture) : '',
        })),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user not found');
      throw exception;
    }
  }

  async getFollowing({
    username,
    userId,
  }: {
    username: string;
    userId: number;
  }): Promise<IUserFollowingQueryResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      // check if the user exists
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!user) throw new ServiceNotFoundException('user not found');

      const where = {
        follower_id: user.id,
      } as Prisma.UserFollowWhereInput;

      const results = await this.prisma.userFollow.count({
        where,
      });
      const data = await this.prisma.userFollow.findMany({
        where,
        select: {
          followee: {
            select: {
              username: true,
              profile: {
                select: {
                  first_name: true,
                  picture: true,
                },
              },
            },
          },
        },
        orderBy: [{ id: 'desc' }],
      });

      const response: IUserFollowersQueryResponse = {
        data: data.map(({ followee: { username, profile } }) => ({
          username,
          firstName: profile.first_name,
          lastName: profile.first_name,
          picture: profile.picture ? getUploadStaticUrl(profile.picture) : '',
        })),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user not found');
      throw exception;
    }
  }

  async follow({
    username,
    userId,
  }: {
    username: string;
    userId: number;
  }): Promise<void> {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');
      if (!userId) throw new ServiceBadRequestException('user is not followed');

      // check if the user exists
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!user) throw new ServiceNotFoundException('user not found');

      const followerId = userId;
      const followeeId = user.id;

      // check if the user is followed already
      const followed = await this.prisma.userFollow
        .findFirstOrThrow({
          where: {
            followee_id: followeeId,
            follower_id: followerId,
          },
        })
        .then(() => true)
        .catch(() => false);
      if (followed)
        throw new ServiceBadRequestException('user is already followed');

      if (!followerId || !followeeId)
        throw new ServiceBadRequestException('user is not followed');

      // follow the user
      await this.prisma.$transaction(async (tx) => {
        // create a follow
        await tx.userFollow.create({
          data: {
            follower_id: followerId,
            followee_id: followeeId,
          },
        });

        // update the user follower count
        await tx.user.update({
          where: { id: followeeId },
          data: {
            followers_count: { increment: 1 },
          },
        });

        // update the user following count
        await tx.user.update({
          where: { id: followerId },
          data: {
            following_count: { increment: 1 },
          },
        });
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('user not followed');
      throw exception;
    }
  }

  async unfollow({
    username,
    userId,
  }: {
    username: string;
    userId: number;
  }): Promise<void> {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');
      if (!userId)
        throw new ServiceBadRequestException('user is not unfollowed');

      // check if the user exists
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!user) throw new ServiceNotFoundException('user not found');

      const followerId = userId;
      const followeeId = user.id;

      // check if the user is followed already
      const followed = await this.prisma.userFollow
        .findFirstOrThrow({
          where: {
            followee_id: followeeId,
            follower_id: followerId,
          },
        })
        .then(() => true)
        .catch(() => false);
      if (!followed)
        throw new ServiceBadRequestException('user is not followed');

      if (!followerId || !followeeId)
        throw new ServiceBadRequestException('user is not unfollowed');

      // follow the user
      await this.prisma.$transaction(async (tx) => {
        // create a follow
        await tx.userFollow.deleteMany({
          where: {
            follower_id: followerId,
            followee_id: followeeId,
          },
        });

        // update the user follower count
        await tx.user.update({
          where: { id: followeeId },
          data: {
            followers_count: { decrement: 1 },
          },
        });

        // update the user following count
        await tx.user.update({
          where: { id: followerId },
          data: {
            following_count: { decrement: 1 },
          },
        });
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('user not followed');
      throw exception;
    }
  }
}

@Injectable()
export class SessionUserService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async getPosts({
    userId,
    context,
  }: {
    userId: number;
    context: 'feed' | 'bookmarks' | 'drafts';
  }) {
    try {
      if (!userId) throw new ServiceForbiddenException();

      let where = {
        deleted_at: null,
        lat: { not: null },
        lon: { not: null },
      } as Prisma.PostWhereInput;

      let select = {
        public_id: true,
        title: true,
        content: true,
        lat: true,
        lon: true,
        date: true,
        place: true,
        created_at: true,
        likes_count: true,
        bookmarks_count: true,
        likes: userId
          ? {
              where: { user_id: userId },
              select: { post_id: true },
            }
          : undefined,
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
              select: { first_name: true, last_name: true, picture: true },
            },
          },
        },
      };

      // filter based on context
      switch (context) {
        case 'feed':
          where = {
            ...where,
            public: true,
            draft: false,
            author: { id: userId },
          };
          break;
        case 'bookmarks':
          where = {
            ...where,
            public: true,
            draft: false,
            bookmarks: {
              some: {
                user_id: userId,
              },
            },
          };
          break;
        case 'drafts':
          where = {
            ...where,
            public: false,
            // draft: true,
            author: { id: userId },
          };
          break;
      }

      // fetch results
      const results = await this.prisma.post.count({
        where,
      });
      const data = await this.prisma.post.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
      });

      const response: IUserPostsQueryResponse = {
        data: data.map(
          ({
            public_id: id,
            title,
            created_at: date,
            content,
            lat,
            lon,
            author,
            likes,
            likes_count,
            bookmarks,
            bookmarks_count,
          }) => ({
            id,
            title,
            date,
            content,
            lat,
            lon,
            author: {
              name: author.profile?.first_name,
              username: author?.username,
              picture: author?.profile?.picture
                ? getUploadStaticUrl(author?.profile?.picture)
                : '',
            },
            liked: userId ? likes.length > 0 : false,
            bookmarked: userId ? bookmarks.length > 0 : false,
            likesCount: likes_count,
            bookmarksCount: bookmarks_count,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('posts not found');
      throw exception;
    }
  }

  async getSettings({
    userId,
    context,
  }: {
    userId: number;
    context: 'profile' | 'billing';
  }): Promise<IUserSettingsProfileResponse> {
    try {
      if (!userId) throw new ServiceForbiddenException();

      // fetch settings based on context
      switch (context) {
        case 'profile':
          return this.prisma.user
            .findFirstOrThrow({
              where: { id: userId },
              select: {
                email: true,
                username: true,
                profile: {
                  select: {
                    first_name: true,
                    last_name: true,
                    bio: true,
                    picture: true,
                  },
                },
              },
            })
            .then(
              ({ email, username, profile }) =>
                ({
                  email,
                  username,
                  picture: profile?.picture
                    ? getUploadStaticUrl(profile?.picture)
                    : '',
                  firstName: profile?.first_name,
                  lastName: profile?.last_name,
                  bio: profile?.bio,
                }) as IUserSettingsProfileResponse,
            );
        case 'billing':
          break;
        default:
          throw new ServiceBadRequestException('settings not found');
      }
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('settings not found');
      throw exception;
    }
  }

  async updateSettings({
    payload,
    session,
  }: IPayloadWithSession<IUserSettingsUpdateQuery>): Promise<void> {
    try {
      const { userId } = session;
      const { context, profile } = payload;

      if (!userId) throw new ServiceForbiddenException();

      // update settings based on context
      switch (context) {
        case 'profile':
          // update user profile
          await this.prisma.$transaction(async (tx) => {
            await tx.userProfile.update({
              where: { user_id: userId },
              data: {
                first_name: profile?.firstName,
                last_name: profile?.lastName,
                bio: profile?.bio,
              },
            });
          });

          break;
        case 'billing':
          break;
        default:
          throw new ServiceBadRequestException('settings not updated');
      }
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('settings not updated');
      throw exception;
    }
  }

  async updatePicture({
    payload,
    session,
  }: IPayloadWithSession<IUserPictureUploadPayload>): Promise<void> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // get user
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { id: userId }, select: { username: true } })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // upload picture
      const { thumbnail } = await this.uploadService.upload({
        payload: {
          file: payload.file,
          context: MediaUploadContext.USER,
          thumbnail: true,
        },
        session,
      });

      // update user profile
      await this.prisma.userProfile.update({
        where: { user_id: userId },
        data: { picture: thumbnail },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user picture not updated');
      throw exception;
    }
  }
}
