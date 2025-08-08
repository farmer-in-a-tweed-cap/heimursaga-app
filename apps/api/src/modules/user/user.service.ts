import { IUserNotificationCreatePayload } from '../notification';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IBadgeCountGetResponse,
  IPostInsightsGetResponse,
  ISponsorshipTierGetAllResponse,
  ISponsorshipTierUpdatePayload,
  IUserDetail,
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserGetAllResponse,
  IUserGetByUsernameResponse,
  IUserMapGetResponse,
  IUserNotificationGetResponse,
  IUserPictureUploadPayload,
  IUserPostsQueryResponse,
  IUserSettingsProfileGetResponse,
  IUserSettingsProfileUpdatePayload,
  MediaUploadContext,
  SponsorshipStatus,
  UserNotificationContext,
  UserRole,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { decimalToInteger, integerToDecimal } from '@/lib/formatter';
import { toGeoJson } from '@/lib/geojson';
import { getStaticMediaUrl } from '@/lib/upload';
import { matchRoles } from '@/lib/utils';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import {
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

  /**
   * Check if a user has an active sponsorship with a creator
   */
  private async hasActiveSponsorship(userId: number, creatorId: number): Promise<boolean> {
    if (!userId) return false;
    
    const sponsorship = await this.prisma.sponsorship.findFirst({
      where: {
        user_id: userId,
        creator_id: creatorId,
        status: SponsorshipStatus.ACTIVE,
        expiry: {
          gt: new Date(), // expiry is in the future
        },
        deleted_at: null,
      },
    });

    return !!sponsorship;
  }

  async getUsers({
    query,
    session,
  }: ISessionQuery): Promise<IUserGetAllResponse> {
    try {
      const { userId, userRole } = session;

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.ADMIN]);
      if (!access) throw new ServiceForbiddenException();

      const where = {} as Prisma.UserWhereInput;

      const select = {
        username: true,
        blocked: true,
        role: true,
        profile: {
          select: {
            name: true,
            picture: true,
          },
        },
        posts_count: true,
        created_at: true,
      } satisfies Prisma.UserSelect;

      // get users
      const results = await this.prisma.user.count({ where });
      const data = await this.prisma.user.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
      });

      const response: IUserGetAllResponse = {
        data: data.map(
          ({ username, role, profile, blocked, posts_count, created_at }) => ({
            username,
            role,
            blocked,
            name: profile.name,
            picture: getStaticMediaUrl(profile.picture),
            postsCount: posts_count,
            memberDate: created_at,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('users not found');
      throw exception;
    }
  }

  async getByUsername({
    query,
    session,
  }: ISessionQuery<{ username: string }>): Promise<IUserGetByUsernameResponse> {
    try {
      const { username } = query;
      const { userId, userRole } = session;

      if (!username) throw new ServiceNotFoundException('user not found');

      let where = { username } as Prisma.UserWhereInput;

      // filter based on user role
      switch (userRole) {
        case UserRole.ADMIN:
          where = { ...where };
          break;
        case UserRole.CREATOR:
          where = {
            ...where,
            blocked: false,
          };
          break;
        case UserRole.USER:
          where = {
            ...where,
            blocked: false,
          };
          break;
        default:
          where = {
            ...where,
            blocked: false,
          };
          break;
      }

      // get the user
      const user = await this.prisma.user.findFirstOrThrow({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          is_stripe_account_connected: true,
          profile: {
            select: {
              name: true,
              picture: true,
              bio: true,
              location_from: true,
              location_lives: true,
              sponsors_fund: true,
              sponsors_fund_type: true,
              sponsors_fund_journey_id: true,
              portfolio: true,
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

      const response = {
        username: user.username,
        picture: user.profile.picture
          ? getStaticMediaUrl(user.profile.picture)
          : '',
        bio: user.profile?.bio,
        // name: user.profile.name,
        memberDate: user.created_at,
        followed: userId ? user.followers.length > 0 : false,
        you: userId ? userId === user.id : false,
        creator: user.role === UserRole.CREATOR,
        stripeAccountConnected: user.is_stripe_account_connected,
        locationFrom: user.profile?.location_from,
        locationLives: user.profile?.location_lives,
        sponsorsFund: user.profile?.sponsors_fund,
        sponsorsFundType: user.profile?.sponsors_fund_type,
        sponsorsFundJourneyId: user.profile?.sponsors_fund_journey_id,
        portfolio: user.profile?.portfolio,
      } as IUserGetByUsernameResponse;

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user not found');
      throw exception;
    }
  }

  async blockUser({
    query,
    session,
  }: ISessionQuery<{ username: string }>): Promise<void> {
    try {
      const { username } = query;
      const { userId, userRole } = session;

      if (!username) throw new ServiceNotFoundException('user not found');

      // check access
      const access = !!userId && matchRoles(userRole, [UserRole.ADMIN]);
      if (!access) throw new ServiceForbiddenException();

      // get the user
      const user = await this.prisma.user.findFirstOrThrow({
        where: { username },
        select: { id: true },
      });

      // update the user
      await this.prisma.user.update({
        where: { id: user.id },
        data: { blocked: true },
      });

      // invalidate sessions
      await this.prisma.userSession.updateMany({
        where: { user_id: user.id },
        data: { expired: true, expires_at: dateformat().toDate() },
      });

      // delete posts
      await this.prisma.post.updateMany({
        where: { author_id: user.id },
        data: { deleted_at: dateformat().toDate() },
      });

      // delete trips
      await this.prisma.trip.updateMany({
        where: { author_id: user.id },
        data: { deleted_at: dateformat().toDate() },
      });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('user not blocked');
      throw exception;
    }
  }

  async getPosts({ username, userId }: { username: string; userId: number }) {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      const where = {
        public: true,
        deleted_at: null,
        lat: { not: null },
        lon: { not: null },
        author: { username },
      } as Prisma.PostWhereInput;

      const select = {
        public_id: true,
        title: true,
        content: true,
        sponsored: true,
        author_id: true,
        lat: true,
        lon: true,
        waypoint: {
          select: { 
            id: true, 
            lat: true, 
            lon: true,
            trips: {
              select: {
                trip: {
                  select: {
                    public_id: true,
                    title: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
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
            role: true,
            profile: {
              select: { name: true, picture: true },
            },
          },
        },
      } satisfies Prisma.PostSelect;

      // fetch results
      const results = await this.prisma.post.count({
        where,
      });
      const data = await this.prisma.post.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
      });

      // Filter out sponsored posts that the user doesn't have access to
      const filteredPosts = [];
      for (const post of data) {
        // If post is sponsored, check if user has access
        if (post.sponsored) {
          // Allow the post author to see their own sponsored posts
          if (userId && post.author_id === userId) {
            filteredPosts.push(post);
          }
          // For other users, check if they have an active sponsorship
          else if (userId && await this.hasActiveSponsorship(userId, post.author_id)) {
            filteredPosts.push(post);
          }
          // Otherwise, skip this sponsored post
        } else {
          // Non-sponsored posts are visible to everyone (subject to public visibility rules)
          filteredPosts.push(post);
        }
      }

      const response: IUserPostsQueryResponse = {
        data: filteredPosts.map(
          ({
            public_id: id,
            title,
            date,
            created_at,
            content,
            sponsored,
            place,
            lat,
            lon,
            waypoint,
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
            sponsored,
            place,
            lat,
            lon,
            waypoint: waypoint ? {
              id: waypoint.id,
              lat: waypoint.lat,
              lon: waypoint.lon,
            } : undefined,
            trip: waypoint?.trips?.[0]?.trip
              ? {
                  id: waypoint.trips[0].trip.public_id,
                  title: waypoint.trips[0].trip.title,
                }
              : undefined,
            author: author.profile
              ? {
                  name: author.profile?.name,
                  username: author?.username,
                  picture: author?.profile?.picture
                    ? getStaticMediaUrl(author?.profile.picture)
                    : '',
                  creator: author.role === UserRole.CREATOR,
                }
              : undefined,
            liked: userId ? likes.length > 0 : false,
            bookmarked: userId ? bookmarks.length > 0 : false,
            likesCount: likes_count,
            bookmarksCount: bookmarks_count,
            you: userId ? userId === author.id : false,
          }),
        ),
        results: filteredPosts.length,
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
              role: true,
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
        data: data.map(({ follower: { role, username, profile } }) => ({
          username,
          name: profile.name,
          picture: profile.picture ? getStaticMediaUrl(profile?.picture) : '',
          creator: role === UserRole.CREATOR,
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
              role: true,
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
        data: data.map(({ followee: { role, username, profile } }) => ({
          username,
          name: profile.name,
          picture: profile.picture ? getStaticMediaUrl(profile.picture) : '',
          creator: role === UserRole.CREATOR,
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
            event: EVENTS.NOTIFICATION_CREATE,
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

  async getSponsorshipTiers({
    username,
    available,
  }: {
    username: string;
    available?: boolean;
    userId: number;
  }): Promise<ISponsorshipTierGetAllResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('user not found');

      // check if the user exists
      const user = await this.prisma.user
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!user) throw new ServiceNotFoundException('user not found');

      // get sponsorship tiers
      const data = await this.prisma.sponsorshipTier.findMany({
        where: {
          user_id: user.id,
          is_available: typeof available === 'boolean' ? available : undefined,
          deleted_at: null,
        },
        select: {
          public_id: true,
          price: true,
          description: true,
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  name: true,
                  picture: true,
                  bio: true,
                },
              },
            },
          },
        },
        orderBy: [{ id: 'desc' }],
      });

      const response: ISponsorshipTierGetAllResponse = {
        results: data.length,
        data: data.map(({ public_id: id, price, description, user }) => ({
          id,
          description,
          price: integerToDecimal(price),
          creator: user
            ? {
                username: user.username,
                name: user.profile.name,
                picture: getStaticMediaUrl(user.profile.picture),
                bio: user.profile.bio,
              }
            : undefined,
        })),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorship tiers not found');
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

  /**
   * Check if a user has an active sponsorship with a creator
   */
  private async hasActiveSponsorship(userId: number, creatorId: number): Promise<boolean> {
    if (!userId) return false;
    
    const sponsorship = await this.prisma.sponsorship.findFirst({
      where: {
        user_id: userId,
        creator_id: creatorId,
        status: SponsorshipStatus.ACTIVE,
        expiry: {
          gt: new Date(), // expiry is in the future
        },
        deleted_at: null,
      },
    });

    return !!sponsorship;
  }

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
      } as Prisma.PostWhereInput;

      const select = {
        public_id: true,
        title: true,
        content: true,
        public: true,
        sponsored: true,
        author_id: true,
        lat: true,
        lon: true,
        waypoint: {
          select: { 
            id: true, 
            lat: true, 
            lon: true,
            trips: {
              select: {
                trip: {
                  select: {
                    public_id: true,
                    title: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
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
      } satisfies Prisma.PostSelect;

      // filter based on context
      switch (context) {
        case 'feed':
          where = {
            ...where,
            author: { id: userId },
          };
          break;
        case 'bookmarks':
          where = {
            ...where,
            bookmarks: {
              some: {
                user_id: userId,
              },
            },
            OR: [
              { public: true },
              { author: { id: userId } }
            ],
          };
          break;
        case 'drafts':
          where = {
            ...where,
            public: false,
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

      // Filter out sponsored posts that the user doesn't have access to
      const filteredPosts = [];
      for (const post of data) {
        // If post is sponsored, check if user has access
        if (post.sponsored) {
          // Allow the post author to see their own sponsored posts
          if (userId && post.author_id === userId) {
            filteredPosts.push(post);
          }
          // For other users, check if they have an active sponsorship
          else if (userId && await this.hasActiveSponsorship(userId, post.author_id)) {
            filteredPosts.push(post);
          }
          // Otherwise, skip this sponsored post
        } else {
          // Non-sponsored posts are visible to everyone (subject to public visibility rules)
          filteredPosts.push(post);
        }
      }

      const response: IUserPostsQueryResponse = {
        data: filteredPosts.map(
          ({
            public_id: id,
            title,
            date,
            created_at,
            content,
            public: isPublic,
            sponsored,
            place,
            lat,
            lon,
            author,
            waypoint,
            likes,
            likes_count,
            bookmarks,
            bookmarks_count,
          }) => ({
            id,
            title,
            date,
            content,
            public: isPublic,
            sponsored,
            place,
            lat,
            lon,
            waypoint: waypoint ? {
              id: waypoint.id,
              lat: waypoint.lat,
              lon: waypoint.lon,
            } : undefined,
            trip: waypoint?.trips?.[0]?.trip
              ? {
                  id: waypoint.trips[0].trip.public_id,
                  title: waypoint.trips[0].trip.title,
                }
              : undefined,
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
        results: filteredPosts.length,
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
    query,
    session,
  }: ISessionQuery<{
    context: 'profile' | 'billing';
  }>): Promise<IUserSettingsProfileGetResponse> {
    try {
      const { context } = query;
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      let response = {} as IUserSettingsProfileGetResponse;

      // fetch settings based on context
      switch (context) {
        case 'profile':
          response = await this.prisma.user
            .findFirstOrThrow({
              where: { id: userId },
              select: {
                email: true,
                username: true,
                is_email_verified: true,
                profile: {
                  select: {
                    name: true,
                    bio: true,
                    picture: true,
                    location_from: true,
                    location_lives: true,
                    sponsors_fund: true,
                    sponsors_fund_type: true,
                    sponsors_fund_journey_id: true,
                    portfolio: true,
                  },
                },
              },
            })
            .then(({ email, username, is_email_verified, profile }) => {
              return {
                email,
                username,
                isEmailVerified: is_email_verified,
                picture: profile?.picture
                  ? getStaticMediaUrl(profile?.picture)
                  : '',
                name: profile?.name,
                bio: profile?.bio,
                locationFrom: profile?.location_from,
                locationLives: profile?.location_lives,
                sponsorsFund: profile?.sponsors_fund,
                sponsorsFundType: profile?.sponsors_fund_type,
                sponsorsFundJourneyId: profile?.sponsors_fund_journey_id,
                portfolio: profile?.portfolio,
              } as IUserSettingsProfileGetResponse;
            });
        case 'billing':
          break;
        default:
          throw new ServiceBadRequestException('settings not found');
      }

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('settings not found');
      throw exception;
    }
  }

  async updateSettings({
    query,
    payload,
    session,
  }: ISessionQueryWithPayload<
    { context: 'profile' | 'billing' },
    IUserSettingsProfileUpdatePayload
  >): Promise<void> {
    try {
      const { context } = query;
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      const { name, bio, livesIn, from, sponsorsFund, sponsorsFundType, sponsorsFundJourneyId, portfolio } = payload;

      // update settings based on context
      switch (context) {
        case 'profile':
          await this.prisma.userProfile.update({
            where: { user_id: userId },
            data: { 
              name, 
              bio, 
              location_from: from, 
              location_lives: livesIn, 
              sponsors_fund: sponsorsFund,
              sponsors_fund_type: sponsorsFundType,
              sponsors_fund_journey_id: sponsorsFundJourneyId,
              portfolio,
            },
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
        : new ServiceForbiddenException('settings not updated');
      throw exception;
    }
  }

  async updatePicture({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, IUserPictureUploadPayload>): Promise<void> {
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
        query: {},
        payload: {
          file: payload.file,
          context: MediaUploadContext.USER,
          thumbnail: true,
          aspect: 'square',
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
          is_read: true,
          mention_post: {
            select: { public_id: true },
          },
          body: true,
          sponsorship_type: true,
          sponsorship_amount: true,
          sponsorship_currency: true,
          created_at: true,
        },
        take,
        skip,
        orderBy: [{ created_at: 'desc' }],
      });

      // Note: Notifications are not automatically marked as read when fetched
      // They should be marked as read when the user actually views them
      // this.prisma.userNotification
      //   .updateMany({
      //     where: { user_id: userId },
      //     data: { is_read: true },
      //   })
      //   .catch(() => {});

      const response: IUserNotificationGetResponse = {
        results,
        data: data.map(
          ({
            mention_user,
            context,
            mention_post,
            is_read,
            body,
            sponsorship_type,
            sponsorship_amount,
            sponsorship_currency,
            created_at,
          }) => ({
            context,
            body,
            read: is_read,
            mentionUser: {
              username: mention_user.username,
              name: mention_user.profile.name,
              picture: getStaticMediaUrl(mention_user.profile.picture),
            },
            postId: mention_post?.public_id,
            date: created_at,
            sponsorshipType: sponsorship_type,
            sponsorshipAmount: sponsorship_amount,
            sponsorshipCurrency: sponsorship_currency,
          }),
        ),
        page,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('notifications not found');
      throw exception;
    }
  }

  async getBadgeCount({
    session,
  }: IQueryWithSession): Promise<IBadgeCountGetResponse> {
    try {
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      const notifications = await this.prisma.userNotification.count({
        where: { user_id: userId, is_read: false },
      });

      const response: IBadgeCountGetResponse = { notifications };
      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('badge count not found');
      throw exception;
    }
  }

  async markNotificationsAsRead({
    session,
  }: IQueryWithSession): Promise<void> {
    try {
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // Mark all unread notifications as read for this user
      await this.prisma.userNotification.updateMany({
        where: { 
          user_id: userId, 
          is_read: false 
        },
        data: { 
          is_read: true 
        },
      });

      this.logger.log(`Marked notifications as read for user ${userId}`);
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('failed to mark notifications as read');
      throw exception;
    }
  }

  async getSponsorshipByUsername({
    session,
  }: ISessionQuery): Promise<ISponsorshipTierGetAllResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      const where: Prisma.SponsorshipTierWhereInput = {
        user_id: userId,
        deleted_at: null,
      };

      // get the sponsorship tiers
      const results = await this.prisma.sponsorshipTier.count({ where });
      const data = await this.prisma.sponsorshipTier
        .findMany({
          where,
          select: {
            public_id: true,
            price: true,
            description: true,
            is_available: true,
            user: {
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
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship tiers not found');
        });

      const response = {
        data: data.map(
          ({ price, description, public_id: id, is_available, user }) => ({
            price: integerToDecimal(price),
            description,
            id,
            isAvailable: is_available,
            membersCount: 0,
            creator: user
              ? {
                  username: user.username,
                  name: user.profile.name,
                  picture: user.profile.picture,
                  bio: '',
                }
              : undefined,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('sponsorship tiers not found');
      throw exception;
    }
  }

  async getPostInsights({
    session,
  }: ISessionQuery): Promise<IPostInsightsGetResponse> {
    try {
      const { userId } = session;

      if (!userId) throw new ServiceForbiddenException();

      // get post data
      const posts = await this.prisma.post.findMany({
        where: {
          author_id: userId,
          deleted_at: null,
        },
        select: {
          public_id: true,
          title: true,
          likes_count: true,
          bookmarks_count: true,
          created_at: true,
        },
      });

      const response: IPostInsightsGetResponse = {
        posts: posts.map(
          ({ public_id, title, likes_count, bookmarks_count, created_at }) => ({
            id: public_id,
            title,
            likesCount: likes_count,
            bookmarksCount: bookmarks_count,
            impressionsCount: 0,
            createdAt: created_at,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException();
      throw exception;
    }
  }
}
