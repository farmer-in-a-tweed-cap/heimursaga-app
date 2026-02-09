import { IUserNotificationCreatePayload } from '../notification';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IBadgeCountGetResponse,
  IExplorerBookmarkResponse,
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
  ServiceInternalException,
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
export class ExplorerService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  /**
   * Check if an explorer has an active sponsorship with a creator
   */
  private async hasActiveSponsorship(
    explorerId: number,
    creatorId: number,
  ): Promise<boolean> {
    if (!explorerId) return false;

    const sponsorship = await this.prisma.sponsorship.findFirst({
      where: {
        sponsor_id: explorerId,
        sponsored_explorer_id: creatorId,
        status: SponsorshipStatus.ACTIVE,
        expiry: {
          gt: new Date(), // expiry is in the future
        },
        deleted_at: null,
      },
    });

    return !!sponsorship;
  }

  async getExplorers({
    query,
    session,
  }: ISessionQuery): Promise<IUserGetAllResponse> {
    try {
      const { explorerId, explorerRole } = session;

      // Admin gets all explorers, public/users get only non-blocked explorers
      const isAdmin =
        !!explorerId && matchRoles(explorerRole, [UserRole.ADMIN]);

      const where: Prisma.ExplorerWhereInput = isAdmin
        ? {}
        : { blocked: false };

      const select = {
        id: true,
        username: true,
        blocked: true,
        role: true,
        profile: {
          select: {
            name: true,
            picture: true,
            bio: true,
            location_from: true,
            location_lives: true,
            location_from_lat: true,
            location_from_lon: true,
            location_lives_lat: true,
            location_lives_lon: true,
          },
        },
        // Check if current user follows this explorer
        followers: explorerId
          ? {
              where: { follower_id: explorerId },
              select: { follower_id: true },
            }
          : undefined,
        // Get expeditions for status calculation
        expeditions: {
          where: { deleted_at: null },
          select: {
            public_id: true,
            title: true,
            status: true,
            start_date: true,
          },
          orderBy: { id: 'desc' as const },
          take: 5, // Only need recent expeditions for status
        },
        entries_count: true,
        created_at: true,
      } satisfies Prisma.ExplorerSelect;

      // get explorers
      const results = await this.prisma.explorer.count({ where });
      const data = await this.prisma.explorer.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
        take: 100, // Limit for public access
      });

      const response: IUserGetAllResponse = {
        data: data.map(
          ({
            id,
            username,
            role,
            profile,
            blocked,
            entries_count,
            created_at,
            followers,
            expeditions,
          }) => ({
            username,
            role,
            blocked,
            name: profile?.name,
            picture: getStaticMediaUrl(profile?.picture),
            bio: profile?.bio,
            locationFrom: profile?.location_from,
            locationLives: profile?.location_lives,
            locationFromLat: profile?.location_from_lat,
            locationFromLon: profile?.location_from_lon,
            locationLivesLat: profile?.location_lives_lat,
            locationLivesLon: profile?.location_lives_lon,
            entriesCount: entries_count,
            postsCount: entries_count,
            memberDate: created_at,
            creator: role === UserRole.CREATOR,
            // Include followed status for authenticated users (exclude self)
            followed:
              explorerId && id !== explorerId
                ? (followers?.length || 0) > 0
                : undefined,
            // Include expedition data for status calculation
            recentExpeditions: expeditions?.map((exp) => ({
              id: exp.public_id,
              title: exp.title,
              status: exp.status,
              daysActive:
                exp.status === 'active' && exp.start_date
                  ? Math.floor(
                      (Date.now() - new Date(exp.start_date).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : undefined,
            })),
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getByUsername({
    query,
    session,
  }: ISessionQuery<{ username: string }>): Promise<IUserGetByUsernameResponse> {
    try {
      const { username } = query;
      const { explorerId, explorerRole } = session;

      if (!username) throw new ServiceNotFoundException('explorer not found');

      let where = { username } as Prisma.ExplorerWhereInput;

      // filter based on explorer role
      switch (explorerRole) {
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

      // get the explorer
      const explorer = await this.prisma.explorer.findFirstOrThrow({
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
              cover_photo: true,
              bio: true,
              location_from: true,
              location_lives: true,
              sponsors_fund: true,
              sponsors_fund_type: true,
              sponsors_fund_expedition_id: true,
              portfolio: true,
              website: true,
              twitter: true,
              instagram: true,
              youtube: true,
              equipment: true,
            },
          },
          followers: explorerId
            ? {
                where: { follower_id: explorerId },
                select: { follower_id: true },
              }
            : undefined,
          explorer_bookmarks_received: explorerId
            ? {
                where: { explorer_id: explorerId },
                select: { explorer_id: true },
              }
            : undefined,
          created_at: true,
        },
      });

      const response = {
        username: explorer.username,
        picture: explorer.profile.picture
          ? getStaticMediaUrl(explorer.profile.picture)
          : '',
        coverPhoto: explorer.profile?.cover_photo
          ? getStaticMediaUrl(explorer.profile.cover_photo)
          : '',
        bio: explorer.profile?.bio,
        name: explorer.profile?.name,
        memberDate: explorer.created_at,
        followed: explorerId ? explorer.followers.length > 0 : false,
        bookmarked: explorerId
          ? explorer.explorer_bookmarks_received.length > 0
          : false,
        you: explorerId ? explorerId === explorer.id : false,
        creator: explorer.role === UserRole.CREATOR,
        stripeAccountConnected: explorer.is_stripe_account_connected,
        locationFrom: explorer.profile?.location_from,
        locationLives: explorer.profile?.location_lives,
        sponsorsFund: explorer.profile?.sponsors_fund,
        sponsorsFundType: explorer.profile?.sponsors_fund_type,
        sponsorsFundExpeditionId: explorer.profile?.sponsors_fund_expedition_id,
        portfolio: explorer.profile?.portfolio,
        website: explorer.profile?.website,
        twitter: explorer.profile?.twitter,
        instagram: explorer.profile?.instagram,
        youtube: explorer.profile?.youtube,
        equipment: (explorer.profile?.equipment as string[]) || [],
      } as IUserGetByUsernameResponse;

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async blockExplorer({
    query,
    session,
  }: ISessionQuery<{ username: string }>): Promise<void> {
    try {
      const { username } = query;
      const { explorerId, explorerRole } = session;

      if (!username) throw new ServiceNotFoundException('explorer not found');

      // check access
      const access = !!explorerId && matchRoles(explorerRole, [UserRole.ADMIN]);
      if (!access) throw new ServiceForbiddenException();

      // get the explorer
      const explorer = await this.prisma.explorer.findFirstOrThrow({
        where: { username },
        select: { id: true },
      });

      // update the explorer
      await this.prisma.explorer.update({
        where: { id: explorer.id },
        data: { blocked: true },
      });

      // invalidate sessions
      await this.prisma.explorerSession.updateMany({
        where: { explorer_id: explorer.id },
        data: { expired: true, expires_at: dateformat().toDate() },
      });

      // delete entries
      await this.prisma.entry.updateMany({
        where: { author_id: explorer.id },
        data: { deleted_at: dateformat().toDate() },
      });

      // delete expeditions
      await this.prisma.expedition.updateMany({
        where: { author_id: explorer.id },
        data: { deleted_at: dateformat().toDate() },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getEntries({
    username,
    explorerId,
  }: {
    username: string;
    explorerId: number;
  }) {
    try {
      if (!username) throw new ServiceNotFoundException('explorer not found');

      const where = {
        public: true,
        deleted_at: null,
        is_draft: false,
        author: { username },
        // Entries store coordinates directly
        lat: { not: null },
        lon: { not: null },
      } as Prisma.EntryWhereInput;

      const select = {
        public_id: true,
        title: true,
        content: true,
        sponsored: true,
        author_id: true,
        lat: true,
        lon: true,
        country_code: true,
        // Direct expedition link (new way)
        expedition: {
          select: {
            public_id: true,
            title: true,
          },
        },
        // Waypoint-based expedition link (legacy)
        waypoint: {
          select: {
            id: true,
            lat: true,
            lon: true,
            expeditions: {
              select: {
                expedition: {
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
        // Count media items
        _count: {
          select: {
            media: true,
          },
        },
        // Cover photo
        cover_upload: {
          select: {
            original: true,
            thumbnail: true,
          },
        },
        // First media item as fallback for cover
        media: {
          select: {
            upload: {
              select: {
                original: true,
                thumbnail: true,
              },
            },
          },
          take: 1,
        },
        likes: explorerId
          ? {
              where: { explorer_id: explorerId },
              select: { entry_id: true },
            }
          : undefined,
        bookmarks: explorerId
          ? {
              where: { explorer_id: explorerId },
              select: { entry_id: true },
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
      } satisfies Prisma.EntrySelect;

      // fetch results
      const results = await this.prisma.entry.count({
        where,
      });
      const data = await this.prisma.entry.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
      });

      // Filter out sponsored entries that the explorer doesn't have access to
      const filteredEntries = [];
      for (const entry of data) {
        // If entry is sponsored, check if explorer has access
        if (entry.sponsored) {
          // Allow the entry author to see their own sponsored entries
          if (explorerId && entry.author_id === explorerId) {
            filteredEntries.push(entry);
          }
          // For other explorers, check if they have an active sponsorship
          else if (
            explorerId &&
            (await this.hasActiveSponsorship(explorerId, entry.author_id))
          ) {
            filteredEntries.push(entry);
          }
          // Otherwise, skip this sponsored entry
        } else {
          // Non-sponsored entries are visible to everyone (subject to public visibility rules)
          filteredEntries.push(entry);
        }
      }

      const response: IUserPostsQueryResponse = {
        data: filteredEntries.map(
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
            country_code,
            expedition: directExpedition,
            waypoint,
            author,
            likes,
            likes_count,
            bookmarks,
            bookmarks_count,
            _count,
            cover_upload,
            media,
          }) => {
            // Prefer direct expedition link, fall back to waypoint-based
            const expeditionData =
              directExpedition || waypoint?.expeditions?.[0]?.expedition;

            // Calculate word count from content
            const wordCount = content
              ? content
                  .trim()
                  .split(/\s+/)
                  .filter((w) => w.length > 0).length
              : 0;

            // Get cover image: use cover_upload if set, otherwise fallback to first media
            const coverImage = cover_upload?.original
              ? getStaticMediaUrl(cover_upload.original)
              : media?.[0]?.upload?.original
                ? getStaticMediaUrl(media[0].upload.original)
                : undefined;

            return {
              id,
              title,
              date,
              content,
              sponsored,
              place,
              lat,
              lon,
              countryCode: country_code,
              mediaCount: _count?.media || 0,
              wordCount,
              coverImage,
              waypoint: waypoint
                ? {
                    id: waypoint.id,
                    lat: waypoint.lat,
                    lon: waypoint.lon,
                  }
                : undefined,
              expedition: expeditionData
                ? {
                    id: expeditionData.public_id,
                    title: expeditionData.title,
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
              liked: explorerId ? likes.length > 0 : false,
              bookmarked: explorerId ? bookmarks.length > 0 : false,
              likesCount: likes_count,
              bookmarksCount: bookmarks_count,
              you: explorerId ? explorerId === author.id : false,
            };
          },
        ),
        results: filteredEntries.length,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getMap({
    username,
  }: {
    username: string;
  }): Promise<IUserMapGetResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('explorer not found');

      // get explorer entries
      const entries = await this.prisma.entry.findMany({
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
        lastWaypoint: { lat: entries[0].lat, lon: entries[0].lon },
        geojson: toGeoJson<{ id: string; title: string }>(
          'collection',
          entries.map(({ public_id, title, lat, lon }) => ({
            lat,
            lon,
            properties: { id: public_id, title },
          })),
        ),
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getFollowers({
    username,
    explorerId,
  }: {
    username: string;
    explorerId: number;
  }): Promise<IUserFollowersQueryResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('explorer not found');

      // check if the explorer exists (this is the profile owner)
      const explorer = await this.prisma.explorer
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!explorer) throw new ServiceNotFoundException('explorer not found');

      const where = {
        followee_id: explorer.id,
      } as Prisma.ExplorerFollowWhereInput;

      const results = await this.prisma.explorerFollow.count({
        where,
      });
      const data = await this.prisma.explorerFollow.findMany({
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
                  bio: true,
                },
              },
              // Check if this follower is ALSO followed BY the profile owner (mutual)
              // i.e., does the profile owner (explorer.id) follow this follower?
              followers: {
                where: { follower_id: explorer.id },
                select: { follower_id: true },
              },
            },
          },
        },
        orderBy: [{ id: 'desc' }],
      });

      const response: IUserFollowersQueryResponse = {
        data: data.map(
          ({ follower: { role, username, profile, followers } }) => ({
            username,
            name: profile.name,
            picture: profile.picture ? getStaticMediaUrl(profile?.picture) : '',
            bio: profile.bio,
            creator: role === UserRole.CREATOR,
            // Mutual = profile owner follows this follower back
            followed: (followers?.length || 0) > 0,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getFollowing({
    username,
    explorerId,
  }: {
    username: string;
    explorerId: number;
  }): Promise<IUserFollowingQueryResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('explorer not found');

      // check if the explorer exists (this is the profile owner)
      const explorer = await this.prisma.explorer
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!explorer) throw new ServiceNotFoundException('explorer not found');

      const where = {
        follower_id: explorer.id,
      } as Prisma.ExplorerFollowWhereInput;

      const results = await this.prisma.explorerFollow.count({
        where,
      });
      const data = await this.prisma.explorerFollow.findMany({
        where,
        select: {
          followee: {
            select: {
              id: true,
              username: true,
              role: true,
              profile: {
                select: {
                  name: true,
                  picture: true,
                  bio: true,
                },
              },
              // Check if this followee ALSO follows the profile owner back (mutual)
              // i.e., does this followee follow the profile owner (explorer.id)?
              following: {
                where: { followee_id: explorer.id },
                select: { followee_id: true },
              },
            },
          },
        },
        orderBy: [{ id: 'desc' }],
      });

      const response: IUserFollowingQueryResponse = {
        data: data.map(
          ({ followee: { role, username, profile, following } }) => ({
            username,
            name: profile.name,
            picture: profile.picture ? getStaticMediaUrl(profile.picture) : '',
            bio: profile.bio,
            creator: role === UserRole.CREATOR,
            // Mutual = this followee also follows the profile owner back
            followed: (following?.length || 0) > 0,
          }),
        ),
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async follow({
    username,
    explorerId,
  }: {
    username: string;
    explorerId: number;
  }): Promise<void> {
    try {
      if (!username) throw new ServiceNotFoundException('explorer not found');
      if (!explorerId)
        throw new ServiceBadRequestException('explorer is not followed');

      // check if the explorer exists
      const explorer = await this.prisma.explorer
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!explorer) throw new ServiceNotFoundException('explorer not found');

      const followerId = explorerId;
      const followeeId = explorer.id;

      if (!followerId || !followeeId)
        throw new ServiceBadRequestException('explorer is not followed');

      // wrap in transaction to prevent race conditions on count fields
      await this.prisma.$transaction(async (tx) => {
        // check if the explorer is followed already
        const followed = await tx.explorerFollow
          .findFirstOrThrow({
            where: {
              followee_id: followeeId,
              follower_id: followerId,
            },
          })
          .then(() => true)
          .catch(() => false);
        if (followed)
          throw new ServiceBadRequestException('explorer is already followed');

        // create a follow
        await tx.explorerFollow.create({
          data: {
            follower_id: followerId,
            followee_id: followeeId,
          },
        });

        // update the explorer follower count
        await tx.explorer.update({
          where: { id: followeeId },
          data: {
            followers_count: { increment: 1 },
          },
        });

        // update the explorer following count
        await tx.explorer.update({
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async unfollow({
    username,
    explorerId,
  }: {
    username: string;
    explorerId: number;
  }): Promise<void> {
    try {
      if (!username) throw new ServiceNotFoundException('explorer not found');
      if (!explorerId)
        throw new ServiceBadRequestException('explorer is not unfollowed');

      // check if the explorer exists
      const explorer = await this.prisma.explorer
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!explorer) throw new ServiceNotFoundException('explorer not found');

      const followerId = explorerId;
      const followeeId = explorer.id;

      if (!followerId || !followeeId)
        throw new ServiceBadRequestException('explorer is not unfollowed');

      // wrap in transaction to prevent race conditions on count fields
      await this.prisma.$transaction(async (tx) => {
        // check if the explorer is followed already
        const followed = await tx.explorerFollow
          .findFirstOrThrow({
            where: {
              followee_id: followeeId,
              follower_id: followerId,
            },
          })
          .then(() => true)
          .catch(() => false);
        if (!followed)
          throw new ServiceBadRequestException('explorer is not followed');

        // delete the follow
        await tx.explorerFollow.deleteMany({
          where: {
            follower_id: followerId,
            followee_id: followeeId,
          },
        });

        // update the explorer follower count
        await tx.explorer.update({
          where: { id: followeeId },
          data: {
            followers_count: { decrement: 1 },
          },
        });

        // update the explorer following count
        await tx.explorer.update({
          where: { id: followerId },
          data: {
            following_count: { decrement: 1 },
          },
        });
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getSponsorshipTiers({
    username,
    available,
  }: {
    username: string;
    available?: boolean;
    explorerId: number;
  }): Promise<ISponsorshipTierGetAllResponse> {
    try {
      if (!username) throw new ServiceNotFoundException('explorer not found');

      // check if the explorer exists
      const explorer = await this.prisma.explorer
        .findFirstOrThrow({ where: { username }, select: { id: true } })
        .catch(() => null);
      if (!explorer) throw new ServiceNotFoundException('explorer not found');

      // get sponsorship tiers
      const data = await this.prisma.sponsorshipTier.findMany({
        where: {
          explorer_id: explorer.id,
          is_available: typeof available === 'boolean' ? available : undefined,
          deleted_at: null,
        },
        select: {
          public_id: true,
          type: true,
          price: true,
          description: true,
          priority: true,
          is_available: true,
          explorer: {
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
        orderBy: [{ type: 'asc' }, { priority: 'asc' }, { price: 'asc' }],
      });

      const response: ISponsorshipTierGetAllResponse = {
        results: data.length,
        data: data.map(
          ({
            public_id: id,
            type,
            price,
            description,
            priority,
            is_available,
            explorer,
          }) => ({
            id,
            type: type as 'ONE_TIME' | 'MONTHLY',
            description,
            price: integerToDecimal(price),
            priority,
            isAvailable: is_available,
            creator: explorer
              ? {
                  username: explorer.username,
                  name: explorer.profile.name,
                  picture: getStaticMediaUrl(explorer.profile.picture),
                  bio: explorer.profile.bio,
                }
              : undefined,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async bookmarkExplorer({
    query,
    session,
  }: ISessionQuery<{ username: string }>): Promise<IExplorerBookmarkResponse> {
    try {
      const { username } = query;
      const { explorerId } = session;

      if (!username || !explorerId)
        throw new ServiceNotFoundException('explorer not found');

      // check if the explorer to bookmark exists
      const explorerToBookmark = await this.prisma.explorer
        .findFirstOrThrow({
          where: { username, blocked: false },
          select: {
            id: true,
          },
        })
        .catch(() => null);

      if (!explorerToBookmark)
        throw new ServiceNotFoundException('explorer not found');

      // can't bookmark yourself
      if (explorerToBookmark.id === explorerId) {
        throw new ServiceBadRequestException('cannot bookmark yourself');
      }

      // wrap in transaction to prevent race conditions on count fields
      const bookmarked = await this.prisma.$transaction(async (tx) => {
        // check if it is bookmarked already
        const existing = await tx.explorerBookmark.findUnique({
          where: {
            bookmarked_explorer_id_explorer_id: {
              bookmarked_explorer_id: explorerToBookmark.id,
              explorer_id: explorerId,
            },
          },
        });

        if (existing) {
          // delete the bookmark
          await tx.explorerBookmark.delete({
            where: {
              bookmarked_explorer_id_explorer_id: {
                bookmarked_explorer_id: explorerToBookmark.id,
                explorer_id: explorerId,
              },
            },
          });
        } else {
          // create a bookmark
          await tx.explorerBookmark.create({
            data: {
              bookmarked_explorer_id: explorerToBookmark.id,
              explorer_id: explorerId,
            },
          });
        }

        // update the session explorer's bookmark count
        await tx.explorer.update({
          where: { id: explorerId },
          data: {
            bookmarks_count: existing ? { decrement: 1 } : { increment: 1 },
          },
        });

        return existing;
      });

      const response: IExplorerBookmarkResponse = {
        bookmarked: !bookmarked,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}

@Injectable()
export class SessionExplorerService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * Check if an explorer has an active sponsorship with a creator
   */
  private async hasActiveSponsorship(
    explorerId: number,
    creatorId: number,
  ): Promise<boolean> {
    if (!explorerId) return false;

    const sponsorship = await this.prisma.sponsorship.findFirst({
      where: {
        sponsor_id: explorerId,
        sponsored_explorer_id: creatorId,
        status: SponsorshipStatus.ACTIVE,
        expiry: {
          gt: new Date(), // expiry is in the future
        },
        deleted_at: null,
      },
    });

    return !!sponsorship;
  }

  async getEntries({
    explorerId,
    context,
  }: {
    explorerId: number;
    context: 'feed' | 'bookmarks' | 'drafts';
  }) {
    try {
      if (!explorerId) throw new ServiceForbiddenException();

      let where = {
        deleted_at: null,
      } as Prisma.EntryWhereInput;

      const select = {
        public_id: true,
        title: true,
        content: true,
        public: true,
        sponsored: true,
        is_draft: true,
        author_id: true,
        lat: true,
        lon: true,
        waypoint: {
          select: {
            id: true,
            lat: true,
            lon: true,
            expeditions: {
              select: {
                expedition: {
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
        likes: explorerId
          ? {
              where: { explorer_id: explorerId },
              select: { entry_id: true },
            }
          : undefined,
        bookmarks: explorerId
          ? {
              where: { explorer_id: explorerId },
              select: { entry_id: true },
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
      } satisfies Prisma.EntrySelect;

      // filter based on context
      switch (context) {
        case 'feed':
          where = {
            ...where,
            author: { id: explorerId },
            is_draft: false, // Exclude drafts from explorer's feed/profile view
          };
          break;
        case 'bookmarks':
          where = {
            ...where,
            bookmarks: {
              some: {
                explorer_id: explorerId,
              },
            },
            OR: [{ public: true }, { author: { id: explorerId } }],
          };
          break;
        case 'drafts':
          where = {
            ...where,
            is_draft: true,
            author: { id: explorerId },
          };
          break;
      }

      // fetch results
      const results = await this.prisma.entry.count({
        where,
      });
      const data = await this.prisma.entry.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
      });

      // Filter out sponsored entries that the explorer doesn't have access to
      const filteredEntries = [];
      for (const entry of data) {
        // If entry is sponsored, check if explorer has access
        if (entry.sponsored) {
          // Allow the entry author to see their own sponsored entries
          if (explorerId && entry.author_id === explorerId) {
            filteredEntries.push(entry);
          }
          // For other explorers, check if they have an active sponsorship
          else if (
            explorerId &&
            (await this.hasActiveSponsorship(explorerId, entry.author_id))
          ) {
            filteredEntries.push(entry);
          }
          // Otherwise, skip this sponsored entry
        } else {
          // Non-sponsored entries are visible to everyone (subject to public visibility rules)
          filteredEntries.push(entry);
        }
      }

      const response: IUserPostsQueryResponse = {
        data: filteredEntries.map(
          ({
            public_id: id,
            title,
            date,
            created_at,
            content,
            public: isPublic,
            sponsored,
            is_draft,
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
            isDraft: is_draft,
            place,
            lat,
            lon,
            waypoint: waypoint
              ? {
                  id: waypoint.id,
                  lat: waypoint.lat,
                  lon: waypoint.lon,
                }
              : undefined,
            expedition: waypoint?.expeditions?.[0]?.expedition
              ? {
                  id: waypoint.expeditions[0].expedition.public_id,
                  title: waypoint.expeditions[0].expedition.title,
                }
              : undefined,
            author: {
              name: author.profile?.name,
              username: author?.username,
              picture: author?.profile?.picture
                ? getStaticMediaUrl(author?.profile?.picture)
                : '',
            },
            liked: explorerId ? likes.length > 0 : false,
            bookmarked: explorerId ? bookmarks.length > 0 : false,
            likesCount: likes_count,
            bookmarksCount: bookmarks_count,
          }),
        ),
        results: filteredEntries.length,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getBookmarkedExpeditions({ explorerId }: { explorerId: number }) {
    try {
      if (!explorerId) throw new ServiceForbiddenException();

      const bookmarks = await this.prisma.expeditionBookmark.findMany({
        where: { explorer_id: explorerId },
        include: {
          expedition: {
            select: {
              id: true,
              public_id: true,
              title: true,
              description: true,
              status: true,
              start_date: true,
              end_date: true,
              cover_image: true,
              goal: true,
              raised: true,
              sponsors_count: true,
              entries_count: true,
              bookmarks_count: true,
              author: {
                select: {
                  username: true,
                  profile: { select: { name: true, picture: true } },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return {
        data: bookmarks.map((bookmark) => ({
          id: bookmark.expedition.public_id,
          title: bookmark.expedition.title,
          description: bookmark.expedition.description,
          status: bookmark.expedition.status,
          startDate: bookmark.expedition.start_date?.toISOString(),
          endDate: bookmark.expedition.end_date?.toISOString(),
          coverPhoto: bookmark.expedition.cover_image
            ? getStaticMediaUrl(bookmark.expedition.cover_image)
            : undefined,
          goal: bookmark.expedition.goal,
          raised: bookmark.expedition.raised,
          sponsorsCount: bookmark.expedition.sponsors_count,
          entriesCount: bookmark.expedition.entries_count,
          bookmarksCount: bookmark.expedition.bookmarks_count,
          explorer: {
            username: bookmark.expedition.author.username,
            name: bookmark.expedition.author.profile?.name,
            picture: bookmark.expedition.author.profile?.picture
              ? getStaticMediaUrl(bookmark.expedition.author.profile.picture)
              : undefined,
          },
          bookmarkedAt: bookmark.created_at?.toISOString(),
        })),
        results: bookmarks.length,
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getBookmarkedExplorers({ explorerId }: { explorerId: number }) {
    try {
      if (!explorerId) throw new ServiceForbiddenException();

      const bookmarks = await this.prisma.explorerBookmark.findMany({
        where: { explorer_id: explorerId },
        include: {
          bookmarked_explorer: {
            select: {
              id: true,
              username: true,
              is_premium: true,
              profile: {
                select: {
                  name: true,
                  bio: true,
                  picture: true,
                  location_from: true,
                  location_lives: true,
                },
              },
              _count: {
                select: {
                  entries: { where: { deleted_at: null, is_draft: false } },
                  expeditions: { where: { deleted_at: null } },
                  followers: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return {
        data: bookmarks.map(({ bookmarked_explorer, created_at }) => ({
          username: bookmarked_explorer.username,
          name: bookmarked_explorer.profile?.name,
          bio: bookmarked_explorer.profile?.bio,
          picture: bookmarked_explorer.profile?.picture
            ? getStaticMediaUrl(bookmarked_explorer.profile.picture)
            : undefined,
          locationFrom: bookmarked_explorer.profile?.location_from,
          locationLives: bookmarked_explorer.profile?.location_lives,
          isPremium: bookmarked_explorer.is_premium,
          entriesCount: bookmarked_explorer._count.entries,
          expeditionsCount: bookmarked_explorer._count.expeditions,
          followersCount: bookmarked_explorer._count.followers,
          bookmarkedAt: created_at?.toISOString(),
        })),
        results: bookmarks.length,
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
      const { explorerId } = session;

      // check access
      const access = !!explorerId;
      if (!access) throw new ServiceForbiddenException();

      let response = {} as IUserSettingsProfileGetResponse;

      this.logger.log(
        `Getting settings for explorer ${explorerId}, context: ${context}`,
      );

      // fetch settings based on context
      switch (context) {
        case 'profile':
          response = await this.prisma.explorer
            .findFirstOrThrow({
              where: { id: explorerId },
              select: {
                email: true,
                username: true,
                is_email_verified: true,
                profile: {
                  select: {
                    name: true,
                    bio: true,
                    picture: true,
                    cover_photo: true,
                    location_from: true,
                    location_lives: true,
                    sponsors_fund: true,
                    sponsors_fund_type: true,
                    sponsors_fund_expedition_id: true,
                    portfolio: true,
                    website: true,
                    twitter: true,
                    instagram: true,
                    youtube: true,
                    equipment: true,
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
                coverPhoto: profile?.cover_photo
                  ? getStaticMediaUrl(profile?.cover_photo)
                  : '',
                name: profile?.name,
                bio: profile?.bio,
                from: profile?.location_from,
                livesIn: profile?.location_lives,
                locationFrom: profile?.location_from,
                locationLives: profile?.location_lives,
                sponsorsFund: profile?.sponsors_fund,
                sponsorsFundType: profile?.sponsors_fund_type,
                sponsorsFundExpeditionId: profile?.sponsors_fund_expedition_id,
                portfolio: profile?.portfolio,
                website: profile?.website,
                twitter: profile?.twitter,
                instagram: profile?.instagram,
                youtube: profile?.youtube,
                equipment: (profile?.equipment as string[]) || [],
              } as IUserSettingsProfileGetResponse;
            });
          this.logger.log(
            `Profile settings response: ${JSON.stringify(response)}`,
          );
          break;
        case 'billing':
          break;
        default:
          throw new ServiceBadRequestException('settings not found');
      }

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
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
      const { explorerId } = session;

      // check access
      const access = !!explorerId;
      if (!access) throw new ServiceForbiddenException();

      const {
        name,
        bio,
        livesIn,
        from,
        sponsorsFund,
        sponsorsFundType,
        sponsorsFundJourneyId,
        portfolio,
        website,
        twitter,
        instagram,
        youtube,
        equipment,
      } = payload as any;

      this.logger.log(`Updating profile for explorer ${explorerId}`);
      this.logger.log(`Raw payload: ${JSON.stringify(payload)}`);
      this.logger.log(
        `Extracted fields - bio: "${bio}", from: "${from}", livesIn: "${livesIn}", website: "${website}", twitter: "${twitter}", instagram: "${instagram}", youtube: "${youtube}"`,
      );
      this.logger.log(`Context: ${context}`);

      // update settings based on context
      switch (context) {
        case 'profile':
          const updateData = {
            ...(name !== undefined && { name }),
            ...(bio !== undefined && { bio }),
            ...(from !== undefined && { location_from: from }),
            ...(livesIn !== undefined && { location_lives: livesIn }),
            ...(sponsorsFund !== undefined && { sponsors_fund: sponsorsFund }),
            ...(sponsorsFundType !== undefined && {
              sponsors_fund_type: sponsorsFundType,
            }),
            ...(sponsorsFundJourneyId !== undefined && {
              sponsors_fund_expedition_id: sponsorsFundJourneyId,
            }),
            ...(portfolio !== undefined && { portfolio }),
            ...(website !== undefined && { website }),
            ...(twitter !== undefined && { twitter }),
            ...(instagram !== undefined && { instagram }),
            ...(youtube !== undefined && { youtube }),
            ...(equipment !== undefined && { equipment }),
          };

          this.logger.log(
            `Profile update data for explorer ${explorerId}:`,
            JSON.stringify(updateData),
          );

          // Use upsert to create profile if it doesn't exist
          const result = await this.prisma.explorerProfile.upsert({
            where: { explorer_id: explorerId },
            update: updateData,
            create: {
              explorer_id: explorerId,
              picture: '',
              ...updateData,
            },
          });

          this.logger.log(
            `Profile updated successfully for explorer ${explorerId}:`,
            JSON.stringify(result),
          );
          break;
        case 'billing':
          break;
        default:
          throw new ServiceBadRequestException('settings not updated');
      }
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async updatePicture({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, IUserPictureUploadPayload>): Promise<void> {
    try {
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      // get explorer
      const explorer = await this.prisma.explorer
        .findFirstOrThrow({
          where: { id: explorerId },
          select: { username: true },
        })
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

      // update explorer profile
      await this.prisma.explorerProfile.update({
        where: { explorer_id: explorerId },
        data: { picture: thumbnail },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async updateCoverPhoto({
    payload,
    session,
  }: ISessionQueryWithPayload<{}, IUserPictureUploadPayload>): Promise<void> {
    try {
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      // get explorer
      const explorer = await this.prisma.explorer
        .findFirstOrThrow({
          where: { id: explorerId },
          select: { username: true },
        })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // upload cover photo
      const { thumbnail } = await this.uploadService.upload({
        query: {},
        payload: {
          file: payload.file,
          context: MediaUploadContext.USER,
          thumbnail: true,
          aspect: 'auto',
        },
        session,
      });

      // update explorer profile
      await this.prisma.explorerProfile.update({
        where: { explorer_id: explorerId },
        data: { cover_photo: thumbnail },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getNotifications({
    session,
  }: IQueryWithSession): Promise<IUserNotificationGetResponse> {
    try {
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      const where: Prisma.ExplorerNotificationWhereInput = {
        explorer_id: explorerId,
      };
      const page = 1;
      const take = 25;
      const skip = page <= 1 ? 0 : take * page;

      // get the notifications
      const results = await this.prisma.explorerNotification.count({ where });
      const data = await this.prisma.explorerNotification.findMany({
        where,
        select: {
          context: true,
          mention_explorer: {
            select: {
              username: true,
              profile: { select: { picture: true, name: true } },
            },
          },
          is_read: true,
          mention_entry: {
            select: { public_id: true, title: true },
          },
          body: true,
          sponsorship_type: true,
          sponsorship_amount: true,
          sponsorship_currency: true,
          passport_country_code: true,
          passport_country_name: true,
          passport_continent_code: true,
          passport_continent_name: true,
          passport_stamp_id: true,
          passport_stamp_name: true,
          created_at: true,
        },
        take,
        skip,
        orderBy: [{ created_at: 'desc' }],
      });

      const response: IUserNotificationGetResponse = {
        results,
        data: data.map(
          ({
            mention_explorer,
            context,
            mention_entry,
            is_read,
            body,
            sponsorship_type,
            sponsorship_amount,
            sponsorship_currency,
            passport_country_code,
            passport_country_name,
            passport_continent_code,
            passport_continent_name,
            passport_stamp_id,
            passport_stamp_name,
            created_at,
          }) => ({
            context,
            body,
            read: is_read,
            mentionUser: mention_explorer
              ? {
                  username: mention_explorer.username,
                  name: mention_explorer.profile?.name,
                  picture: getStaticMediaUrl(mention_explorer.profile?.picture),
                }
              : undefined,
            postId: mention_entry?.public_id,
            postTitle: mention_entry?.title,
            date: created_at,
            sponsorshipType: sponsorship_type,
            sponsorshipAmount: sponsorship_amount,
            sponsorshipCurrency: sponsorship_currency,
            passportCountryCode: passport_country_code,
            passportCountryName: passport_country_name,
            passportContinentCode: passport_continent_code,
            passportContinentName: passport_continent_name,
            passportStampId: passport_stamp_id,
            passportStampName: passport_stamp_name,
          }),
        ),
        page,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getBadgeCount({
    session,
  }: IQueryWithSession): Promise<IBadgeCountGetResponse> {
    try {
      const { explorerId } = session;

      // check access
      const access = !!explorerId;
      if (!access) throw new ServiceForbiddenException();

      const notifications = await this.prisma.explorerNotification.count({
        where: { explorer_id: explorerId, is_read: false },
      });

      const response: IBadgeCountGetResponse = { notifications };
      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async markNotificationsAsRead({ session }: IQueryWithSession): Promise<void> {
    try {
      const { explorerId } = session;

      // check access
      const access = !!explorerId;
      if (!access) throw new ServiceForbiddenException();

      // Mark all unread notifications as read for this explorer
      await this.prisma.explorerNotification.updateMany({
        where: {
          explorer_id: explorerId,
          is_read: false,
        },
        data: {
          is_read: true,
        },
      });

      this.logger.log(
        `Marked notifications as read for explorer ${explorerId}`,
      );
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getSponsorshipByUsername({
    session,
  }: ISessionQuery): Promise<ISponsorshipTierGetAllResponse> {
    try {
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      const where: Prisma.SponsorshipTierWhereInput = {
        explorer_id: explorerId,
        deleted_at: null,
      };

      // get the sponsorship tiers
      const results = await this.prisma.sponsorshipTier.count({ where });
      const data = await this.prisma.sponsorshipTier
        .findMany({
          where,
          select: {
            public_id: true,
            type: true,
            price: true,
            description: true,
            is_available: true,
            priority: true,
            explorer: {
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
          orderBy: [{ type: 'asc' }, { priority: 'asc' }, { price: 'asc' }],
        })
        .catch(() => {
          throw new ServiceNotFoundException('sponsorship tiers not found');
        });

      const response = {
        data: data.map(
          ({
            price,
            description,
            public_id: id,
            type,
            is_available,
            priority,
            explorer,
          }) => ({
            price: integerToDecimal(price),
            description,
            id,
            type: type as 'ONE_TIME' | 'MONTHLY',
            isAvailable: is_available,
            priority,
            membersCount: 0,
            creator: explorer
              ? {
                  username: explorer.username,
                  name: explorer.profile.name,
                  picture: explorer.profile.picture,
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
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getEntryInsights({
    session,
  }: ISessionQuery): Promise<IPostInsightsGetResponse> {
    try {
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      // get entry data with view counts
      const entries = await this.prisma.entry.findMany({
        where: {
          author_id: explorerId,
          deleted_at: null,
        },
        select: {
          public_id: true,
          title: true,
          bookmarks_count: true,
          comments_count: true,
          views_count: true,
          created_at: true,
          _count: {
            select: {
              views: true, // Count unique viewers
            },
          },
        },
      });

      const response: IPostInsightsGetResponse = {
        posts: entries.map(
          ({
            public_id,
            title,
            bookmarks_count,
            comments_count,
            views_count,
            created_at,
            _count,
          }) => ({
            id: public_id,
            title,
            bookmarksCount: bookmarks_count,
            commentsCount: comments_count || 0,
            viewsCount: views_count || 0,
            uniqueViewersCount: _count?.views || 0,
            createdAt: created_at,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Get all expeditions for the current user (without restrictive filters)
   * This returns all expeditions regardless of public status or waypoint count
   */
  async getExpeditions({ session }: IQueryWithSession) {
    try {
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();

      const where: Prisma.ExpeditionWhereInput = {
        author_id: explorerId,
        deleted_at: null,
      };

      const select = {
        public_id: true,
        title: true,
        description: true,
        status: true,
        start_date: true,
        end_date: true,
        cover_image: true,
        public: true,
        goal: true,
        raised: true,
        entries_count: true,
        sponsors_count: true,
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
      } satisfies Prisma.ExpeditionSelect;

      const results = await this.prisma.expedition.count({ where });
      const data = await this.prisma.expedition.findMany({
        where,
        select,
        orderBy: [{ id: 'desc' }],
      });

      const response = {
        results,
        data: data.map(
          ({
            public_id,
            title,
            description,
            status,
            start_date,
            end_date,
            cover_image,
            goal,
            raised,
            entries_count,
            sponsors_count,
            author,
          }) => ({
            publicId: public_id,
            title,
            description,
            status,
            startDate: start_date,
            endDate: end_date,
            coverImage: cover_image
              ? getStaticMediaUrl(cover_image)
              : undefined,
            entriesCount: entries_count,
            goal: goal ? integerToDecimal(goal) : undefined,
            raised: raised ? integerToDecimal(raised) : 0,
            sponsorsCount: sponsors_count,
            explorer: author
              ? {
                  username: author.username,
                  picture: author.profile?.picture
                    ? getStaticMediaUrl(author.profile.picture)
                    : undefined,
                }
              : undefined,
          }),
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
