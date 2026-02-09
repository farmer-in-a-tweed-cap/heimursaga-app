import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ExplorerRole,
  IEntryCreatePayload,
  IEntryCreateResponse,
  IEntryGetAllResponse,
  IEntryGetByIdResponse,
  IEntryUpdatePayload,
  SponsorshipStatus,
  UserNotificationContext,
} from '@repo/types';
import { IEntryBookmarkResponse, IEntryLikeResponse } from '@repo/types';

import { dateformat } from '@/lib/date-format';
import { normalizeText } from '@/lib/formatter';
import { generator } from '@/lib/generator';
import { getCountryCodeFromCoordinates } from '@/lib/geocoding';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceException,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISessionQuery, ISessionQueryWithPayload } from '@/common/interfaces';
import { EVENTS, EventService } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { IUserNotificationCreatePayload } from '@/modules/notification';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class EntryService {
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

  async getDrafts({ session }: ISessionQuery): Promise<IEntryGetAllResponse> {
    try {
      const { explorerId } = session;

      // Only authenticated explorers can get their drafts
      if (!explorerId) throw new ServiceForbiddenException();

      const where = {
        public_id: { not: null },
        author_id: explorerId,
        is_draft: true,
        deleted_at: null,
      } as Prisma.EntryWhereInput;

      const take = 20; // Limit drafts to recent ones

      // get drafts
      const results = await this.prisma.entry.count({ where });
      const data = await this.prisma.entry.findMany({
        where,
        select: {
          public_id: true,
          title: true,
          content: true,
          public: true,
          sponsored: true,
          is_draft: true,
          place: true,
          date: true,
          created_at: true,
          updated_at: true,
        },
        take,
        orderBy: [{ updated_at: 'desc' }], // Most recently updated drafts first
      });

      const processedData = data.map((entry) => ({
        id: entry.public_id,
        title: entry.title,
        content: entry.content?.slice(0, 140) || '',
        place: entry.place,
        date: entry.date,
        public: entry.public,
        sponsored: entry.sponsored,
        isDraft: entry.is_draft,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
      }));

      const response: IEntryGetAllResponse = {
        data: processedData,
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getEntries({
    query,
    session,
  }: ISessionQuery<{ context?: string }>): Promise<IEntryGetAllResponse> {
    try {
      const { context } = query;
      const { explorerId, explorerRole } = session;

      let where = {
        public_id: { not: null },
        is_draft: false, // Exclude drafts from public views
      } as Prisma.EntryWhereInput;

      const take = 500;

      // filter based on role
      switch (explorerRole) {
        case ExplorerRole.ADMIN:
          where = {
            ...where,
            deleted_at: null,
          };
          break;
        case ExplorerRole.CREATOR:
          where = {
            ...where,
            public: true,
            deleted_at: null,
          };
          break;
        case ExplorerRole.USER:
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

      // Filter to entries from followed explorers
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

      // get entries
      const results = await this.prisma.entry.count({ where });
      const data = await this.prisma.entry.findMany({
        where,
        select: {
          public_id: true,
          title: true,
          content: true,
          public: true,
          sponsored: true,
          is_draft: true,
          lat: true,
          lon: true,
          country_code: true,
          place: true,
          date: true,
          likes_count: true,
          bookmarks_count: true,
          comments_count: true,
          comments_enabled: true,
          author_id: true, // Need this for sponsorship check
          entry_type: true,
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
          // Expedition relation
          expedition: {
            select: {
              public_id: true,
              title: true,
            },
          },
          // check if the session explorer has liked this entry
          likes: explorerId
            ? {
                where: { explorer_id: explorerId },
                select: { entry_id: true },
              }
            : undefined,
          // check if the session explorer has bookmarked this entry
          bookmarks: explorerId
            ? {
                where: { explorer_id: explorerId },
                select: { entry_id: true },
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
        orderBy: context === 'following' ? [{ updated_at: 'desc' }] : [{ date: 'desc' }],
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
          // Allow admins to see all sponsored entries
          else if (explorerRole === ExplorerRole.ADMIN) {
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

      const processedData = filteredEntries.map((entry) => {
        // Calculate word count from content
        const wordCount = entry.content
          ? entry.content
              .trim()
              .split(/\s+/)
              .filter((w) => w.length > 0).length
          : 0;

        // Get cover image: use cover_upload if set, otherwise fallback to first media
        const coverImage = entry.cover_upload?.original
          ? getStaticMediaUrl(entry.cover_upload.original)
          : entry.media?.[0]?.upload?.original
            ? getStaticMediaUrl(entry.media[0].upload.original)
            : undefined;

        return {
          id: entry.public_id,
          lat: entry.lat,
          lon: entry.lon,
          countryCode: entry.country_code,
          place: entry.place,
          date: entry.date,
          title: entry.title,
          public: entry.public,
          sponsored: entry.sponsored,
          isDraft: entry.is_draft,
          content: entry.content.slice(0, 200),
          mediaCount: entry._count?.media || 0,
          wordCount,
          coverImage,
          entryType: entry.entry_type || 'standard',
          expedition: entry.expedition
            ? {
                id: entry.expedition.public_id,
                title: entry.expedition.title,
              }
            : undefined,
          author: entry.author
            ? {
                username: entry.author.username,
                name: entry.author.profile?.name,
                picture: entry.author.profile?.picture
                  ? getStaticMediaUrl(entry.author.profile.picture)
                  : undefined,
                creator: entry.author.role === ExplorerRole.CREATOR,
              }
            : undefined,
          liked: explorerId ? entry.likes.length > 0 : false,
          bookmarked: explorerId ? entry.bookmarks.length > 0 : false,
          likesCount: entry.likes_count,
          bookmarksCount: entry.bookmarks_count,
          commentsCount: entry.comments_count,
          commentsEnabled: entry.comments_enabled,
          createdAt: entry.created_at,
        };
      });

      const response: IEntryGetAllResponse = {
        data: processedData,
        results: filteredEntries.length,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getById({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<IEntryGetByIdResponse> {
    try {
      const { publicId } = query;
      const { explorerId, explorerRole } = session;

      if (!publicId) throw new ServiceNotFoundException('entry not found');

      let where = {
        public_id: publicId,
      } as Prisma.EntryWhereInput;

      // filter based on explorer role
      switch (explorerRole) {
        case ExplorerRole.ADMIN:
          where = { ...where, deleted_at: null };
          break;
        case ExplorerRole.CREATOR:
          where = {
            ...where,
            deleted_at: null,
            OR: [
              { author_id: explorerId }, // Authors can see their own drafts
              { public: true, is_draft: false }, // Everyone can see published public entries
            ],
          };
          break;
        case ExplorerRole.USER:
          where = {
            ...where,
            deleted_at: null,
            OR: [
              { author_id: explorerId }, // Explorers can see their own drafts
              { public: true, is_draft: false }, // Everyone can see published public entries
            ],
          };
          break;
        default:
          where = { ...where, deleted_at: null, public: true, is_draft: false };
          break;
      }

      // get an entry
      const entry = await this.prisma.entry.findFirst({
        where,
        select: {
          public_id: true,
          title: true,
          content: true,
          public: true,
          sponsored: true,
          is_draft: true,
          author_id: true,
          place: true,
          date: true,
          lat: true,
          lon: true,
          country_code: true,
          likes_count: true,
          bookmarks_count: true,
          comments_count: true,
          comments_enabled: true,
          media: {
            select: {
              caption: true,
              alt_text: true,
              credit: true,
              upload: {
                select: {
                  public_id: true,
                  thumbnail: true,
                  original: true,
                },
              },
            },
          },
          // New fields
          entry_type: true,
          cover_upload_id: true,
          is_milestone: true,
          visibility: true,
          cover_upload: {
            select: {
              original: true,
              thumbnail: true,
            },
          },
          // Include expedition relationship
          expedition_id: true, // Need internal ID for entry number calculation
          expedition: {
            select: {
              public_id: true,
              title: true,
              start_date: true, // Need for expeditionDay calculation
            },
          },
          // check if the session explorer has liked this entry
          likes: explorerId
            ? {
                where: { explorer_id: explorerId },
                select: { entry_id: true },
              }
            : undefined,
          // check if the session explorer has bookmarked this entry
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
              // Check if current user follows this author
              followers: explorerId
                ? {
                    where: { follower_id: explorerId },
                    select: { follower_id: true },
                  }
                : undefined,
            },
          },
          created_at: true,
        },
      });

      // handle case where entry was not found (deleted, private, or doesn't exist)
      if (!entry) {
        throw new ServiceNotFoundException('Entry not found');
      }

      // Check access for sponsored entries
      if (entry.sponsored) {
        const isAuthor = explorerId && entry.author_id === explorerId;
        const isAdmin = explorerRole === ExplorerRole.ADMIN;
        const hasSponsorship =
          explorerId &&
          (await this.hasActiveSponsorship(explorerId, entry.author_id));

        if (!isAuthor && !isAdmin && !hasSponsorship) {
          throw new ServiceForbiddenException(
            'Access denied to sponsored content',
          );
        }
      }

      // Calculate entry number within expedition (if entry belongs to one)
      // Uses entry.date (the expedition date) to determine chronological order
      let entryNumber: number | undefined;
      if (entry.expedition_id && entry.date) {
        const earlierEntriesCount = await this.prisma.entry.count({
          where: {
            expedition_id: entry.expedition_id,
            deleted_at: null,
            is_draft: false,
            date: {
              lt: entry.date,
            },
          },
        });
        entryNumber = earlierEntriesCount + 1;
      }

      // Calculate expedition day (days since expedition start when entry was written)
      let expeditionDay: number | undefined;
      if (entry.expedition?.start_date && entry.date) {
        const startDate = new Date(entry.expedition.start_date);
        const entryDate = new Date(entry.date);
        // Calculate days difference, Day 1 is the first day
        const diffTime = entryDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        expeditionDay = Math.max(1, diffDays + 1); // Ensure minimum of Day 1
      }

      // Calculate total entries in expedition
      let expeditionEntriesCount: number | undefined;
      if (entry.expedition_id) {
        expeditionEntriesCount = await this.prisma.entry.count({
          where: {
            expedition_id: entry.expedition_id,
            deleted_at: null,
            is_draft: false,
          },
        });
      }

      const response: IEntryGetByIdResponse = {
        id: entry.public_id,
        title: entry.title,
        content: entry.content,
        place: entry.place,
        date: entry.date,
        lat: entry.lat,
        lon: entry.lon,
        countryCode: entry.country_code,
        liked: explorerId ? entry.likes.length > 0 : undefined,
        bookmarked: explorerId ? entry.bookmarks.length > 0 : undefined,
        likesCount: entry.likes_count,
        bookmarksCount: entry.bookmarks_count,
        commentsCount: entry.comments_count,
        commentsEnabled: entry.comments_enabled,
        public: entry.public,
        sponsored: entry.sponsored,
        isDraft: entry.is_draft,
        // New fields
        entryType: entry.entry_type as
          | 'standard'
          | 'photo-essay'
          | 'data-log'
          | 'waypoint'
          | undefined,
        coverImage: entry.cover_upload
          ? getStaticMediaUrl(entry.cover_upload.original)
          : undefined,
        isMilestone: entry.is_milestone,
        visibility: entry.visibility as
          | 'public'
          | 'sponsors-only'
          | 'private'
          | undefined,
        // Include expedition (trip) if entry belongs to one
        trip: entry.expedition
          ? {
              id: entry.expedition.public_id,
              title: entry.expedition.title,
              entriesCount: expeditionEntriesCount || 0,
            }
          : undefined,
        media: entry.media
          ? entry.media.map(({ upload, caption, alt_text, credit }) => ({
              id: upload?.public_id,
              thumbnail: getStaticMediaUrl(upload?.thumbnail),
              original: getStaticMediaUrl(upload?.original),
              caption: caption || undefined,
              altText: alt_text || undefined,
              credit: credit || undefined,
            }))
          : [],
        author: entry.author
          ? {
              username: entry.author.username,
              name: entry.author.profile?.name,
              picture: entry.author.profile.picture
                ? getStaticMediaUrl(entry.author.profile.picture)
                : undefined,
              creator: entry.author.role === ExplorerRole.CREATOR,
            }
          : undefined,
        createdByMe: explorerId ? explorerId === entry.author?.id : undefined,
        followingAuthor:
          explorerId && entry.author
            ? (entry.author.followers?.length || 0) > 0
            : undefined,
        createdAt: entry.created_at,
        entryNumber,
        expeditionDay,
      };

      // Track view asynchronously (fire and forget)
      // Don't track: author's own views, drafts
      const isAuthorViewing = explorerId && explorerId === entry.author_id;
      if (!isAuthorViewing && !entry.is_draft && entry.public) {
        this.trackEntryView(entry.public_id, explorerId, session.ip).catch(
          (err) => {
            this.logger.error('Failed to track entry view:', err);
          },
        );
      }

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Track an entry view - increments total views and records unique viewer
   */
  private async trackEntryView(
    publicId: string,
    viewerId?: number,
    viewerIp?: string,
  ): Promise<void> {
    const entry = await this.prisma.entry.findFirst({
      where: { public_id: publicId },
      select: { id: true },
    });

    if (!entry) return;

    // Always increment total views count
    await this.prisma.entry.update({
      where: { id: entry.id },
      data: { views_count: { increment: 1 } },
    });

    // Record unique view - use create with conflict handling to avoid race conditions
    try {
      if (viewerId) {
        // Logged-in user - try to create, ignore if already exists
        await this.prisma.entryView.create({
          data: {
            entry_id: entry.id,
            viewer_id: viewerId,
            viewer_ip: viewerIp,
          },
        });
      } else if (viewerIp) {
        // Anonymous user - try to create, ignore if already exists
        await this.prisma.entryView.create({
          data: { entry_id: entry.id, viewer_ip: viewerIp },
        });
      }
    } catch (err: unknown) {
      // P2002 is Prisma's unique constraint violation error - expected for duplicate views
      const prismaError = err as { code?: string };
      if (prismaError.code !== 'P2002') {
        this.logger.error('Failed to record unique view:', err);
      }
    }
  }

  async create({
    session,
    payload,
  }: ISessionQueryWithPayload<
    {},
    IEntryCreatePayload
  >): Promise<IEntryCreateResponse> {
    try {
      const { explorerId } = session;

      // check access
      const access = !!explorerId;
      if (!access) throw new ServiceForbiddenException();

      const {
        title,
        lat,
        lon,
        date,
        place,
        waypointId,
        expeditionId,
        isDraft,
        uploadCaptions,
        uploadAltTexts,
        uploadCredits,
        commentsEnabled,
        entryType,
        coverUploadId,
        isMilestone,
        visibility,
      } = payload;
      const privacy = {
        public: payload.public,
        sponsored: payload.sponsored,
      };
      const content = normalizeText(payload.content);

      // Validate required fields for published entries (non-drafts)
      if (!isDraft) {
        if (!title || title.trim().length === 0) {
          throw new ServiceBadRequestException(
            'Title is required for published entries',
          );
        }
        if (!content || content.trim().length === 0) {
          throw new ServiceBadRequestException(
            'Content is required for published entries',
          );
        }
        if (!place || place.trim().length === 0) {
          throw new ServiceBadRequestException(
            'Place is required for published entries',
          );
        }
      }

      this.logger.log('entry_create');

      if (waypointId) {
        // get the waypoint
        await this.prisma.waypoint
          .findFirstOrThrow({ where: { id: waypointId, deleted_at: null } })
          .catch(() => {
            throw new ServiceBadRequestException('waypoint is not available');
          });

        // check if the waypoint attached already
        await this.prisma.entry
          .count({ where: { waypoint: { id: waypointId } } })
          .catch(() => {
            throw new ServiceBadRequestException('waypoint is not available');
          });
      }

      // Look up expedition if provided
      let expeditionDbId: number | undefined;
      if (expeditionId) {
        const expedition = await this.prisma.expedition.findFirst({
          where: {
            public_id: expeditionId,
            author_id: explorerId,
            deleted_at: null,
          },
          select: { id: true },
        });
        if (expedition) {
          expeditionDbId = expedition.id;
        }
      }

      // Validate entryType if provided
      const validEntryTypes = [
        'standard',
        'photo-essay',
        'data-log',
        'waypoint',
      ];
      if (entryType && !validEntryTypes.includes(entryType)) {
        throw new ServiceBadRequestException(
          `Invalid entry type: ${entryType}. Must be one of: ${validEntryTypes.join(', ')}`,
        );
      }

      // Validate visibility if provided
      const validVisibilities = ['public', 'sponsors-only', 'private'];
      if (visibility && !validVisibilities.includes(visibility)) {
        throw new ServiceBadRequestException(
          `Invalid visibility: ${visibility}. Must be one of: ${validVisibilities.join(', ')}`,
        );
      }

      // Look up cover upload if provided (must be one of the entry's uploads)
      let coverUploadDbId: number | undefined;
      if (coverUploadId) {
        // Verify cover photo is in the uploads array for this entry
        if (!payload.uploads?.includes(coverUploadId)) {
          throw new ServiceBadRequestException(
            'Cover photo must be one of the entry media uploads',
          );
        }
        const upload = await this.prisma.upload.findFirst({
          where: {
            public_id: coverUploadId,
          },
          select: { id: true },
        });
        if (!upload) {
          throw new ServiceBadRequestException('Cover photo not found');
        }
        coverUploadDbId = upload.id;
      }

      // Reverse geocode to get country code if coordinates provided
      let countryCode: string | null = null;
      if (lat != null && lon != null) {
        countryCode = await getCountryCodeFromCoordinates(lat, lon);
      }

      // create an entry
      const { entry } = await this.prisma.$transaction(async (tx) => {
        this.logger.log('entry_create: entry');

        // Create entry with coordinates stored directly (entries are distinct from waypoints)
        const entry = await tx.entry.create({
          data: {
            public_id: generator.publicId(),
            title: title || '',
            content: content || ' ', // Ensure non-empty content for database constraints
            date: date ? new Date(date) : new Date(),
            place: place || '',
            lat: lat, // Store coordinates directly on entry
            lon: lon,
            country_code: countryCode,
            public: privacy.public,
            sponsored: privacy.sponsored,
            is_draft: isDraft === true,
            email_sent: privacy.public && !isDraft, // Only send email for published, non-draft entries
            comments_enabled:
              commentsEnabled !== undefined ? commentsEnabled : true,
            // New fields
            entry_type: entryType || 'standard',
            is_milestone: isMilestone || false,
            visibility: visibility || 'public',
            author: { connect: { id: explorerId } },
            // Connect to expedition if provided
            expedition: expeditionDbId
              ? { connect: { id: expeditionDbId } }
              : undefined,
            // Connect to cover upload if provided
            cover_upload: coverUploadDbId
              ? { connect: { id: coverUploadDbId } }
              : undefined,
          },
          select: { id: true, public_id: true },
        });

        this.logger.log('entry_create: media');

        // create entry media
        const uploads = await tx.upload.findMany({
          where: { public_id: { in: payload.uploads || [] } },
          select: { id: true, public_id: true },
        });

        if (uploads.length >= 1) {
          await tx.entryMedia.createMany({
            data: uploads.map((upload) => ({
              entry_id: entry.id,
              upload_id: upload.id,
              caption: uploadCaptions?.[upload.public_id || ''] || null,
              alt_text: uploadAltTexts?.[upload.public_id || ''] || null,
              credit: uploadCredits?.[upload.public_id || ''] || null,
            })),
          });
        }

        // update the explorer
        await tx.explorer.update({
          where: { id: explorerId },
          data: { entries_count: { increment: 1 } },
        });

        return { entry };
      });

      this.logger.log('entry_create: success');

      // Trigger email delivery for monthly sponsors (only for public, published entries)
      if (privacy.public && !isDraft) {
        this.eventService.trigger({
          event: EVENTS.ENTRY_CREATED,
          data: {
            entryId: entry.public_id,
            creatorId: explorerId,
            entryTitle: title,
            entryContent: content,
            entryPlace: place,
            entryDate: date,
          },
        });
      }

      const response: IEntryCreateResponse = {
        id: entry.public_id,
      };

      return response;
    } catch (e) {
      this.logger.log('entry_create: error');
      this.logger.error(e);

      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async update({
    query,
    session,
    payload,
  }: ISessionQueryWithPayload<
    { publicId: string },
    IEntryUpdatePayload
  >): Promise<void> {
    try {
      const { publicId } = query;
      const { explorerId } = session;
      const {
        uploads,
        expeditionId,
        uploadCaptions,
        uploadAltTexts,
        uploadCredits,
        entryType,
        coverUploadId,
        isMilestone,
        visibility,
      } = payload;

      this.logger.log('entry_update');

      if (!publicId) throw new ServiceNotFoundException('entry not found');

      // check access
      const access = !!explorerId;
      if (!access) throw new ServiceForbiddenException();

      // check entry and get current state
      const entry = await this.prisma.entry
        .findFirstOrThrow({
          where: {
            public_id: publicId,
            author_id: explorerId,
            deleted_at: null,
          },
          select: {
            id: true,
            public_id: true,
            waypoint_id: true,
            public: true,
            is_draft: true,
            email_sent: true,
            title: true,
            content: true,
            place: true,
            date: true,
            comments_enabled: true,
            media: {
              select: {
                upload: {
                  select: { public_id: true },
                },
              },
            },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('entry not found');
        });
      const { waypoint } = payload;

      // Validate entryType if provided
      const validEntryTypes = [
        'standard',
        'photo-essay',
        'data-log',
        'waypoint',
      ];
      if (entryType && !validEntryTypes.includes(entryType)) {
        throw new ServiceBadRequestException(
          `Invalid entry type: ${entryType}. Must be one of: ${validEntryTypes.join(', ')}`,
        );
      }

      // Validate visibility if provided
      const validVisibilities = ['public', 'sponsors-only', 'private'];
      if (visibility && !validVisibilities.includes(visibility)) {
        throw new ServiceBadRequestException(
          `Invalid visibility: ${visibility}. Must be one of: ${validVisibilities.join(', ')}`,
        );
      }

      // Look up cover upload if provided (must be one of the entry's uploads)
      let coverUploadDbId: number | null | undefined;
      if (coverUploadId !== undefined) {
        if (coverUploadId) {
          // Get existing entry media public_ids
          const existingMediaIds = entry.media.map((m) => m.upload.public_id);
          // Combined list: provided uploads + existing media
          const validUploadIds = [...(uploads || []), ...existingMediaIds];

          if (!validUploadIds.includes(coverUploadId)) {
            throw new ServiceBadRequestException(
              'Cover photo must be one of the entry media uploads',
            );
          }
          const upload = await this.prisma.upload.findFirst({
            where: {
              public_id: coverUploadId,
            },
            select: { id: true },
          });
          if (!upload) {
            throw new ServiceBadRequestException('Cover photo not found');
          }
          coverUploadDbId = upload.id;
        } else {
          coverUploadDbId = null; // Explicitly remove cover
        }
      }

      // update the entry
      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.log('entry_update: entry');

        // Check if entry is changing from draft to published or private to public
        const wasPrivate = !entry.public;
        const wasDraft = entry.is_draft;
        const isBecomingPublic = payload.public;
        const isBecomingPublished = !payload.isDraft && wasDraft;
        const shouldTriggerEmail =
          ((wasPrivate && isBecomingPublic) || isBecomingPublished) &&
          !entry.email_sent &&
          payload.public;

        // update the entry
        await tx.entry.update({
          where: { id: entry.id },
          data: {
            title: payload.title,
            content: normalizeText(payload.content),
            public: payload.public,
            sponsored: payload.sponsored,
            place: payload.place,
            date: payload.date ? new Date(payload.date) : undefined,
            is_draft:
              payload.isDraft !== undefined ? payload.isDraft : entry.is_draft,
            email_sent: shouldTriggerEmail ? true : entry.email_sent,
            comments_enabled:
              payload.commentsEnabled !== undefined
                ? payload.commentsEnabled
                : entry.comments_enabled,
            // New fields
            entry_type: entryType,
            is_milestone: isMilestone,
            visibility: visibility,
            cover_upload:
              coverUploadDbId !== undefined
                ? coverUploadDbId === null
                  ? { disconnect: true }
                  : { connect: { id: coverUploadDbId } }
                : undefined,
          },
        });

        // Store email trigger info for later use
        const emailTriggerData = {
          publicId: entry.public_id,
          title: payload.title || entry.title,
          content: normalizeText(payload.content) || entry.content,
          place: payload.place || entry.place,
          date: payload.date || entry.date,
        };

        // update the waypoint
        if (waypoint) {
          this.logger.log('entry_update: waypoint');

          if (entry.waypoint_id) {
            await tx.waypoint.update({
              where: { id: entry.waypoint_id },
              data: {
                lat: waypoint.lat,
                lon: waypoint.lon,
              },
            });
          }
        }

        // update entry media
        if (uploads) {
          this.logger.log('entry_update: media');

          // update entry media
          const media = await tx.entryMedia.findMany({
            where: { entry_id: entry.id },
            select: {
              upload: {
                select: { id: true, public_id: true, thumbnail: true },
              },
              caption: true,
            },
          });

          // filter entry uploads
          const mediaAdded = uploads.filter(
            (uploadId) =>
              !media.find(({ upload }) => upload.public_id === uploadId),
          );
          const mediaRemoved = media.filter(
            ({ upload }) =>
              !uploads.find((uploadId) => uploadId === upload.public_id),
          );

          // delete entry media
          if (mediaRemoved.length >= 1) {
            await tx.entryMedia.deleteMany({
              where: {
                upload_id: { in: mediaRemoved.map(({ upload }) => upload.id) },
              },
            });
          }

          // create entry media
          if (mediaAdded.length >= 1) {
            const uploadsToAdd = await tx.upload.findMany({
              where: { public_id: { in: mediaAdded } },
              select: { id: true, public_id: true },
            });

            await tx.entryMedia.createMany({
              data: uploadsToAdd.map((upload) => ({
                entry_id: entry.id,
                upload_id: upload.id,
                caption: uploadCaptions?.[upload.public_id || ''] || null,
                alt_text: uploadAltTexts?.[upload.public_id || ''] || null,
                credit: uploadCredits?.[upload.public_id || ''] || null,
              })),
            });
          }

          // update metadata (caption, alt_text, credit) for existing media
          const mediaToUpdate = media.filter(({ upload }) =>
            uploads.includes(upload.public_id || ''),
          );

          for (const mediaItem of mediaToUpdate) {
            const uploadId = mediaItem.upload.public_id || '';
            const updateData: {
              caption?: string | null;
              alt_text?: string | null;
              credit?: string | null;
            } = {};

            if (uploadCaptions?.[uploadId] !== undefined) {
              updateData.caption = uploadCaptions[uploadId] || null;
            }
            if (uploadAltTexts?.[uploadId] !== undefined) {
              updateData.alt_text = uploadAltTexts[uploadId] || null;
            }
            if (uploadCredits?.[uploadId] !== undefined) {
              updateData.credit = uploadCredits[uploadId] || null;
            }

            if (Object.keys(updateData).length > 0) {
              await tx.entryMedia.update({
                where: {
                  entry_id_upload_id: {
                    entry_id: entry.id,
                    upload_id: mediaItem.upload.id,
                  },
                },
                data: updateData,
              });
            }
          }
        }

        // handle expedition association directly on entry
        if (expeditionId !== undefined) {
          this.logger.log('entry_update: expedition');

          if (expeditionId) {
            // get expedition and connect it
            const expedition = await tx.expedition.findFirst({
              where: {
                public_id: expeditionId,
                author_id: explorerId,
                deleted_at: null,
              },
              select: { id: true },
            });

            if (expedition) {
              await tx.entry.update({
                where: { id: entry.id },
                data: { expedition_id: expedition.id },
              });
            }
          } else {
            // Remove expedition association
            await tx.entry.update({
              where: { id: entry.id },
              data: { expedition_id: null },
            });
          }
        }

        // Return email trigger info
        return {
          shouldTriggerEmail,
          entryData: shouldTriggerEmail ? emailTriggerData : null,
        };
      });

      // Trigger email delivery if entry changed from private to public
      if (result.shouldTriggerEmail && result.entryData) {
        this.eventService.trigger({
          event: EVENTS.ENTRY_CREATED,
          data: {
            entryId: result.entryData.publicId,
            creatorId: explorerId,
            entryTitle: result.entryData.title,
            entryContent: result.entryData.content,
            entryPlace: result.entryData.place,
            entryDate: result.entryData.date,
          },
        });
      }

      this.logger.log('entry_update: success');
    } catch (e) {
      this.logger.log('entry_update: error');
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async delete({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<void> {
    try {
      const { publicId } = query;
      const { explorerId, explorerRole } = session;

      if (!explorerId) throw new ServiceForbiddenException();
      if (!publicId) throw new ServiceNotFoundException('entry not found');

      let where = {
        public_id: publicId,
        deleted_at: null,
      } as Prisma.EntryWhereInput;

      // filter based on explorer role
      switch (explorerRole) {
        case ExplorerRole.ADMIN:
          where = { ...where };
          break;
        case ExplorerRole.CREATOR:
          where = {
            ...where,
            author_id: explorerId,
          };
          break;
        case ExplorerRole.USER:
          where = {
            ...where,
            author_id: explorerId,
          };
          break;
        default:
          throw new ServiceForbiddenException();
      }

      // check access
      const entry = await this.prisma.entry
        .findFirstOrThrow({ where, select: { id: true } })
        .catch(() => {
          throw new ServiceForbiddenException();
        });

      // update the entry
      await this.prisma.entry.update({
        where: { id: entry.id },
        data: { deleted_at: dateformat().toDate() },
      });
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async like({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<IEntryLikeResponse> {
    try {
      const { publicId } = query;
      const { explorerId } = session;

      if (!publicId || !explorerId)
        throw new ServiceNotFoundException('entry not found');

      // check if the entry exists
      const entry = await this.prisma.entry
        .findFirstOrThrow({
          where: { public_id: publicId, deleted_at: null },
          select: {
            id: true,
            title: true,
            likes_count: true,
            author_id: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('entry not found');
        });

      // wrap in transaction to prevent race conditions on count fields
      const updatedEntry = await this.prisma.$transaction(async (tx) => {
        // check if it is liked already
        const liked = await tx.entryLike.findUnique({
          where: {
            entry_id_explorer_id: {
              entry_id: entry.id,
              explorer_id: explorerId,
            },
          },
        });

        if (liked) {
          // delete the like
          await tx.entryLike.delete({
            where: {
              entry_id_explorer_id: {
                entry_id: entry.id,
                explorer_id: explorerId,
              },
            },
          });
        } else {
          // create a like
          await tx.entryLike.create({
            data: {
              entry_id: entry.id,
              explorer_id: explorerId,
            },
          });

          // create a notification
          if (explorerId !== entry.author_id) {
            await this.eventService.trigger<IUserNotificationCreatePayload>({
              event: EVENTS.NOTIFICATION_CREATE,
              data: {
                context: UserNotificationContext.LIKE,
                userId: entry.author_id,
                mentionUserId: explorerId,
                mentionPostId: entry.id,
                body: entry.title,
              },
            });
          }
        }

        // update the like count
        return tx.entry.update({
          where: { id: entry.id },
          data: { likes_count: liked ? { decrement: 1 } : { increment: 1 } },
        });
      });

      const response: IEntryLikeResponse = {
        likesCount: updatedEntry.likes_count,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async bookmark({
    query,
    session,
  }: ISessionQuery<{ publicId: string }>): Promise<IEntryBookmarkResponse> {
    try {
      const { publicId } = query;
      const { explorerId } = session;

      if (!publicId || !explorerId)
        throw new ServiceNotFoundException('entry not found');

      // check if the entry exists
      const entry = await this.prisma.entry
        .findFirstOrThrow({
          where: { public_id: publicId, deleted_at: null },
          select: {
            id: true,
            bookmarks_count: true,
          },
        })
        .catch(() => null);

      if (!entry) throw new ServiceNotFoundException('entry not found');

      // wrap in transaction to prevent race conditions on count fields
      const updatedEntry = await this.prisma.$transaction(async (tx) => {
        // check if it is bookmarked already
        const bookmarked = await tx.entryBookmark.findUnique({
          where: {
            entry_id_explorer_id: {
              entry_id: entry.id,
              explorer_id: explorerId,
            },
          },
        });

        if (bookmarked) {
          // delete the bookmark
          await tx.entryBookmark.delete({
            where: {
              entry_id_explorer_id: {
                entry_id: entry.id,
                explorer_id: explorerId,
              },
            },
          });
        } else {
          // create a bookmark
          await tx.entryBookmark.create({
            data: {
              entry_id: entry.id,
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
        return tx.entry.update({
          where: { id: entry.id },
          data: {
            bookmarks_count: bookmarked ? { decrement: 1 } : { increment: 1 },
          },
        });
      });

      const response: IEntryBookmarkResponse = {
        bookmarksCount: updatedEntry.bookmarks_count,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}
