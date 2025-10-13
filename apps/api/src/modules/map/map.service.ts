import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IMapQueryPayload,
  IMapQueryResponse,
  IWaypointCreatePayload,
  IWaypointCreateResponse,
  IWaypointGetByIdResponse,
  IWaypointUpdatePayload,
  MapQueryContext,
  SponsorshipStatus,
  UserRole,
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { getStaticMediaUrl } from '@/lib/upload';
import { sortByDate } from '@/lib/utils';

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
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class MapService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  /**
   * Check if a user has an active sponsorship with a creator
   */
  private async hasActiveSponsorship(
    userId: number,
    creatorId: number,
  ): Promise<boolean> {
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

  async query({
    query,
    session,
  }: IQueryWithSession<IMapQueryPayload>): Promise<IMapQueryResponse> {
    try {
      const { userId } = session;
      const { context, location, username, tripId, prioritizeEntryId } = query;
      const locationFilter =
        location &&
        [
          MapQueryContext.GLOBAL,
          MapQueryContext.FOLLOWING,
          MapQueryContext.USER,
        ].some((ctx) => ctx === context);
      const search = query?.search
        ? query.search.toLowerCase().trim()
        : undefined;

      // Base filter - for TRIP context, we'll override the public requirement
      let where = {
        public: true,
        deleted_at: null,
      } as Prisma.WaypointWhereInput;

      const select = {
        id: true,
        title: true,
        lat: true,
        lon: true,
        date: true,
        posts: {
          where: {
            is_draft: false,
            public: true,
            deleted_at: null,
          },
          select: {
            public_id: true,
            title: true,
            content: true,
            place: true,
            date: true,
            public: true,
            sponsored: true,
            is_draft: true,
            author_id: true,
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
                  select: {
                    name: true,
                    picture: true,
                  },
                },
              },
            },
            media: {
              select: {
                caption: true,
                upload: {
                  select: {
                    public_id: true,
                    thumbnail: true,
                  },
                },
              },
            },
            waypoint: {
              select: {
                trips: {
                  select: {
                    trip: {
                      select: {
                        public_id: true,
                        title: true,
                      },
                    },
                  },
                  take: 1, // Only get the first trip if multiple exist
                },
              },
            },
            created_at: true,
          },
          take: 1,
        },
      } satisfies Prisma.WaypointSelect;

      const take = 500;

      // filter by context
      switch (context) {
        case MapQueryContext.GLOBAL:
          where = {
            ...where,
            posts: {
              some: {
                title: search ? { contains: search } : undefined,
                public: true,
                is_draft: false,
                deleted_at: null,
                waypoint_id: { not: null },
              },
            },
          };

          break;
        case MapQueryContext.FOLLOWING:
          if (userId) {
            where = {
              ...where,
              posts: {
                some: {
                  title: search ? { contains: search } : undefined,
                  public: true,
                  is_draft: false,
                  deleted_at: null,
                  author: {
                    followers: {
                      some: {
                        follower_id: userId,
                      },
                    },
                  },
                },
              },
            };
          }
          break;
        case MapQueryContext.USER:
          where = {
            ...where,
            posts: {
              some: {
                public_id: { not: null },
                public: true,
                is_draft: false,
                deleted_at: null,
                author: {
                  username,
                },
              },
            },
          };
          break;
        case MapQueryContext.TRIP:
          // For TRIP context, show all waypoints attached to public journeys
          // This includes both waypoints with posts (journal entries) and waypoints without posts (pure waypoints)
          where = {
            deleted_at: null,
            trips: tripId
              ? {
                  some: {
                    trip: {
                      public_id: tripId,
                      public: true, // Only show waypoints for public journeys
                    },
                  },
                }
              : undefined,
            // No longer require waypoints to have posts - show both entries and pure waypoints
          };
          break;
        default:
          throw new ServiceBadRequestException('map query filter invalid');
      }

      // filter by location
      if (locationFilter) {
        const { sw, ne } = location.bounds;

        const minLat = sw.lat;
        const maxLat = ne.lat;
        const minLon = sw.lon;
        const maxLon = ne.lon;

        where = {
          ...where,
          AND: [
            { lat: { gte: minLat } },
            { lat: { lte: maxLat } },
            { lon: { gte: minLon } },
            { lon: { lte: maxLon } },
          ],
        };
      }

      const results = await this.prisma.waypoint.count({ where });
      const waypoints = await this.prisma.waypoint.findMany({
        where,
        select,
        take,
      });

      // Filter out sponsored posts for users without active sponsorships
      const filteredWaypoints = await Promise.all(
        waypoints.map(async ({ id, title, lat, lon, date, posts }) => {
          const post = posts[0];

          // If post is sponsored, check if user has access
          if (post?.sponsored) {
            // If user is not logged in, filter out sponsored posts
            if (!userId) {
              return null;
            }

            // Allow the post author to see their own sponsored posts
            if (userId === post.author_id) {
              // Author can see their own sponsored posts
            }
            // For other users, check if they have an active sponsorship
            else {
              const hasSponsorship = await this.hasActiveSponsorship(
                userId,
                post.author_id,
              );
              if (!hasSponsorship) {
                return null; // Filter out this post
              }
            }
          }

          return {
            lat,
            lon,
            date: post ? post.date : date, // Use waypoint date if no post
            waypoint: !post
              ? {
                  id: id,
                  title: title || '',
                  date: date,
                }
              : undefined,
            post: post
              ? {
                  id: post.public_id,
                  title: post.title,
                  content: post.content
                    .slice(0, 500)
                    .replaceAll('\\n', ' ')
                    .slice(0, 120),
                  place: post.place,
                  date: post.date,
                  sponsored: post.sponsored,
                  isDraft: post.is_draft,
                  author: {
                    username: post.author.username,
                    picture: getStaticMediaUrl(post.author.profile.picture),
                    creator: post.author.role === UserRole.CREATOR,
                  },
                  bookmarked: userId ? post.bookmarks.length > 0 : false,
                  trip: post.waypoint?.trips?.[0]?.trip
                    ? {
                        id: post.waypoint.trips[0].trip.public_id,
                        title: post.waypoint.trips[0].trip.title,
                      }
                    : undefined,
                  media: post.media
                    ? post.media.map(({ upload, caption }) => ({
                        id: upload?.public_id,
                        thumbnail: getStaticMediaUrl(upload?.thumbnail),
                        caption: caption || undefined,
                      }))
                    : [],
                }
              : undefined,
          };
        }),
      );

      const finalWaypoints = filteredWaypoints.filter(Boolean);

      const sortedWaypoints = sortByDate({
        elements: finalWaypoints,
        key: 'date',
        order: 'desc',
      });

      // If prioritizeEntryId is specified, move that entry to the top
      if (prioritizeEntryId) {
        const prioritizedIndex = sortedWaypoints.findIndex(
          (waypoint) => waypoint.post?.id === prioritizeEntryId,
        );
        if (prioritizedIndex > 0) {
          const prioritizedWaypoint = sortedWaypoints[prioritizedIndex];
          sortedWaypoints.splice(prioritizedIndex, 1);
          sortedWaypoints.unshift(prioritizedWaypoint);
        }
      }

      const response: IMapQueryResponse = {
        results: finalWaypoints.length,
        waypoints: sortedWaypoints,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('no posts found');
      throw exception;
    }
  }

  async getWaypointById({
    query,
    session,
  }: IQueryWithSession<{ id: number }>): Promise<IWaypointGetByIdResponse> {
    try {
      const { id } = query;

      if (!id) throw new ServiceNotFoundException('waypoint not found');

      // get a waypoint
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id, deleted_at: null },
          select: {
            id: true,
            title: true,
            date: true,
            lat: true,
            lon: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      const response: IWaypointGetByIdResponse = {
        ...waypoint,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceForbiddenException('waypoint not found');
      throw exception;
    }
  }

  async createWaypoint({
    payload,
    session,
  }: ISessionQueryWithPayload<
    {},
    IWaypointCreatePayload
  >): Promise<IWaypointCreateResponse> {
    try {
      const { userId } = session;

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      const { lat, lon, title, date, tripId } = payload;
      let trip: { id: number } | null = null;

      // get a trip
      if (tripId) {
        trip = await this.prisma.trip
          .findFirstOrThrow({
            where: { public_id: tripId },
            select: { id: true },
          })
          .catch(() => null);
      }

      // create a waypoint
      const waypoint = await this.prisma.$transaction(async (tx) => {
        const waypoint = await tx.waypoint
          .create({
            data: {
              lat,
              lon,
              title,
              date,
              author: {
                connect: { id: userId },
              },
              trips: trip ? { create: { trip_id: trip.id } } : undefined,
            },
            select: { id: true },
          })
          .catch(() => {
            throw new ServiceBadRequestException('waypoint not created');
          });

        return { id: waypoint.id };
      });

      return { id: waypoint.id };
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('waypoint not created');
      throw exception;
    }
  }

  async updateWaypoint({
    query,
    payload,
    session,
  }: ISessionQueryWithPayload<
    { id: number },
    IWaypointUpdatePayload
  >): Promise<void> {
    try {
      const { id } = query;
      const { userId } = session;

      if (!id) throw new ServiceNotFoundException('waypoint not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get a waypoint
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id, deleted_at: null, author_id: userId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });
      const { lat, lon, title, date } = payload;

      // update the waypoint
      await this.prisma.waypoint
        .update({
          where: { id: waypoint.id },
          data: {
            lat,
            lon,
            title,
            date,
          },
        })
        .catch(() => {
          throw new ServiceBadRequestException('waypoint not updated');
        });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('waypoint not updated');
      throw exception;
    }
  }

  async deleteWaypoint({
    query,
    session,
  }: ISessionQuery<{ id: number }>): Promise<void> {
    try {
      const { id } = query;
      const { userId } = session;

      if (!id) throw new ServiceNotFoundException('waypoint not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // get a waypoint
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id, deleted_at: null, author_id: userId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      // delete the waypoint
      await this.prisma.waypoint
        .update({
          where: { id: waypoint.id },
          data: { deleted_at: dateformat().toDate() },
        })
        .catch(() => {
          throw new ServiceBadRequestException('waypoint not deleted');
        });
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('waypoint not deleted');
      throw exception;
    }
  }
}
