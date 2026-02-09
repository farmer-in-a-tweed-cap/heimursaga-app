import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
} from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { integerToDecimal, normalizeText } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { resolveExpeditionLocations } from '@/lib/resolve-expedition-location';
import { getStaticMediaUrl } from '@/lib/upload';
import { matchRoles, sortByDate } from '@/lib/utils';

import {
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

@Injectable()
export class ExpeditionService {
  constructor(
    private logger: Logger,
    private prisma: PrismaService,
    private eventService: EventService,
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
   * Get unique sponsor counts for a list of explorer IDs.
   * Returns a Map of explorerId -> unique sponsor count.
   */
  private async getUniqueSponsorCounts(
    authorIds: number[],
  ): Promise<Map<number, number>> {
    if (authorIds.length === 0) return new Map();

    const counts = await this.prisma.sponsorship.groupBy({
      by: ['sponsored_explorer_id', 'sponsor_id'],
      where: {
        sponsored_explorer_id: { in: authorIds },
        deleted_at: null,
        status: { in: ['active', 'confirmed', 'completed'] },
      },
    });

    // Count distinct sponsor_id per sponsored_explorer_id
    const map = new Map<number, Set<number>>();
    for (const row of counts) {
      if (!map.has(row.sponsored_explorer_id)) {
        map.set(row.sponsored_explorer_id, new Set());
      }
      map.get(row.sponsored_explorer_id)!.add(row.sponsor_id);
    }

    const result = new Map<number, number>();
    for (const [authorId, sponsors] of map) {
      result.set(authorId, sponsors.size);
    }
    return result;
  }

  async getExpeditions({
    query,
    session,
  }: IQueryWithSession<{ context?: string }>): Promise<IExpeditionGetAllResponse> {
    try {
      const { context } = query;
      const { explorerId, explorerRole } = session;

      let where: Prisma.ExpeditionWhereInput = {
        deleted_at: null,
      };

      const take = 50;

      // query based on the explorer role (or public access for unauthenticated users)
      if (!explorerId) {
        // Unauthenticated: show only public expeditions
        where = {
          ...where,
          public: true,
        };
      } else {
        switch (explorerRole) {
          case ExplorerRole.CREATOR:
            where = {
              ...where,
              OR: [{ public: true }, { author_id: explorerId }],
            };
            break;
          case ExplorerRole.USER:
            where = {
              ...where,
              public: true,
            };
            break;
          default:
            // Default to public expeditions
            where = {
              ...where,
              public: true,
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
        if (followedIds.length === 0) return { data: [], results: 0 };
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
          status: true,
          start_date: true,
          end_date: true,
          cover_image: true,
          category: true,
          region: true,
          tags: true,
          is_round_trip: true,
          goal: true,
          raised: true,
          entries_count: true,
          author_id: true,
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
                },
              },
            },
          },
        },
        take,
        orderBy: context === 'following' ? [{ updated_at: 'desc' }] : [{ id: 'desc' }],
      });

      // Get unique sponsor counts per author
      const authorIds = [...new Set(data.map((d) => d.author_id))];
      const sponsorCounts = await this.getUniqueSponsorCounts(authorIds);

      const response: IExpeditionGetAllResponse = {
        results,
        data: data.map(
          ({
            id: _id,
            public_id,
            title,
            description,
            public: isPublic,
            author,
            author_id,
            status,
            start_date,
            end_date,
            cover_image,
            is_round_trip,
            goal,
            raised,
            entries_count,
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

            return {
              id: public_id,
              title,
              description,
              public: isPublic,
              status,
              startDate,
              endDate,
              coverImage: getStaticMediaUrl(cover_image),
              isRoundTrip: is_round_trip ?? false,
              goal,
              raised,
              sponsorsCount: sponsorCounts.get(author_id) ?? 0,
              entriesCount: entries_count,
              author: author
                ? {
                    username: author.username,
                    name: author.profile?.name,
                    picture: getStaticMediaUrl(author.profile?.picture),
                  }
                : undefined,
              waypointsCount: waypoints.length,
              waypoints: [],
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
  }: IQueryWithSession<{
    username: string;
  }>): Promise<IExpeditionGetAllResponse> {
    try {
      const { username } = query;

      if (!username) throw new ServiceNotFoundException('explorer not found');

      // get expeditions
      const where = {
        author: { username },
        public: true,
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
          category: true,
          region: true,
          tags: true,
          is_round_trip: true,
          goal: true,
          raised: true,
          entries_count: true,
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
                },
              },
            },
          },
          author: {
            select: {
              username: true,
              profile: { select: { picture: true, name: true } },
            },
          },
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

      // Get unique sponsor counts per author
      const authorIds = [...new Set(data.map((d) => d.author_id))];
      const sponsorCounts = await this.getUniqueSponsorCounts(authorIds);

      const response: IExpeditionGetAllResponse = {
        results,
        data: data.map(
          ({
            public_id,
            title,
            description,
            cover_image,
            status,
            category,
            region,
            tags,
            is_round_trip,
            goal,
            raised,
            entries_count,
            author_id,
            start_date,
            end_date,
            current_location_type,
            current_location_id,
            current_location_visibility,
            author,
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

            // Use expedition dates if available, otherwise fall back to earliest/latest waypoint dates
            const startDate =
              start_date ||
              (datedWaypoints.length >= 1
                ? datedWaypoints[0]?.date
                : undefined);
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
              category,
              region,
              tags: tags ? JSON.parse(tags) : [],
              isRoundTrip: is_round_trip ?? false,
              startDate,
              endDate,
              goal,
              raised,
              sponsorsCount: sponsorCounts.get(author_id) ?? 0,
              entriesCount: entries_count,
              waypointsCount: waypoints.length,
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
              currentLocationVisibility:
                (current_location_visibility || 'public') as
                  | 'public'
                  | 'sponsors'
                  | 'private',
              author: author
                ? {
                    username: author.username,
                    picture: getStaticMediaUrl(author.profile.picture),
                    name: author.profile.name,
                  }
                : undefined,
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

      const where: Prisma.ExpeditionWhereInput = {
        public_id: id,
        deleted_at: null,
        // If not authenticated, only show public expeditions
        ...(isAuthenticated ? {} : { public: true }),
      };

      // get an expedition
      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where,
          select: {
            id: true,
            public_id: true,
            public: true,
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
            current_location_type: true,
            current_location_id: true,
            current_location_visibility: true,
            goal: true,
            raised: true,
            entries_count: true,
            author_id: true,
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
                date: true,
                place: true,
                lat: true,
                lon: true,
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
                    upload: {
                      select: {
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
        current_location_type,
        current_location_id,
        current_location_visibility,
        goal,
        raised,
        entries_count,
        public: isPublic,
        waypoints,
        entries,
        author,
      } = expedition;

      // access control - ensure private expeditions are only accessible by their authors
      if (
        !expedition.public &&
        (!isAuthenticated || explorerId !== expedition.author_id)
      ) {
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
      const waypointDates = waypoints.map(({ waypoint: { date } }) => date);
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

      // Get unique sponsor count for this explorer
      const uniqueSponsorCounts = await this.getUniqueSponsorCounts([
        expedition.author_id,
      ]);
      const uniqueSponsorsCount =
        uniqueSponsorCounts.get(expedition.author_id) ?? 0;

      // Fetch all sponsorships for this explorer (public leaderboard + recurring stats)
      const allSponsorships = await this.prisma.sponsorship.findMany({
        where: {
          sponsored_explorer_id: expedition.author_id,
          deleted_at: null,
          status: { in: ['active', 'confirmed'] },
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
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      // Compute recurring sponsorship stats for funding breakdown (public data)
      const recurringSponsors = allSponsorships.filter(
        (s) => s.type === 'subscription',
      );

      const now = new Date();
      const expCreated = created_at ?? now;
      const expEndDate = end_date ?? now;
      const activeRecurring = recurringSponsors.filter(
        (s) => s.status === 'active',
      );
      const monthlyRecurring = activeRecurring.reduce(
        (sum, s) => sum + integerToDecimal(s.amount),
        0,
      );
      const totalRecurringCommitted = recurringSponsors.reduce((sum, s) => {
        const subStart = s.created_at ?? now;
        const overlapStart = subStart > expCreated ? subStart : expCreated;
        if (overlapStart > expEndDate) return sum;
        const months = Math.max(
          1,
          (expEndDate.getFullYear() - overlapStart.getFullYear()) * 12 +
            (expEndDate.getMonth() - overlapStart.getMonth()) +
            1,
        );
        return sum + months * integerToDecimal(s.amount);
      }, 0);

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
        currentLocationVisibility:
          (current_location_visibility as 'public' | 'sponsors' | 'private') ||
          'public',
        currentLocationSource: undefined as 'waypoint' | 'entry' | undefined,
        currentLocationId: undefined as string | undefined,
        goal,
        raised,
        sponsorsCount: uniqueSponsorsCount,
        entriesCount: entries.length,
        recurringStats: {
          activeSponsors: activeRecurring.length,
          monthlyRevenue: monthlyRecurring,
          totalCommitted: totalRecurringCommitted,
        },
        public: isPublic,
        startDate,
        endDate,
        bookmarked: isBookmarked,
        followingAuthor: isFollowingAuthor,
        author: author
          ? {
              username: author.username,
              picture: getStaticMediaUrl(author.profile.picture),
              creator: author.role === ExplorerRole.CREATOR,
            }
          : undefined,
        // Entries directly linked to this expedition
        entries: sortByDate({
          elements: entries.map((entry) => ({
            id: entry.public_id,
            title: entry.title,
            content: normalizeText(entry.content),
            date: entry.date,
            place: entry.place,
            lat: entry.lat,
            lon: entry.lon,
            mediaCount: entry.media?.length || 0,
            author: entry.author
              ? {
                  username: entry.author.username,
                  name: entry.author.profile?.name,
                  picture: getStaticMediaUrl(entry.author.profile?.picture),
                }
              : undefined,
          })),
          key: 'date',
          order: 'desc',
        }),
        // Waypoints already ordered by sequence from query
        waypoints: waypoints.map(
          ({
            sequence,
            waypoint: { id, lat, lon, title, date, description },
          }) => ({
            id,
            lat,
            lon,
            title,
            date,
            description,
            sequence,
          }),
        ),
        sponsors: allSponsorships.map((s) => ({
          id: s.public_id,
          type: s.type,
          amount: integerToDecimal(s.amount),
          status: s.status,
          message: s.message,
          isPublic: s.is_public ?? true,
          isMessagePublic: s.is_message_public ?? true,
          createdAt: s.created_at,
          user: s.sponsor
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
        })),
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
            status: { in: ['active', 'confirmed'] },
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
      const { explorerId } = session;

      // check access - any authenticated user can create expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // create an expedition
      const expedition = await this.prisma.expedition.create({
        data: {
          public_id: generator.publicId(),
          title: payload.title,
          description: payload.description,
          public: payload.public ?? true, // Default to true if not specified
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
          goal: payload.goal ?? 0,
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

      await this.checkAndUpdateRestingStatus(explorerId);

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
      const { explorerId } = session;

      // check access - any authenticated user can update their own expeditions
      if (!explorerId) throw new ServiceForbiddenException();

      // get the expedition (must be owned by this user)
      if (!id) throw new ServiceNotFoundException('expedition not found');
      const expedition = await this.prisma.expedition.findFirstOrThrow({
        where: { public_id: id, author_id: explorerId, deleted_at: null },
        select: { id: true },
      });

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
      const updateData: any = { title };
      if (isPublic !== undefined) {
        updateData.public = isPublic;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (status !== undefined) {
        updateData.status = status;
      }
      if (startDate !== undefined) {
        updateData.start_date = startDate ? new Date(startDate) : null;
      }
      if (endDate !== undefined) {
        updateData.end_date = endDate ? new Date(endDate) : null;
      }
      if (coverImage !== undefined) {
        updateData.cover_image = coverImage;
      }
      if (goal !== undefined) {
        updateData.goal = goal;
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
        select: { id: true },
      });

      // delete the expedition
      await this.prisma.expedition.update({
        where: { id: expedition.id },
        data: { deleted_at: dateformat().toDate() },
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
  >): Promise<void> {
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
          where: { public_id: expeditionId },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      // create a waypoint
      const { title, lat, lon, date, description, sequence } = payload;
      // Ensure date is a proper ISO-8601 DateTime (date comes in as string from DTO)
      const dateTime = date ? new Date(date as unknown as string) : undefined;
      await this.prisma.expeditionWaypoint.create({
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
      });
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
      await this.prisma.expedition
        .findFirstOrThrow({
          where: {
            public_id: expeditionId,
            author_id: explorerId,
            deleted_at: null,
          },
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

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
      // Ensure date is a proper ISO-8601 DateTime (date comes in as string from DTO)
      const dateTime = date ? new Date(date as unknown as string) : undefined;
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
          select: { id: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

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
}
