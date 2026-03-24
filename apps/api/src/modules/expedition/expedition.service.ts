import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
// force recompile
import {
  ExplorerRole,
  IExpeditionBookmarkResponse,
  IExpeditionCreatePayload,
  IExpeditionCreateResponse,
  IExpeditionGetAllResponse,
  IExpeditionGetByIdResponse,
  IExpeditionUpdatePayload,
  IWaypointCreatePayload,
  IWaypointDetail,
  IWaypointUpdatePayload,
  UserNotificationContext,
  UserRole,
} from '@repo/types';
import {
  getEarlyAccessHoursForAmount,
  getEarlyAccessHoursForTier,
} from '@repo/types/sponsorship-tiers';

import { dateformat } from '@/lib/date-format';
import { integerToDecimal, normalizeText } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { resolveExpeditionLocations } from '@/lib/resolve-expedition-location';
import { getStaticMediaUrl } from '@/lib/upload';
import { matchRoles, sortByDate } from '@/lib/utils';

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
import { IUserNotificationCreatePayload } from '@/modules/notification';
import { PrismaService } from '@/modules/prisma';
import { UploadService } from '@/modules/upload/upload.service';

@Injectable()
export class ExpeditionService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
    private uploadService: UploadService,
  ) {}

  /**
   * Check if an explorer's resting status needs to change after an expedition mutation.
   * If they have no active/planned expeditions, mark them as resting.
   * If they just got one, clear resting and emit event to resume paused sponsorships.
   */
  private async checkAndUpdateRestingStatus(explorerId: number): Promise<void> {
    try {
      const activeCount = await this.prisma.expedition.count({
        where: {
          author_id: explorerId,
          deleted_at: null,
          status: { in: ['planned', 'active'] },
        },
      });

      const explorer = await this.prisma.explorer.findUnique({
        where: { id: explorerId },
        select: { resting_since: true },
      });

      if (!explorer) return;

      const isResting = explorer.resting_since !== null;

      if (activeCount === 0 && !isResting) {
        // Enter resting — no event needed, pause is cron-driven
        await this.prisma.explorer.update({
          where: { id: explorerId },
          data: { resting_since: new Date() },
        });
      } else if (activeCount > 0 && isResting) {
        // Exit resting — clear and emit event for immediate resume
        await this.prisma.explorer.update({
          where: { id: explorerId },
          data: { resting_since: null },
        });
        await this.eventService.trigger({
          event: EVENTS.EXPLORER_EXITED_RESTING,
          data: { explorerId },
        });
      }
    } catch (e) {
      this.logger.error(
        `Failed to update resting status for explorer ${explorerId}: ${e.message}`,
      );
    }
  }

  /**
   * Batch-compute recurring sponsorship stats AND per-expedition unique sponsor
   * counts for a list of expeditions. One-time sponsors are scoped to a specific
   * expedition; recurring sponsors apply to all expeditions by that author.
   */
  private async getSponsorshipStatsForExpeditions(
    expeditions: {
      public_id: string;
      author_id: number;
      created_at: Date | null;
      end_date: Date | null;
    }[],
  ): Promise<
    Map<
      string,
      {
        recurringStats: {
          activeSponsors: number;
          monthlyRevenue: number;
          totalCommitted: number;
        };
        sponsorsCount: number;
      }
    >
  > {
    const result = new Map<
      string,
      {
        recurringStats: {
          activeSponsors: number;
          monthlyRevenue: number;
          totalCommitted: number;
        };
        sponsorsCount: number;
      }
    >();
    if (expeditions.length === 0) return result;

    const authorIds = [...new Set(expeditions.map((e) => e.author_id))];
    const publicIdSet = new Set(expeditions.map((e) => e.public_id));

    // Single query: all sponsorships for these authors (both one-time and recurring)
    const allSponsorships = await this.prisma.sponsorship.findMany({
      where: {
        sponsored_explorer_id: { in: authorIds },
        deleted_at: null,
        status: {
          in: [
            'active',
            'confirmed',
            'completed',
            'ACTIVE',
            'CONFIRMED',
            'COMPLETED',
          ],
        },
      },
      select: {
        sponsored_explorer_id: true,
        sponsor_id: true,
        type: true,
        amount: true,
        status: true,
        created_at: true,
        expedition_public_id: true,
      },
    });

    // Partition by type
    const recurringByAuthor = new Map<number, typeof allSponsorships>();
    const oneTimeByExpedition = new Map<string, typeof allSponsorships>();

    for (const s of allSponsorships) {
      if (s.type?.toLowerCase() === 'subscription') {
        if (!recurringByAuthor.has(s.sponsored_explorer_id)) {
          recurringByAuthor.set(s.sponsored_explorer_id, []);
        }
        recurringByAuthor.get(s.sponsored_explorer_id)!.push(s);
      } else if (
        s.expedition_public_id &&
        publicIdSet.has(s.expedition_public_id)
      ) {
        if (!oneTimeByExpedition.has(s.expedition_public_id)) {
          oneTimeByExpedition.set(s.expedition_public_id, []);
        }
        oneTimeByExpedition.get(s.expedition_public_id)!.push(s);
      }
    }

    const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();

    for (const exp of expeditions) {
      const recurring = recurringByAuthor.get(exp.author_id) || [];
      const oneTime = oneTimeByExpedition.get(exp.public_id) || [];
      const expCreated = exp.created_at ?? now;
      const expEndDate = exp.end_date ?? now;

      // Recurring stats
      const active = recurring.filter(
        (s) => s.status?.toLowerCase() === 'active',
      );
      const monthlyRevenue = active.reduce(
        (sum, s) => sum + integerToDecimal(s.amount),
        0,
      );
      const totalCommitted = recurring.reduce((sum, s) => {
        const subStart = s.created_at ?? now;
        const overlapStart = subStart > expCreated ? subStart : expCreated;
        if (overlapStart > expEndDate) return sum;
        const diffMs = expEndDate.getTime() - overlapStart.getTime();
        const months = Math.max(1, Math.ceil(diffMs / MS_PER_MONTH));
        return sum + months * integerToDecimal(s.amount);
      }, 0);

      // Unique sponsor count: one-time for this expedition + recurring for this author
      const uniqueSponsors = new Set<number>();
      for (const s of oneTime) uniqueSponsors.add(s.sponsor_id);
      for (const s of recurring) uniqueSponsors.add(s.sponsor_id);

      result.set(exp.public_id, {
        recurringStats: {
          activeSponsors: active.length,
          monthlyRevenue,
          totalCommitted,
        },
        sponsorsCount: uniqueSponsors.size,
      });
    }

    return result;
  }

  async getExpeditions({
    query,
    session,
  }: IQueryWithSession<{
    context?: string;
    page?: string;
    limit?: string;
  }>): Promise<IExpeditionGetAllResponse> {
    try {
      const { context } = query;
      const { explorerId, explorerRole } = session;

      const parsedPage = Math.max(1, parseInt(query.page, 10) || 1);
      const parsedLimit = Math.min(
        50,
        Math.max(1, parseInt(query.limit, 10) || 20),
      );

      let where: Prisma.ExpeditionWhereInput = {
        deleted_at: null,
        status: { notIn: ['cancelled', 'draft'] },
      };

      // query based on the explorer role (or public access for unauthenticated users)
      if (!explorerId) {
        // Unauthenticated: show only public expeditions
        where = {
          ...where,
          visibility: 'public',
        };
      } else {
        switch (explorerRole) {
          case ExplorerRole.CREATOR:
            where = {
              ...where,
              OR: [{ visibility: 'public' }, { author_id: explorerId }],
            };
            break;
          case ExplorerRole.USER:
            where = {
              ...where,
              visibility: 'public',
            };
            break;
          default:
            // Default to public expeditions
            where = {
              ...where,
              visibility: 'public',
            };
        }
      }

      // Filter to expeditions from followed explorers
      if (context === 'following') {
        if (!explorerId) throw new ServiceForbiddenException();
        const follows = await this.prisma.explorerFollow.findMany({
          where: { follower_id: explorerId },
          select: { followee_id: true },
        });
        const followedIds = follows.map((f) => f.followee_id);
        if (followedIds.length === 0)
          return {
            data: [],
            results: 0,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: 0,
          };
        where = { ...where, author_id: { in: followedIds } };
      }

      // get expeditions
      const results = await this.prisma.expedition.count({ where });
      const data = await this.prisma.expedition.findMany({
        where,
        select: {
          id: true,
          public_id: true,
          title: true,
          description: true,
          public: true,
          visibility: true,
          status: true,
          created_at: true,
          start_date: true,
          end_date: true,
          cover_image: true,
          category: true,
          region: true,
          tags: true,
          is_round_trip: true,
          goal: true,
          raised: true,
          route_distance_km: true,
          _count: { select: { entries: { where: { deleted_at: null } } } },
          author_id: true,
          author: {
            select: {
              username: true,
              is_stripe_account_connected: true,
              profile: {
                select: {
                  name: true,
                  picture: true,
                },
              },
            },
          },
          waypoints: {
            orderBy: { sequence: 'asc' },
            select: {
              sequence: true,
              waypoint: {
                select: {
                  id: true,
                  title: true,
                  lat: true,
                  lon: true,
                  date: true,
                  description: true,
                  _count: { select: { entries: true } },
                },
              },
            },
          },
          // check if the session explorer has bookmarked this expedition
          bookmarks: explorerId
            ? {
                where: { explorer_id: explorerId },
                select: { expedition_id: true },
              }
            : undefined,
        },
        skip: (parsedPage - 1) * parsedLimit,
        take: parsedLimit,
        orderBy:
          context === 'following' ? [{ updated_at: 'desc' }] : [{ id: 'desc' }],
      });

      // Get per-expedition sponsor counts and recurring stats
      const sponsorshipStats = await this.getSponsorshipStatsForExpeditions(
        data.map((d) => ({
          public_id: d.public_id,
          author_id: d.author_id,
          created_at: d.created_at,
          end_date: d.end_date,
        })),
      );

      const response: IExpeditionGetAllResponse = {
        results,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(results / parsedLimit),
        data: data.map(
          ({
            id: _id,
            public_id,
            title,
            description,
            public: isPublic,
            visibility,
            author,
            author_id,
            status,
            start_date,
            end_date,
            cover_image,
            is_round_trip,
            tags,
            goal,
            raised,
            _count,
            bookmarks: expeditionBookmarks,
            ...expedition
          }) => {
            // Waypoints already ordered by sequence from query
            const waypoints = expedition.waypoints.map(
              ({ sequence, waypoint }) => ({
                ...waypoint,
                sequence,
              }),
            ) as IWaypointDetail[];
            // For date fallback, find earliest/latest dated waypoints
            const datedWaypoints = waypoints
              .filter((w) => w.date)
              .sort(
                (a, b) =>
                  new Date(a.date!).getTime() - new Date(b.date!).getTime(),
              );

            // Use explicit dates if set, otherwise fall back to earliest/latest waypoint dates
            const startDate =
              start_date ??
              (datedWaypoints.length >= 1
                ? datedWaypoints[0]?.date
                : undefined);
            const endDate =
              end_date ??
              (datedWaypoints.length >= 1
                ? datedWaypoints[datedWaypoints.length - 1]?.date
                : undefined);

            const category = (expedition as any).category;
            const region = (expedition as any).region;

            return {
              id: public_id,
              title,
              description,
              public: isPublic,
              visibility: (visibility ||
                (isPublic !== false ? 'public' : 'private')) as
                | 'public'
                | 'off-grid'
                | 'private',
              status,
              category,
              region,
              startDate,
              endDate,
              coverImage: getStaticMediaUrl(cover_image),
              isRoundTrip: is_round_trip ?? false,
              goal: integerToDecimal(goal ?? 0),
              raised: raised ?? 0,
              recurringStats: sponsorshipStats.get(public_id)?.recurringStats,
              sponsorsCount:
                sponsorshipStats.get(public_id)?.sponsorsCount ?? 0,
              entriesCount: _count.entries,
              totalDistanceKm: expedition.route_distance_km ?? 0,
              author: author
                ? {
                    username: author.username,
                    name: author.profile?.name,
                    picture: getStaticMediaUrl(author.profile?.picture),
                    stripeAccountConnected:
                      author?.is_stripe_account_connected === true,
                  }
                : undefined,
              tags: tags ? JSON.parse(tags) : [],
              waypointsCount: expedition.waypoints.filter(
                (w) => (w.waypoint as any)._count?.entries === 0,
              ).length,
              waypoints: [],
              bookmarked: explorerId
                ? (expeditionBookmarks?.length ?? 0) > 0
                : false,
            };
          },
        ),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getExpeditionsByUsername({
    query,
    session,
  }: IQueryWithSession<{
    username: string;
  }>): Promise<IExpeditionGetAllResponse> {
    try {
      const { username } = query;
      const { explorerId } = session;

      if (!username) throw new ServiceNotFoundException('explorer not found');

      // Check if the viewing explorer is the profile owner
      const owner = await this.prisma.explorer.findFirst({
        where: { username },
        select: { id: true },
      });
      const isOwner = !!explorerId && !!owner && owner.id === explorerId;

      // get expeditions (owner sees all their own, others see only public and non-cancelled)
      const where = {
        author: { username },
        ...(isOwner
          ? {}
          : {
              visibility: 'public',
              status: { notIn: ['cancelled', 'draft'] },
            }),
        deleted_at: null,
      } satisfies Prisma.ExpeditionWhereInput;

      const take = 50;

      const results = await this.prisma.expedition.count({ where });
      const data = await this.prisma.expedition.findMany({
        where,
        select: {
          public_id: true,
          title: true,
          description: true,
          cover_image: true,
          status: true,
          visibility: true,
          created_at: true,
          category: true,
          region: true,
          tags: true,
          is_round_trip: true,
          goal: true,
          raised: true,
          route_distance_km: true,
          _count: { select: { entries: { where: { deleted_at: null } } } },
          author_id: true,
          start_date: true,
          end_date: true,
          current_location_type: true,
          current_location_id: true,
          current_location_visibility: true,
          waypoints: {
            where: {
              waypoint: {
                deleted_at: null,
              },
            },
            orderBy: { sequence: 'asc' },
            select: {
              sequence: true,
              waypoint: {
                select: {
                  id: true,
                  title: true,
                  lat: true,
                  lon: true,
                  date: true,
                  description: true,
                  _count: { select: { entries: true } },
                },
              },
            },
          },
          author: {
            select: {
              username: true,
              is_stripe_account_connected: true,
              profile: { select: { picture: true, name: true } },
            },
          },
          // check if the session explorer has bookmarked this expedition
          bookmarks: explorerId
            ? {
                where: { explorer_id: explorerId },
                select: { expedition_id: true },
              }
            : undefined,
        },
        take,
        orderBy: [{ id: 'desc' }],
      });

      // Resolve current location references in batch
      const locationRefs = data
        .filter(
          (d) =>
            d.current_location_type &&
            d.current_location_id &&
            (d.current_location_visibility || 'public') === 'public',
        )
        .map((d) => ({
          type: d.current_location_type!,
          id: d.current_location_id!,
        }));
      const resolvedLocations = await resolveExpeditionLocations(
        this.prisma,
        locationRefs,
      );

      // Get per-expedition sponsor counts and recurring stats
      const sponsorshipStats = await this.getSponsorshipStatsForExpeditions(
        data.map((d) => ({
          public_id: d.public_id,
          author_id: d.author_id,
          created_at: d.created_at,
          end_date: d.end_date,
        })),
      );

      const response: IExpeditionGetAllResponse = {
        results,
        data: data.map((row) => {
          const {
            public_id,
            title,
            description,
            cover_image,
            status,
            visibility,
            tags,
            is_round_trip,
            goal,
            raised,
            author_id,
            start_date,
            end_date,
            current_location_type,
            current_location_id,
            current_location_visibility,
            author,
            bookmarks: expeditionBookmarks,
          } = row;
          // Access category/region directly to avoid destructuring issues
          const category = (row as any).category;
          const region = (row as any).region;
          // Waypoints already ordered by sequence from query
          const waypoints = row.waypoints.map(({ sequence, waypoint }) => ({
            ...waypoint,
            sequence,
          })) as IWaypointDetail[];
          // For date fallback, find earliest/latest dated waypoints
          const datedWaypoints = waypoints
            .filter((w) => w.date)
            .sort(
              (a, b) =>
                new Date(a.date!).getTime() - new Date(b.date!).getTime(),
            );

          // Use expedition dates if available, otherwise fall back to earliest/latest waypoint dates
          const startDate =
            start_date ||
            (datedWaypoints.length >= 1 ? datedWaypoints[0]?.date : undefined);
          const endDate =
            end_date ||
            (datedWaypoints.length >= 1
              ? datedWaypoints[datedWaypoints.length - 1]?.date
              : undefined);

          // Resolve current location if public
          const locKey =
            current_location_type && current_location_id
              ? `${current_location_type}:${current_location_id}`
              : null;
          const resolvedLoc = locKey
            ? resolvedLocations.get(locKey)
            : undefined;
          const isPublicLoc =
            (current_location_visibility || 'public') === 'public';

          return {
            id: public_id,
            title,
            description,
            coverImage: getStaticMediaUrl(cover_image),
            status,
            visibility: (visibility || 'public') as
              | 'public'
              | 'off-grid'
              | 'private',
            category,
            region,
            tags: tags ? JSON.parse(tags) : [],
            isRoundTrip: is_round_trip ?? false,
            startDate,
            endDate,
            goal: integerToDecimal(goal ?? 0),
            raised: raised ?? 0,
            recurringStats: sponsorshipStats.get(public_id)?.recurringStats,
            sponsorsCount: sponsorshipStats.get(public_id)?.sponsorsCount ?? 0,
            entriesCount: (row as any)._count?.entries ?? 0,
            totalDistanceKm: (row as any).route_distance_km ?? 0,
            waypointsCount: row.waypoints.filter(
              (w) => (w.waypoint as any)._count?.entries === 0,
            ).length,
            waypoints: [],
            currentLocation:
              resolvedLoc && isPublicLoc
                ? {
                    lat: resolvedLoc.lat,
                    lon: resolvedLoc.lon,
                    name: resolvedLoc.name,
                    source: current_location_type,
                  }
                : undefined,
            currentLocationVisibility: (current_location_visibility ||
              'public') as 'public' | 'sponsors' | 'private',
            author: author
              ? {
                  username: author.username,
                  picture: getStaticMediaUrl(author.profile.picture),
                  name: author.profile.name,
                  stripeAccountConnected:
                    author?.is_stripe_account_connected === true,
                }
              : undefined,
            bookmarked: explorerId
              ? (expeditionBookmarks?.length ?? 0) > 0
              : false,
          };
        }),
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getExpeditionById({
    session,
    query,
  }: IQueryWithSession<{ id: string }>): Promise<IExpeditionGetByIdResponse> {
    try {
      const { id } = query;
      const { explorerId, explorerRole } = session;

      if (!id) throw new ServiceNotFoundException('expedition not found');

      // Allow access for public expeditions, require auth for private expeditions
      const isAuthenticated = !!explorerId;

      // Build visibility-aware where clause to prevent fetching unauthorized data
      const visibilityFilter: Prisma.ExpeditionWhereInput = isAuthenticated
        ? {
            OR: [
              { visibility: 'public' },
              { visibility: 'off-grid' },
              { visibility: 'private', author_id: explorerId },
              { visibility: null }, // legacy records
            ],
          }
        : { visibility: 'public' };

      const where: Prisma.ExpeditionWhereInput = {
        public_id: id,
        deleted_at: null,
        ...visibilityFilter,
      };

      // get an expedition
      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where,
          select: {
            id: true,
            public_id: true,
            public: true,
            visibility: true,
            title: true,
            description: true,
            status: true,
            created_at: true,
            start_date: true,
            end_date: true,
            cover_image: true,
            category: true,
            region: true,
            tags: true,
            is_round_trip: true,
            route_mode: true,
            route_geometry: true,
            route_leg_modes: true,
            route_distance_km: true,
            current_location_type: true,
            current_location_id: true,
            current_location_visibility: true,
            goal: true,
            raised: true,
            notes_access_threshold: true,
            notes_visibility: true,
            early_access_enabled: true,
            entries_count: true,
            cancelled_at: true,
            cancellation_reason: true,
            author_id: true,
            author: {
              select: {
                username: true,
                role: true,
                is_stripe_account_connected: true,
                profile: {
                  select: {
                    name: true,
                    picture: true,
                  },
                },
              },
            },
            // Entries directly linked to this expedition via expedition_id
            entries: {
              where: {
                deleted_at: null,
                is_draft: false,
              },
              select: {
                public_id: true,
                title: true,
                content: true,
                visibility: true,
                sponsored: true,
                author_id: true,
                date: true,
                place: true,
                lat: true,
                lon: true,
                is_milestone: true,
                metadata: true,
                created_at: true,
                published_at: true,
                author: {
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
                media: {
                  select: {
                    caption: true,
                    upload: {
                      select: {
                        public_id: true,
                        thumbnail: true,
                        original: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                date: 'desc',
              },
            },
            waypoints: {
              where: {
                waypoint: {
                  deleted_at: null,
                },
              },
              orderBy: { sequence: 'asc' },
              select: {
                sequence: true,
                waypoint: {
                  select: {
                    id: true,
                    title: true,
                    lat: true,
                    lon: true,
                    date: true,
                    description: true,
                    entries: {
                      where: { deleted_at: null, is_draft: { not: true } },
                      select: { public_id: true },
                      orderBy: { date: 'desc' },
                    },
                  },
                },
              },
            },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      const {
        public_id,
        title,
        description,
        status,
        created_at,
        start_date,
        end_date,
        cover_image,
        category,
        region,
        tags,
        is_round_trip,
        route_mode,
        route_geometry,
        route_leg_modes,
        current_location_type,
        current_location_id,
        current_location_visibility,
        goal,
        raised,
        notes_access_threshold,
        notes_visibility,
        early_access_enabled,
        entries_count,
        cancelled_at,
        cancellation_reason,
        public: isPublic,
        waypoints,
        entries,
        author,
      } = expedition;

      // Draft expeditions are only visible to their authors
      if (
        expedition.status === 'draft' &&
        (!isAuthenticated || explorerId !== expedition.author_id)
      ) {
        throw new ServiceNotFoundException('expedition not found');
      }

      // access control - private expeditions are only accessible by their authors
      if (
        expedition.visibility === 'private' &&
        (!isAuthenticated || explorerId !== expedition.author_id)
      ) {
        throw new ServiceForbiddenException();
      }

      // off-grid expeditions require authentication
      if (expedition.visibility === 'off-grid' && !isAuthenticated) {
        throw new ServiceForbiddenException();
      }

      // Check if the current user has bookmarked this expedition
      let isBookmarked = false;
      if (explorerId) {
        const bookmark = await this.prisma.expeditionBookmark.findUnique({
          where: {
            expedition_id_explorer_id: {
              expedition_id: expedition.id,
              explorer_id: explorerId,
            },
          },
        });
        isBookmarked = !!bookmark;
      }

      // Check if the current user is following the expedition author
      let isFollowingAuthor = false;
      if (explorerId && expedition.author_id) {
        this.logger.log(
          `Checking follow: currentUser=${explorerId}, author=${expedition.author_id}`,
        );
        const follow = await this.prisma.explorerFollow.findUnique({
          where: {
            follower_id_followee_id: {
              follower_id: explorerId,
              followee_id: expedition.author_id,
            },
          },
        });
        this.logger.log(`Follow result: ${JSON.stringify(follow)}`);
        isFollowingAuthor = !!follow;
      }

      // Calculate date range from waypoints/entries if explicit dates not set
      const waypointDates = waypoints
        .map(({ waypoint: { date } }) => date)
        .filter((d): d is Date => d != null);
      const entryDates = entries
        .filter((e) => e.date)
        .map((e) => e.date as Date);
      const allDates = [...waypointDates, ...entryDates];

      // Use explicit dates if set, otherwise fall back to waypoint/entry dates
      const startDate =
        start_date ??
        (allDates.length > 0
          ? new Date(Math.min(...allDates.map((d) => d.getTime())))
          : undefined);
      const endDate =
        end_date ??
        (allDates.length > 0
          ? new Date(Math.max(...allDates.map((d) => d.getTime())))
          : undefined);

      // Fetch all sponsorships for this explorer (public leaderboard + recurring stats)
      const allSponsorships = await this.prisma.sponsorship.findMany({
        where: {
          sponsored_explorer_id: expedition.author_id,
          deleted_at: null,
          status: {
            in: [
              'active',
              'confirmed',
              'completed',
              'ACTIVE',
              'CONFIRMED',
              'COMPLETED',
            ],
          },
        },
        select: {
          public_id: true,
          type: true,
          amount: true,
          status: true,
          message: true,
          is_public: true,
          is_message_public: true,
          created_at: true,
          sponsor_id: true,
          expedition_public_id: true,
          sponsor: {
            select: {
              username: true,
              profile: {
                select: { name: true, picture: true },
              },
            },
          },
          tier: {
            select: {
              public_id: true,
              description: true,
              price: true,
              priority: true,
              type: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      // One-time sponsorships are allocated to a specific expedition;
      // only include those matching this expedition's public_id.
      // Recurring sponsorships apply across all expeditions.
      const oneTimeSponsors = allSponsorships.filter(
        (s) =>
          s.type?.toLowerCase() !== 'subscription' &&
          s.expedition_public_id === public_id,
      );
      const oneTimeTotal = oneTimeSponsors.reduce(
        (sum, s) => sum + integerToDecimal(s.amount),
        0,
      );

      const recurringSponsors = allSponsorships.filter(
        (s) => s.type?.toLowerCase() === 'subscription',
      );

      const now = new Date();
      const expCreated = created_at ?? now;
      const expEndDate = end_date ?? now;
      const activeRecurring = recurringSponsors.filter(
        (s) => s.status?.toLowerCase() === 'active',
      );
      const monthlyRecurring = activeRecurring.reduce(
        (sum, s) => sum + integerToDecimal(s.amount),
        0,
      );
      const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;
      const totalRecurringCommitted = recurringSponsors.reduce((sum, s) => {
        const subStart = s.created_at ?? now;
        const overlapStart = subStart > expCreated ? subStart : expCreated;
        if (overlapStart > expEndDate) return sum;
        const diffMs = expEndDate.getTime() - overlapStart.getTime();
        const months = Math.max(1, Math.ceil(diffMs / MS_PER_MONTH));
        return sum + months * integerToDecimal(s.amount);
      }, 0);

      // Count unique sponsors for this expedition (one-time allocated here + recurring)
      const expeditionSponsorIds = new Set<number>();
      for (const s of oneTimeSponsors) expeditionSponsorIds.add(s.sponsor_id);
      for (const s of recurringSponsors) expeditionSponsorIds.add(s.sponsor_id);
      const expeditionSponsorsCount = expeditionSponsorIds.size;

      // Calculate viewer's cumulative sponsorship for this expedition
      let viewerCumulativeSponsored = 0;
      let viewerEarlyAccessHours = 0;
      if (explorerId && explorerId !== expedition.author_id) {
        const viewerSponsorships = allSponsorships.filter(
          (s) =>
            s.sponsor_id === explorerId &&
            (s.expedition_public_id === public_id ||
              s.type?.toLowerCase() === 'subscription'),
        );
        viewerCumulativeSponsored = viewerSponsorships.reduce(
          (sum, s) => sum + s.amount,
          0,
        );

        // Determine viewer's early access hours from their best tier
        for (const s of viewerSponsorships) {
          let hours = 0;
          if (s.tier?.priority) {
            hours = getEarlyAccessHoursForTier(s.tier.priority);
          } else {
            // No tier (custom amount or quick-sponsor) — check amount against one-time thresholds
            hours = getEarlyAccessHoursForAmount(integerToDecimal(s.amount));
          }
          if (hours > viewerEarlyAccessHours) viewerEarlyAccessHours = hours;
        }
      }

      const response: IExpeditionGetByIdResponse = {
        id: public_id,
        title,
        description,
        status,
        createdAt: created_at,
        coverImage: getStaticMediaUrl(cover_image),
        category,
        region,
        tags: tags ? JSON.parse(tags) : [],
        isRoundTrip: is_round_trip ?? false,
        routeMode: route_mode || undefined,
        routeGeometry: route_geometry ? JSON.parse(route_geometry) : undefined,
        routeLegModes: route_leg_modes
          ? JSON.parse(route_leg_modes)
          : undefined,
        routeDistanceKm: expedition.route_distance_km ?? undefined,
        currentLocationVisibility:
          (current_location_visibility as 'public' | 'sponsors' | 'private') ||
          'public',
        currentLocationSource: undefined as 'waypoint' | 'entry' | undefined,
        currentLocationId: undefined as string | undefined,
        goal: integerToDecimal(goal ?? 0),
        raised: oneTimeTotal,
        sponsorsCount: expeditionSponsorsCount,
        notesAccessThreshold: integerToDecimal(notes_access_threshold ?? 0),
        notesVisibility: (notes_visibility as 'public' | 'sponsor') || 'public',
        earlyAccessEnabled: early_access_enabled ?? false,
        viewerEarlyAccessHours,
        viewerCumulativeSponsored: integerToDecimal(viewerCumulativeSponsored),
        entriesCount: entries.length,
        recurringStats: {
          activeSponsors: activeRecurring.length,
          monthlyRevenue: monthlyRecurring,
          totalCommitted: totalRecurringCommitted,
        },
        public: isPublic,
        visibility: (expedition.visibility ||
          (isPublic !== false ? 'public' : 'private')) as
          | 'public'
          | 'off-grid'
          | 'private',
        startDate,
        endDate,
        cancelledAt: cancelled_at || undefined,
        cancellationReason: cancellation_reason || undefined,
        bookmarked: isBookmarked,
        followingAuthor: isFollowingAuthor,
        author: author
          ? {
              username: author.username,
              picture: getStaticMediaUrl(author.profile.picture),
              creator: author.role === ExplorerRole.CREATOR,
              stripeAccountConnected:
                author?.is_stripe_account_connected === true,
            }
          : undefined,
        // Entries directly linked to this expedition
        entries: sortByDate({
          elements: entries
            .filter((entry) => {
              // Hide private/draft entries from non-owners
              if (entry.visibility === 'private') {
                const isAuthor = explorerId && entry.author_id === explorerId;
                const isAdmin = explorerRole === ExplorerRole.ADMIN;
                return isAuthor || isAdmin;
              }
              // Early access filtering: hide entries within the 48h window from non-qualifying viewers
              if (early_access_enabled && entry.published_at) {
                const isAuthor = explorerId && entry.author_id === explorerId;
                const isAdmin = explorerRole === ExplorerRole.ADMIN;
                if (!isAuthor && !isAdmin) {
                  const hoursSincePublish =
                    (Date.now() - new Date(entry.published_at).getTime()) /
                    (1000 * 60 * 60);
                  if (hoursSincePublish < 48 && viewerEarlyAccessHours <= 0)
                    return false;
                  if (hoursSincePublish < 48 - viewerEarlyAccessHours)
                    return false;
                }
              }
              return true;
            })
            .map((entry) => {
              const fullContent = normalizeText(entry.content);
              // Derive visibility from expedition (except private entries stay private)
              const effectiveVisibility =
                entry.visibility === 'private'
                  ? 'private'
                  : ((expedition.visibility || 'public') as
                      | 'public'
                      | 'off-grid'
                      | 'private');
              // Determine if entry is in early access window
              const isEarlyAccess =
                early_access_enabled && entry.published_at
                  ? (Date.now() - new Date(entry.published_at).getTime()) /
                      (1000 * 60 * 60) <
                    48
                  : false;

              return {
                id: entry.public_id,
                title: entry.title,
                content: fullContent,
                visibility: effectiveVisibility,
                isMilestone: entry.is_milestone || false,
                earlyAccess: isEarlyAccess,
                embargoLiftsAt: isEarlyAccess && entry.published_at
                  ? new Date(new Date(entry.published_at).getTime() + 48 * 60 * 60 * 1000)
                  : undefined,
                metadata: entry.metadata || null,
                createdAt: entry.created_at,
                publishedAt: entry.published_at,
                date: entry.date,
                place: entry.place,
                lat: entry.lat,
                lon: entry.lon,
                mediaCount: entry.media?.length || 0,
                media: entry.media
                  ? entry.media.map((m) => ({
                      id: m.upload?.public_id,
                      thumbnail: getStaticMediaUrl(m.upload?.thumbnail),
                      original: getStaticMediaUrl(m.upload?.original),
                      caption: m.caption,
                    }))
                  : [],
                author: entry.author
                  ? {
                      username: entry.author.username,
                      name: entry.author.profile?.name,
                      picture: getStaticMediaUrl(entry.author.profile?.picture),
                    }
                  : undefined,
              };
            }),
          key: 'date',
          order: 'desc',
        }),
        // Waypoints already ordered by sequence from query
        waypoints: waypoints.map(
          ({
            sequence,
            waypoint: { id, lat, lon, title, date, description, entries },
          }) => ({
            id,
            lat,
            lon,
            title,
            date,
            description,
            sequence,
            entryId: entries?.[0]?.public_id || null,
            entryIds: entries?.map((e) => e.public_id) || [],
          }),
        ),
        sponsors: allSponsorships
          .filter(
            (s) =>
              s.type?.toLowerCase() === 'subscription' ||
              s.expedition_public_id === public_id,
          )
          .map((s) => {
            const isPublic = s.is_public ?? true;
            const isMessagePublic = s.is_message_public ?? true;
            return {
              id: s.public_id,
              type: s.type?.toLowerCase(),
              amount: integerToDecimal(s.amount),
              status: s.status?.toLowerCase(),
              message: isMessagePublic ? s.message : null,
              isPublic,
              isMessagePublic,
              createdAt: s.created_at,
              // Strip identity for anonymous sponsors
              user:
                isPublic && s.sponsor
                  ? {
                      username: s.sponsor.username,
                      name: s.sponsor.profile?.name,
                      picture: getStaticMediaUrl(s.sponsor.profile?.picture),
                    }
                  : undefined,
              tier: s.tier
                ? {
                    id: s.tier.public_id,
                    description: s.tier.description,
                    price: integerToDecimal(s.tier.price),
                  }
                : undefined,
            };
          }),
      };

      // Apply current location visibility rules
      // Current location is NEVER visible to logged-out viewers
      const locVisibility = current_location_visibility || 'public';
      const isViewerOwner = !!explorerId && explorerId === expedition.author_id;

      let canSeeLocation = false;
      if (!isAuthenticated) {
        canSeeLocation = false;
      } else if (isViewerOwner) {
        canSeeLocation = true;
      } else if (locVisibility === 'public') {
        canSeeLocation = true;
      } else if (locVisibility === 'sponsors' && explorerId) {
        // Direct query: check if viewer has an active/confirmed sponsorship for this explorer
        const sponsorshipCount = await this.prisma.sponsorship.count({
          where: {
            sponsor_id: explorerId,
            sponsored_explorer_id: expedition.author_id,
            deleted_at: null,
            status: { in: ['active', 'confirmed', 'ACTIVE', 'CONFIRMED'] },
          },
        });
        canSeeLocation = sponsorshipCount > 0;
      }

      if (canSeeLocation) {
        response.currentLocationSource =
          (current_location_type as 'waypoint' | 'entry') || undefined;
        response.currentLocationId = current_location_id || undefined;
      }

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createExpedition({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    IExpeditionCreatePayload
  >): Promise<IExpeditionCreateResponse> {
    try {
      const { explorerId, userRole } = session;

      // check access - any authenticated user can create expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // Sponsorship goal requires Explorer Pro
      if (
        payload.goal &&
        payload.goal > 0 &&
        !matchRoles(userRole, [UserRole.CREATOR])
      ) {
        throw new ServiceBadRequestException(
          'Setting a sponsorship goal requires Explorer Pro',
        );
      }

      // Notes access threshold requires Explorer Pro
      if (
        payload.notesAccessThreshold &&
        payload.notesAccessThreshold > 0 &&
        !matchRoles(userRole, [UserRole.CREATOR])
      ) {
        throw new ServiceBadRequestException(
          'Setting a notes access threshold requires Explorer Pro',
        );
      }

      // create an expedition
      const expedition = await this.prisma.expedition.create({
        data: {
          public_id: generator.publicId(),
          title: payload.title,
          description: payload.description,
          public:
            payload.visibility === 'private' ? false : payload.public ?? true,
          visibility:
            payload.visibility ||
            (payload.public === false ? 'private' : 'public'),
          status: payload.status ?? 'planned',
          start_date: payload.startDate ? new Date(payload.startDate) : null,
          end_date: payload.endDate ? new Date(payload.endDate) : null,
          cover_image: payload.coverImage,
          category: payload.category,
          region: payload.region,
          tags: payload.tags ? JSON.stringify(payload.tags) : null,
          is_round_trip: payload.isRoundTrip ?? false,
          route_mode: payload.routeMode || null,
          route_geometry: payload.routeGeometry
            ? JSON.stringify(payload.routeGeometry)
            : null,
          route_leg_modes: payload.routeLegModes
            ? JSON.stringify(payload.routeLegModes)
            : null,
          route_distance_km: payload.routeDistanceKm ?? null,
          goal: payload.goal ? Math.round(payload.goal * 100) : 0,
          notes_access_threshold: payload.notesAccessThreshold
            ? Math.round(payload.notesAccessThreshold * 100)
            : 0,
          notes_visibility: payload.notesVisibility || 'public',
          early_access_enabled: payload.earlyAccessEnabled ?? false,
          author_id: explorerId,
        },
        select: {
          public_id: true,
          waypoints: {
            select: {
              waypoint: {
                select: { lat: true, lon: true },
              },
            },
          },
        },
      });

      // Drafts don't affect resting status
      if (payload.status !== 'draft') {
        await this.checkAndUpdateRestingStatus(explorerId);
      }

      // Notify followers when a non-draft expedition is created
      if (payload.status && payload.status !== 'draft') {
        this.eventService.trigger({
          event: EVENTS.EXPEDITION_PUBLISHED,
          data: {
            expeditionPublicId: expedition.public_id,
            creatorId: explorerId,
            expeditionTitle: payload.title,
          },
        });
      }

      const response: IExpeditionCreateResponse = {
        expeditionId: expedition.public_id,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async updateExpedition({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { id: string },
    IExpeditionUpdatePayload
  >): Promise<void> {
    try {
      const { id } = query;
      const { explorerId, userRole } = session;

      // check access - any authenticated user can update their own expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // get the expedition (must be owned by this user)
      if (!id) throw new ServiceNotFoundException('expedition not found');
      const expedition = await this.prisma.expedition.findFirstOrThrow({
        where: { public_id: id, author_id: explorerId, deleted_at: null },
        select: {
          id: true,
          visibility: true,
          status: true,
          start_date: true,
          public_id: true,
          title: true,
          author_id: true,
        },
      });

      // Status-based edit restrictions
      const isCancelled = expedition.status === 'cancelled';
      const isCompleted = expedition.status === 'completed';

      if (isCancelled) {
        throw new ServiceForbiddenException(
          'Cancelled expeditions cannot be edited',
        );
      }

      // update the expedition
      const {
        title,
        public: isPublic,
        description,
        status,
        startDate,
        endDate,
        coverImage,
        goal,
        category,
        region,
        tags,
        isRoundTrip,
        routeMode,
        routeGeometry,
      } = payload as any;

      // Completed expeditions: block date, goal, visibility, and sponsorship changes
      if (isCompleted) {
        const blockedFields = {
          startDate,
          endDate,
          goal,
          category,
          region,
          tags,
          visibility: (payload as any).visibility,
          notesAccessThreshold: (payload as any).notesAccessThreshold,
          notesVisibility: (payload as any).notesVisibility,
        };
        const hasBlockedField = Object.entries(blockedFields).some(
          ([, v]) => v !== undefined,
        );
        if (hasBlockedField) {
          throw new ServiceForbiddenException(
            'Completed expeditions can only update title, description, cover image, waypoints, and route',
          );
        }
      }
      const updateData: any = { title };
      if ((payload as any).visibility !== undefined) {
        const vis = (payload as any).visibility;
        if (['public', 'off-grid', 'private'].includes(vis)) {
          // Private is locked: cannot change to or from private after creation
          const currentVis = expedition.visibility || 'public';
          const isPrivateTransition =
            (currentVis === 'private') !== (vis === 'private');
          // Private visibility lock only applies to published expeditions
          if (expedition.status !== 'draft' && isPrivateTransition) {
            throw new ServiceBadRequestException(
              'Expedition visibility cannot be changed to or from private after creation',
            );
          }
          updateData.visibility = vis;
          updateData.public = vis !== 'private';
        }
      } else if (isPublic !== undefined) {
        updateData.public = isPublic;
        updateData.visibility = isPublic ? 'public' : 'private';
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (status !== undefined) {
        updateData.status = status;
      }
      if (startDate !== undefined) {
        if (startDate) {
          const newStartDate = new Date(startDate);
          // Skip validation if the date hasn't actually changed
          const dateChanged =
            !expedition.start_date ||
            newStartDate.toISOString().split('T')[0] !==
              expedition.start_date.toISOString().split('T')[0];
          // Only planned expeditions can have their start date changed
          if (
            dateChanged &&
            expedition.start_date &&
            expedition.status !== 'planned' &&
            expedition.status !== 'draft'
          ) {
            throw new ServiceBadRequestException(
              'Start date can only be changed for planned expeditions',
            );
          }
          // If expedition already has a start_date, enforce ±30 day limit
          if (
            dateChanged &&
            expedition.start_date &&
            expedition.status !== 'draft'
          ) {
            const diffMs = Math.abs(
              newStartDate.getTime() - expedition.start_date.getTime(),
            );
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays > 30) {
              throw new ServiceBadRequestException(
                'Start date can only be changed within 30 days of the original date',
              );
            }
          }
          updateData.start_date = newStartDate;
        } else {
          updateData.start_date = null;
        }
      }
      if (endDate !== undefined) {
        updateData.end_date = endDate ? new Date(endDate) : null;
      }
      if (coverImage !== undefined) {
        updateData.cover_image = coverImage;
      }
      if (goal !== undefined) {
        // Sponsorship goal requires Explorer Pro
        if (goal > 0 && !matchRoles(userRole, [UserRole.CREATOR])) {
          throw new ServiceBadRequestException(
            'Setting a sponsorship goal requires Explorer Pro',
          );
        }
        updateData.goal = Math.round(goal * 100);
      }
      const notesAccessThreshold = (payload as any).notesAccessThreshold;
      if (notesAccessThreshold !== undefined) {
        if (
          notesAccessThreshold > 0 &&
          !matchRoles(userRole, [UserRole.CREATOR])
        ) {
          throw new ServiceBadRequestException(
            'Setting a notes access threshold requires Explorer Pro',
          );
        }
        updateData.notes_access_threshold = Math.round(
          notesAccessThreshold * 100,
        );
      }
      const notesVisibility = (payload as any).notesVisibility;
      if (notesVisibility !== undefined) {
        updateData.notes_visibility = notesVisibility;
      }
      const earlyAccessEnabled = (payload as any).earlyAccessEnabled;
      if (earlyAccessEnabled !== undefined) {
        updateData.early_access_enabled = earlyAccessEnabled;
      }
      if (category !== undefined) {
        updateData.category = category;
      }
      if (region !== undefined) {
        updateData.region = region;
      }
      if (tags !== undefined) {
        updateData.tags = tags ? JSON.stringify(tags) : null;
      }
      if (isRoundTrip !== undefined) {
        updateData.is_round_trip = isRoundTrip;
      }
      if (routeMode !== undefined) {
        updateData.route_mode = routeMode || null;
      }
      if (routeGeometry !== undefined) {
        updateData.route_geometry = routeGeometry
          ? JSON.stringify(routeGeometry)
          : null;
      }
      if (payload.routeLegModes !== undefined) {
        updateData.route_leg_modes = payload.routeLegModes
          ? JSON.stringify(payload.routeLegModes)
          : null;
      }
      if (payload.routeDistanceKm !== undefined) {
        updateData.route_distance_km = payload.routeDistanceKm ?? null;
      }
      await this.prisma.expedition.update({
        where: { id: expedition.id },
        data: updateData,
      });

      // Notify followers when expedition is published (draft → planned/active)
      if (
        expedition.status === 'draft' &&
        status !== undefined &&
        status !== 'draft'
      ) {
        this.eventService.trigger({
          event: EVENTS.EXPEDITION_PUBLISHED,
          data: {
            expeditionPublicId: expedition.public_id,
            creatorId: explorerId,
            expeditionTitle: title || expedition.title,
          },
        });
      }

      // Skip notifications for draft expeditions
      if (expedition.status !== 'draft') {
        // Notify sponsors when expedition goes off-grid
        const oldVisibility = expedition.visibility || 'public';
        const newVisibility = updateData.visibility;
        if (newVisibility === 'off-grid' && oldVisibility !== 'off-grid') {
          try {
            const sponsors = await this.prisma.sponsorship.findMany({
              where: {
                sponsored_explorer_id: explorerId,
                status: { in: ['active', 'ACTIVE', 'confirmed', 'CONFIRMED'] },
                deleted_at: null,
              },
              select: { sponsor_id: true },
            });

            for (const sponsor of sponsors) {
              this.eventService.trigger<IUserNotificationCreatePayload>({
                event: EVENTS.NOTIFICATION_CREATE,
                data: {
                  context: UserNotificationContext.EXPEDITION_OFF_GRID,
                  userId: sponsor.sponsor_id,
                  mentionUserId: explorerId,
                  body: `An expedition you sponsor has gone off-grid. Access it from your Sponsorships dashboard.`,
                },
              });
            }
          } catch (notifErr) {
            this.logger.error(
              'Failed to send off-grid notifications:',
              notifErr,
            );
          }
        }

        // Notify sponsors when start date changes
        if (
          updateData.start_date &&
          expedition.start_date &&
          updateData.start_date.getTime() !== expedition.start_date.getTime()
        ) {
          try {
            const sponsors = await this.prisma.sponsorship.findMany({
              where: {
                sponsored_explorer_id: explorerId,
                status: { in: ['active', 'ACTIVE', 'confirmed', 'CONFIRMED'] },
                deleted_at: null,
              },
              select: { sponsor_id: true },
            });

            const formattedDate = dateformat(updateData.start_date).format(
              'MMMM D, YYYY',
            );
            for (const sponsor of sponsors) {
              this.eventService.trigger<IUserNotificationCreatePayload>({
                event: EVENTS.NOTIFICATION_CREATE,
                data: {
                  context: UserNotificationContext.EXPEDITION_DATE_CHANGED,
                  userId: sponsor.sponsor_id,
                  mentionUserId: explorerId,
                  expeditionPublicId: expedition.public_id,
                  body: `"${expedition.title}" start date has been changed to ${formattedDate}.`,
                },
              });
            }
          } catch (notifErr) {
            this.logger.error(
              'Failed to send date change notifications:',
              notifErr,
            );
          }
        }
      }

      // Drafts don't affect resting status
      if (expedition.status !== 'draft') {
        await this.checkAndUpdateRestingStatus(explorerId);
      }
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async deleteExpedition({
    session,
    query,
  }: ISessionQuery<{ id: string }>): Promise<void> {
    try {
      const { id } = query;
      const { explorerId } = session;

      // check access - any authenticated user can delete their own expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // get the expedition (must be owned by this user)
      if (!id) throw new ServiceNotFoundException('expedition not found');
      const expedition = await this.prisma.expedition.findFirstOrThrow({
        where: { public_id: id, author_id: explorerId, deleted_at: null },
        select: {
          id: true,
          public_id: true,
          title: true,
          status: true,
          author_id: true,
          cover_image: true,
        },
      });

      // delete the expedition
      await this.prisma.expedition.update({
        where: { id: expedition.id },
        data: { deleted_at: dateformat().toDate() },
      });

      // Clean up S3 cover image
      if (expedition.cover_image) {
        await this.uploadService.deleteFromS3(expedition.cover_image);
      }

      // Emit cancellation event so sponsors stop being billed
      const cancellableStatuses = ['planned', 'active'];
      if (cancellableStatuses.includes(expedition.status || '')) {
        this.eventService.trigger({
          event: EVENTS.EXPEDITION_CANCELLED,
          data: {
            expeditionPublicId: expedition.public_id,
            expeditionTitle: expedition.title,
            explorerId: expedition.author_id,
            cancellationReason: 'Expedition deleted by explorer',
          },
        });
      }

      await this.checkAndUpdateRestingStatus(explorerId);
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async completeExpedition({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { id: string },
    { actualEndDate: string }
  >): Promise<void> {
    try {
      const { id } = query;
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!id) throw new ServiceNotFoundException('expedition not found');

      // Get expedition and verify ownership
      const expedition = await this.prisma.expedition.findFirstOrThrow({
        where: { public_id: id, author_id: explorerId, deleted_at: null },
        select: {
          id: true,
          public_id: true,
          title: true,
          status: true,
          author_id: true,
          start_date: true,
        },
      });

      // Can only complete active or planned expeditions
      const allowedStatuses = ['planned', 'active'];
      if (!allowedStatuses.includes(expedition.status || '')) {
        throw new ServiceBadRequestException(
          'Only planned or active expeditions can be completed',
        );
      }

      // Validate actual end date
      const endDate = new Date(payload.actualEndDate);
      if (isNaN(endDate.getTime())) {
        throw new ServiceBadRequestException('Invalid end date');
      }
      if (expedition.start_date && endDate < expedition.start_date) {
        throw new ServiceBadRequestException(
          'End date cannot be before start date',
        );
      }

      // Update expedition
      await this.prisma.expedition.update({
        where: { id: expedition.id },
        data: {
          status: 'completed',
          end_date: endDate,
        },
      });

      // Emit completion event for sponsor notifications
      this.eventService.trigger({
        event: EVENTS.EXPEDITION_COMPLETED,
        data: {
          expeditionPublicId: expedition.public_id,
          expeditionTitle: expedition.title,
          explorerId: expedition.author_id,
        },
      });

      await this.checkAndUpdateRestingStatus(explorerId);
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async cancelExpedition({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { id: string },
    { cancellationReason: string }
  >): Promise<void> {
    try {
      const { id } = query;
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!id) throw new ServiceNotFoundException('expedition not found');

      // Get expedition and verify ownership
      const expedition = await this.prisma.expedition.findFirstOrThrow({
        where: { public_id: id, author_id: explorerId, deleted_at: null },
        select: {
          id: true,
          public_id: true,
          title: true,
          status: true,
          author_id: true,
        },
      });

      // Can only cancel planned or active expeditions
      const allowedStatuses = ['planned', 'active'];
      if (!allowedStatuses.includes(expedition.status || '')) {
        throw new ServiceBadRequestException(
          'Only planned or active expeditions can be cancelled',
        );
      }

      // Update expedition
      await this.prisma.expedition.update({
        where: { id: expedition.id },
        data: {
          status: 'cancelled',
          cancelled_at: dateformat().toDate(),
          cancellation_reason: payload.cancellationReason,
        },
      });

      // Emit cancellation event for sponsor refunds and notifications
      this.eventService.trigger({
        event: EVENTS.EXPEDITION_CANCELLED,
        data: {
          expeditionPublicId: expedition.public_id,
          expeditionTitle: expedition.title,
          explorerId: expedition.author_id,
          cancellationReason: payload.cancellationReason,
        },
      });

      await this.checkAndUpdateRestingStatus(explorerId);
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async updateExpeditionLocation({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { id: string },
    { source: string; locationId: string; visibility?: string }
  >): Promise<void> {
    try {
      const { id } = query;
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!id) throw new ServiceNotFoundException('expedition not found');

      // Verify ownership and get current state
      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: { public_id: id, author_id: explorerId, deleted_at: null },
          select: {
            id: true,
            status: true,
            start_date: true,
            waypoints: {
              select: { waypoint_id: true },
              orderBy: { sequence: 'asc' },
              take: 1,
            },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      if (
        expedition.status === 'completed' ||
        expedition.status === 'cancelled'
      ) {
        throw new ServiceForbiddenException(
          'Location cannot be updated on completed or cancelled expeditions',
        );
      }

      const { source, locationId, visibility } = payload;

      // Validate visibility if provided
      if (
        visibility &&
        !['public', 'sponsors', 'private'].includes(visibility)
      ) {
        throw new ServiceException(
          'visibility must be "public", "sponsors", or "private"',
          400,
        );
      }

      // Validate source value
      if (source !== 'waypoint' && source !== 'entry') {
        throw new ServiceException('source must be "waypoint" or "entry"', 400);
      }

      // Validate that the referenced item belongs to this expedition
      if (source === 'waypoint') {
        const waypointId = parseInt(locationId, 10);
        if (isNaN(waypointId)) {
          throw new ServiceException('invalid waypoint ID', 400);
        }
        await this.prisma.expeditionWaypoint
          .findFirstOrThrow({
            where: {
              expedition_id: expedition.id,
              waypoint_id: waypointId,
            },
          })
          .catch(() => {
            throw new ServiceNotFoundException(
              'waypoint not found on this expedition',
            );
          });
      } else {
        await this.prisma.entry
          .findFirstOrThrow({
            where: {
              public_id: locationId,
              expedition_id: expedition.id,
              deleted_at: null,
            },
          })
          .catch(() => {
            throw new ServiceNotFoundException(
              'entry not found on this expedition',
            );
          });
      }

      // Determine if this should auto-activate the expedition
      // Setting location to anything other than the first waypoint triggers activation
      const firstWaypointId = expedition.waypoints[0]?.waypoint_id;
      const isStartPoint =
        source === 'waypoint' &&
        firstWaypointId != null &&
        parseInt(locationId, 10) === firstWaypointId;
      const shouldActivate = expedition.status === 'planned' && !isStartPoint;

      // Build update data
      const updateData: Record<string, any> = {
        current_location_type: source,
        current_location_id: locationId,
        ...(visibility ? { current_location_visibility: visibility } : {}),
      };

      if (shouldActivate) {
        updateData.status = 'active';
        // Set start date to today if not already set or if it's in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!expedition.start_date || expedition.start_date > today) {
          updateData.start_date = today;
        }
      }

      // Update the expedition
      await this.prisma.expedition.update({
        where: { id: expedition.id },
        data: updateData,
      });

      await this.checkAndUpdateRestingStatus(explorerId);
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async createExpeditionWaypoint({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { expeditionId: string },
    IWaypointCreatePayload
  >): Promise<{ waypointId: number }> {
    try {
      const { expeditionId } = query;
      const { explorerId } = session;

      // check access - any authenticated user can add waypoints to their own expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // get an expedition
      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');
      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: {
            public_id: expeditionId,
            author_id: explorerId,
            deleted_at: null,
          },
          select: { id: true, status: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      if (expedition.status === 'cancelled') {
        throw new ServiceForbiddenException(
          'Waypoints cannot be modified on cancelled expeditions',
        );
      }

      // create a waypoint
      const { title, lat, lon, date, description, sequence } = payload;
      // Convert date: string → Date, null → null (no date), undefined → undefined (Prisma skips)
      const dateTime = date
        ? new Date(date as unknown as string)
        : date === null
          ? null
          : undefined;
      const created = await this.prisma.expeditionWaypoint.create({
        data: {
          sequence: sequence ?? 0,
          waypoint: {
            create: {
              title,
              lat,
              lon,
              date: dateTime,
              description,
            },
          },

          expedition: {
            connect: {
              id: expedition.id,
            },
          },
        },
        select: { waypoint_id: true },
      });

      return { waypointId: created.waypoint_id };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async updateExpeditionWaypoint({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { expeditionId: string; waypointId: number },
    IWaypointUpdatePayload
  >): Promise<void> {
    try {
      const { expeditionId, waypointId } = query;
      const { explorerId } = session;

      // check access - any authenticated user can update waypoints on their own expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // get the expedition (must be owned by this user)
      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');
      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: {
            public_id: expeditionId,
            author_id: explorerId,
            deleted_at: null,
          },
          select: { id: true, status: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      if (expedition.status === 'cancelled') {
        throw new ServiceForbiddenException(
          'Waypoints cannot be modified on cancelled expeditions',
        );
      }

      // get the waypoint
      if (!waypointId) throw new ServiceNotFoundException('waypoint not found');
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id: waypointId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      // update the waypoint
      const { title, lat, lon, date, description, sequence } = payload;
      // Convert date: string → Date, null → null (clear date), undefined → undefined (Prisma skips)
      const dateTime = date
        ? new Date(date as unknown as string)
        : date === null
          ? null
          : undefined;
      await this.prisma.waypoint.update({
        where: { id: waypoint.id },
        data: {
          title,
          lat,
          lon,
          date: dateTime,
          description,
        },
      });

      // Update sequence on the join table if provided
      if (sequence !== undefined) {
        const expedition = await this.prisma.expedition.findFirstOrThrow({
          where: { public_id: expeditionId },
          select: { id: true },
        });
        await this.prisma.expeditionWaypoint.update({
          where: {
            expedition_id_waypoint_id: {
              expedition_id: expedition.id,
              waypoint_id: waypoint.id,
            },
          },
          data: { sequence },
        });
      }
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async deleteExpeditionWaypoint({
    session,
    query,
  }: ISessionQuery<{
    expeditionId: string;
    waypointId: number;
  }>): Promise<void> {
    try {
      const { expeditionId, waypointId } = query;
      const { explorerId } = session;

      // check access - any authenticated user can delete waypoints on their own expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // get the expedition (must be owned by this user)
      if (!expeditionId)
        throw new ServiceNotFoundException('expedition not found');
      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: {
            public_id: expeditionId,
            author_id: explorerId,
            deleted_at: null,
          },
          select: { id: true, status: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      if (expedition.status === 'cancelled') {
        throw new ServiceForbiddenException(
          'Waypoints cannot be modified on cancelled expeditions',
        );
      }

      // get the waypoint
      if (!waypointId) throw new ServiceNotFoundException('waypoint not found');
      const waypoint = await this.prisma.waypoint
        .findFirstOrThrow({
          where: { id: waypointId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('waypoint not found');
        });

      // delete the waypoint
      await this.prisma.expeditionWaypoint.deleteMany({
        where: {
          expedition_id: expedition.id,
          waypoint_id: waypoint.id,
        },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async bookmark({
    query,
    session,
  }: ISessionQuery<{
    publicId: string;
  }>): Promise<IExpeditionBookmarkResponse> {
    try {
      const { publicId } = query;
      const { explorerId } = session;

      if (!publicId || !explorerId)
        throw new ServiceNotFoundException('expedition not found');

      // check if the expedition exists
      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: { public_id: publicId, deleted_at: null },
          select: {
            id: true,
            bookmarks_count: true,
          },
        })
        .catch(() => null);

      if (!expedition)
        throw new ServiceNotFoundException('expedition not found');

      // wrap in transaction to prevent race conditions on count fields
      const updatedExpedition = await this.prisma.$transaction(async (tx) => {
        // check if it is bookmarked already
        const bookmarked = await tx.expeditionBookmark.findUnique({
          where: {
            expedition_id_explorer_id: {
              expedition_id: expedition.id,
              explorer_id: explorerId,
            },
          },
        });

        if (bookmarked) {
          // delete the bookmark
          await tx.expeditionBookmark.delete({
            where: {
              expedition_id_explorer_id: {
                expedition_id: expedition.id,
                explorer_id: explorerId,
              },
            },
          });
        } else {
          // create a bookmark
          await tx.expeditionBookmark.create({
            data: {
              expedition_id: expedition.id,
              explorer_id: explorerId,
            },
          });
        }

        // update the explorer bookmark count
        await tx.explorer.update({
          where: { id: explorerId },
          data: {
            bookmarks_count: bookmarked ? { decrement: 1 } : { increment: 1 },
          },
        });

        // update the bookmark count
        return tx.expedition.update({
          where: { id: expedition.id },
          data: {
            bookmarks_count: bookmarked ? { decrement: 1 } : { increment: 1 },
          },
        });
      });

      const response: IExpeditionBookmarkResponse = {
        bookmarksCount: updatedExpedition.bookmarks_count,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getDraftExpeditions({ session }: ISessionQuery<{}>): Promise<any> {
    try {
      const { explorerId } = session;
      if (!explorerId) throw new ServiceForbiddenException();

      const drafts = await this.prisma.expedition.findMany({
        where: {
          author_id: explorerId,
          status: 'draft',
          deleted_at: null,
        },
        orderBy: { updated_at: 'desc' },
        take: 10,
        select: {
          public_id: true,
          title: true,
          description: true,
          visibility: true,
          status: true,
          start_date: true,
          end_date: true,
          cover_image: true,
          category: true,
          region: true,
          tags: true,
          is_round_trip: true,
          route_mode: true,
          route_geometry: true,
          route_leg_modes: true,
          route_distance_km: true,
          goal: true,
          notes_access_threshold: true,
          notes_visibility: true,
          early_access_enabled: true,
          updated_at: true,
          waypoints: {
            orderBy: { sequence: 'asc' },
            select: {
              sequence: true,
              waypoint: {
                select: {
                  id: true,
                  title: true,
                  lat: true,
                  lon: true,
                  date: true,
                  description: true,
                  entries: {
                    where: { deleted_at: null },
                    select: { public_id: true },
                  },
                },
              },
            },
          },
        },
      });

      return {
        data: drafts.map((d) => ({
          id: d.public_id,
          title: d.title,
          description: d.description,
          visibility: d.visibility || 'public',
          status: d.status,
          startDate: d.start_date,
          endDate: d.end_date,
          coverImage: getStaticMediaUrl(d.cover_image),
          category: d.category,
          region: d.region,
          tags: d.tags ? JSON.parse(d.tags) : [],
          isRoundTrip: d.is_round_trip ?? false,
          routeMode: d.route_mode || undefined,
          routeGeometry: d.route_geometry
            ? JSON.parse(d.route_geometry)
            : undefined,
          routeLegModes: d.route_leg_modes
            ? JSON.parse(d.route_leg_modes)
            : undefined,
          routeDistanceKm: d.route_distance_km ?? undefined,
          goal: integerToDecimal(d.goal ?? 0),
          notesAccessThreshold: integerToDecimal(d.notes_access_threshold ?? 0),
          notesVisibility: d.notes_visibility || 'public',
          earlyAccessEnabled: d.early_access_enabled ?? false,
          updatedAt: d.updated_at,
          waypoints: d.waypoints.map(({ sequence, waypoint }) => ({
            id: waypoint.id,
            title: waypoint.title,
            lat: waypoint.lat,
            lon: waypoint.lon,
            date: waypoint.date,
            description: waypoint.description,
            sequence,
            entryIds:
              (waypoint as any).entries?.map((e: any) => e.public_id) || [],
          })),
        })),
      };
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async publishDraftExpedition({
    session,
    query,
  }: ISessionQuery<{ id: string }>): Promise<void> {
    try {
      const { id } = query;
      const { explorerId, userRole } = session;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!id) throw new ServiceNotFoundException('expedition not found');

      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: { public_id: id, author_id: explorerId, deleted_at: null },
          select: {
            id: true,
            status: true,
            title: true,
            description: true,
            region: true,
            category: true,
            start_date: true,
            cover_image: true,
            end_date: true,
            goal: true,
            notes_access_threshold: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      if (expedition.status !== 'draft') {
        throw new ServiceBadRequestException(
          'Only draft expeditions can be published',
        );
      }

      // Validation
      const errors: string[] = [];
      if (!expedition.title?.trim()) errors.push('Title is required');
      if (!expedition.description?.trim())
        errors.push('Description is required');
      if (!expedition.region?.trim()) errors.push('Region is required');
      if (!expedition.category?.trim()) errors.push('Category is required');
      if (!expedition.start_date) errors.push('Start date is required');
      if (!expedition.cover_image) errors.push('Cover image is required');

      // Pro checks
      if (
        expedition.goal &&
        expedition.goal > 0 &&
        !matchRoles(userRole, [UserRole.CREATOR])
      ) {
        errors.push('Setting a sponsorship goal requires Explorer Pro');
      }
      if (
        expedition.notes_access_threshold &&
        expedition.notes_access_threshold > 0 &&
        !matchRoles(userRole, [UserRole.CREATOR])
      ) {
        errors.push('Setting a notes access threshold requires Explorer Pro');
      }

      if (errors.length > 0) {
        throw new ServiceBadRequestException(errors.join('; '));
      }

      // Compute status from dates
      const now = new Date();
      let newStatus = 'planned';
      if (expedition.start_date) {
        if (expedition.end_date && expedition.end_date <= now) {
          newStatus = 'completed';
        } else if (expedition.start_date <= now) {
          newStatus = 'active';
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.expedition.update({
          where: { id: expedition.id },
          data: { status: newStatus },
        });
      });

      await this.checkAndUpdateRestingStatus(explorerId);
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async syncExpeditionWaypoints({
    session,
    query,
    payload,
  }: ISessionQueryWithPayload<
    { id: string },
    {
      waypoints: Array<{
        lat: number;
        lon: number;
        title?: string;
        date?: string;
        description?: string;
        sequence: number;
        entryId?: string;
        entryIds?: string[];
      }>;
    }
  >): Promise<void> {
    try {
      const { id } = query;
      const { explorerId } = session;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!id) throw new ServiceNotFoundException('expedition not found');

      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: { public_id: id, author_id: explorerId, deleted_at: null },
          select: { id: true, status: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      if (expedition.status === 'cancelled') {
        throw new ServiceForbiddenException(
          'Waypoints cannot be modified on cancelled expeditions',
        );
      }

      await this.prisma.$transaction(
        async (tx) => {
          // Delete existing waypoint joins and orphaned waypoints
          const existingJoins = await tx.expeditionWaypoint.findMany({
            where: { expedition_id: expedition.id },
            select: { waypoint_id: true },
          });

          // Unlink entries from old waypoints before soft-deleting them
          if (existingJoins.length > 0) {
            await tx.entry.updateMany({
              where: {
                waypoint_id: { in: existingJoins.map((j) => j.waypoint_id) },
              },
              data: { waypoint_id: null },
            });
          }

          await tx.expeditionWaypoint.deleteMany({
            where: { expedition_id: expedition.id },
          });

          // Soft-delete orphaned waypoints
          if (existingJoins.length > 0) {
            await tx.waypoint.updateMany({
              where: {
                id: { in: existingJoins.map((j) => j.waypoint_id) },
              },
              data: { deleted_at: new Date() },
            });
          }

          // Create new waypoints and link entries in parallel
          await Promise.all(
            payload.waypoints.map(async (wp) => {
              const dateTime = wp.date ? new Date(wp.date) : null;
              const result = await tx.expeditionWaypoint.create({
                data: {
                  sequence: wp.sequence,
                  waypoint: {
                    create: {
                      title: wp.title,
                      lat: wp.lat,
                      lon: wp.lon,
                      date: dateTime,
                      description: wp.description,
                    },
                  },
                  expedition: {
                    connect: { id: expedition.id },
                  },
                },
                include: { waypoint: true },
              });

              // Link entries to the new waypoint
              const idsToLink = [
                ...(wp.entryId ? [wp.entryId] : []),
                ...(wp.entryIds || []),
              ];
              if (idsToLink.length > 0) {
                await tx.entry.updateMany({
                  where: {
                    public_id: { in: idsToLink },
                    expedition_id: expedition.id,
                  },
                  data: { waypoint_id: result.waypoint.id },
                });
              }
            }),
          );
        },
        { timeout: 15000 },
      );
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
