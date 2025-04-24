import { IUserNotificationCreatePayload } from '../notification';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserMapGetResponse,
  IUserMembershipTierGetAllResponse,
  IUserMembershipTierUpdatePayload,
  IUserNotificationGetResponse,
  IUserPictureUploadPayload,
  IUserPostsQueryResponse,
  IUserProfileDetail,
  IUserSettingsProfileResponse,
  IUserSettingsUpdateQuery,
  MediaUploadContext,
  UserNotificationContext,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { decimalToInteger, integerToDecimal } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { toGeoJson } from '@/lib/geojson';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import {
  IPayloadWithSession,
  IQueryWithSession,
  ISessionQuery,
  ISessionQueryWithPayload,
} from '@/common/interfaces';
import { EVENTS, EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';
import { UploadService } from '@/modules/upload';

@Injectable()
export class UserService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
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
              name: true,
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
          ? getStaticMediaUrl(user.profile.picture)
          : '',
        bio: user.profile?.bio,
        name: user.profile.name,
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
              select: { name: true, picture: true },
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
              name: author.profile?.name,
              username: author?.username,
              picture: author?.profile?.picture
                ? getStaticMediaUrl(author?.profile.picture)
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

  async getMap({
    username,
  }: {
    username: string;
  }): Promise<IUserMapGetResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      // get user posts
      const posts = await this.prisma.post.findMany({
        where: {
          public: true,
          author: {
            username,
          },
          deleted_at: null,
        },
        select: {
          public_id: true,
          title: true,
          lat: true,
          lon: true,
        },
        orderBy: [{ id: 'desc' }],
      });

      return {
        lastWaypoint: { lat: posts[0].lat, lon: posts[0].lon },
        geojson: toGeoJson<{ id: string; title: string }>(
          'collection',
          posts.map(({ public_id, title, lat, lon }) => ({
            lat,
            lon,
            properties: { id: public_id, title },
          })),
        ),
      };
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
                  name: true,
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
          name: profile.name,
          picture: profile.picture ? getStaticMediaUrl(profile?.picture) : '',
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
                  name: true,
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
          name: profile.name,
          picture: profile.picture ? getStaticMediaUrl(profile.picture) : '',
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

        // create a notification
        if (followerId !== followeeId) {
          await this.eventService.trigger<IUserNotificationCreatePayload>({
            event: EVENTS.NOTIFICATIONS.CREATE,
            data: {
              context: UserNotificationContext.FOLLOW,
              userId: followeeId,
              mentionUserId: followerId,
            },
          });
        }
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
              select: { name: true, picture: true },
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
              name: author.profile?.name,
              username: author?.username,
              picture: author?.profile?.picture
                ? getStaticMediaUrl(author?.profile?.picture)
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
                    name: true,
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
                    ? getStaticMediaUrl(profile?.picture)
                    : '',
                  name: profile?.name,
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
                name: profile?.name,
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

  async getNotifications({
    session,
  }: IQueryWithSession): Promise<IUserNotificationGetResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where: Prisma.UserNotificationWhereInput = { user_id: userId };
      const page = 1;
      const take = 25;
      const skip = page <= 1 ? 0 : take * page;

      // get the notifications
      const results = await this.prisma.userNotification.count({ where });

      const data = await this.prisma.userNotification.findMany({
        where,
        select: {
          context: true,
          mention_user: {
            select: {
              username: true,
              profile: { select: { picture: true, name: true } },
            },
          },
          mention_post: {
            select: { public_id: true },
          },
          body: true,
          created_at: true,
        },
        take,
        skip,
        orderBy: [{ created_at: 'desc' }],
      });

      return {
        results,
        data: data.map(
          ({ mention_user, context, mention_post, body, created_at }) => ({
            context,
            body,
            mentionUser: {
              username: mention_user.username,
              name: mention_user.profile.name,
              picture: getStaticMediaUrl(mention_user.profile.picture),
            },
            postId: mention_post?.public_id,
            date: created_at,
          }),
        ),
        page,
      };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('notifications not found');
      throw exception;
    }
  }

  async getMembershipTiers({
    session,
  }: ISessionQuery): Promise<IUserMembershipTierGetAllResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where: Prisma.MembershipTierWhereInput = {
        user_id: userId,
        deleted_at: null,
      };

      const response: IUserMembershipTierGetAllResponse = {
        results: 0,
        data: [],
      };

      // get the number of membership tiers
      const results = await this.prisma.membershipTier.count({ where });

      if (results >= 1) {
        // get the membership tiers
        const data = await this.prisma.membershipTier
          .findMany({
            where,
            select: { public_id: true, price: true, description: true },
          })
          .catch(() => {
            throw new ServiceNotFoundException('membership tiers not found');
          });

        response.results = results;
        response.data = data.map(({ price, description, public_id: id }) => ({
          price,
          description,
          id,
          membersCount: 0,
        }));
      } else {
        // create a membership tier if it doesn't exist
        const tier = await this.prisma.membershipTier.create({
          data: {
            public_id: generator.publicId(),
            price: 0,
            description: '',
            user: { connect: { id: userId } },
          },
          select: { public_id: true, price: true, description: true },
        });

        console.log({ tier });

        response.results = 1;
        response.data = [tier].map(({ price, description, public_id: id }) => ({
          price,
          description,
          id,
          membersCount: 0,
        }));
      }

      response.data = response.data.map(({ price, ...data }) => ({
        ...data,
        price: integerToDecimal(price),
      }));

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('membership tiers not found');
      throw exception;
    }
  }

  async updateMembershipTier({
    query,
    payload,
    session,
  }: ISessionQueryWithPayload<
    { id: string },
    IUserMembershipTierUpdatePayload
  >): Promise<void> {
    try {
      const { userId } = session;
      const { id } = query;

      if (!userId) throw new ServiceForbiddenException();
      if (!id) throw new ServiceNotFoundException('membership not found');

      // check access
      const access = await this.prisma.membershipTier
        .findFirstOrThrow({
          where: { public_id: id, user_id: userId, deleted_at: null },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceNotFoundException('membership tier not found');

      // update the membership tier
      const price = payload.price ? decimalToInteger(payload.price) : undefined;
      await this.prisma.membershipTier.update({
        where: { public_id: id },
        data: {
          ...payload,
          price,
        },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('membership tier not updated');
      throw exception;
    }
  }

  async deleteMembershipTier({
    query,
    session,
  }: ISessionQuery<{ id: string }>): Promise<void> {
    try {
      const { userId } = session;
      const { id } = query;

      if (!userId) throw new ServiceForbiddenException();
      if (!id) throw new ServiceNotFoundException('membership not found');

      // check access
      const access = await this.prisma.membershipTier
        .findFirstOrThrow({
          where: { public_id: id, user_id: userId, deleted_at: null },
        })
        .then(() => true)
        .catch(() => false);
      if (!access)
        throw new ServiceNotFoundException('membership tier not found');

      // delete the membership tier
      await this.prisma.membershipTier.update({
        where: { public_id: id },
        data: { deleted_at: dateformat().toDate() },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('membership tier not deleted');
      throw exception;
    }
  }
}
