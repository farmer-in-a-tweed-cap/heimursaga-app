import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  IPostCreatePayload,
  IPostCreateResponse,
  IPostGetAllResponse,
  IPostGetByIdResponse,
  IPostUpdatePayload,
  SponsorshipStatus,
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

  async getDrafts({ session }: ISessionQuery): Promise<IPostGetAllResponse> {
    try {
      const { userId } = session;

      // Only authenticated users can get their drafts
      if (!userId) throw new ServiceForbiddenException();

      const where = {
        public_id: { not: null },
        author_id: userId,
        is_draft: true,
        deleted_at: null,
      } as Prisma.PostWhereInput;

      const take = 20; // Limit drafts to recent ones

      // get drafts
      const results = await this.prisma.post.count({ where });
      const data = await this.prisma.post
        .findMany({
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

      const processedData = data.map((post) => ({
        id: post.public_id,
        title: post.title,
        content: post.content?.slice(0, 140) || '',
        place: post.place,
        date: post.date,
        public: post.public,
        sponsored: post.sponsored,
        isDraft: post.is_draft,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      }));

      const response: IPostGetAllResponse = {
        data: processedData,
        results,
      };

      return response;
    } catch (e) {
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceNotFoundException('drafts not found');
      throw exception;
    }
  }

  async getPosts({ session }: ISessionQuery): Promise<IPostGetAllResponse> {
    try {
      const { userId, userRole } = session;

      let where = {
        public_id: { not: null },
        is_draft: false, // Exclude drafts from public views
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
            sponsored: true,
            is_draft: true,
            lat: true,
            lon: true,
            place: true,
            date: true,
            likes_count: true,
            bookmarks_count: true,
            author_id: true, // Need this for sponsorship check
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
      
      // Filter out sponsored posts that the user doesn't have access to
      const filteredPosts = [];
      for (const post of data) {
        // If post is sponsored, check if user has access
        if (post.sponsored) {
          // Allow the post author to see their own sponsored posts
          if (userId && post.author_id === userId) {
            filteredPosts.push(post);
          }
          // Allow admins to see all sponsored posts
          else if (userRole === UserRole.ADMIN) {
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

      const processedData = filteredPosts.map((post) => ({
        id: post.public_id,
        lat: post.lat,
        lon: post.lon,
        place: post.place,
        date: post.date,
        title: post.title,
        public: post.public,
        sponsored: post.sponsored,
        isDraft: post.is_draft,
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
      }));

      const response: IPostGetAllResponse = {
        data: processedData,
        results: filteredPosts.length,
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
            OR: [
              { author_id: userId }, // Authors can see their own drafts
              { public: true, is_draft: false }, // Everyone can see published public posts
            ],
          };
          break;
        case UserRole.USER:
          where = {
            ...where,
            deleted_at: null,
            OR: [
              { author_id: userId }, // Users can see their own drafts
              { public: true, is_draft: false }, // Everyone can see published public posts
            ],
          };
          break;
        default:
          where = { ...where, deleted_at: null, public: true, is_draft: false };
          break;
      }

      // get a post
      const post = await this.prisma.post.findFirst({
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
          waypoint: { select: { id: true, lat: true, lon: true } },
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

      // handle case where post was not found (deleted, private, or doesn't exist)
      if (!post) {
        throw new ServiceNotFoundException('Entry not found');
      }

      // get trip
      const trip = post.waypoint.id
        ? await this.prisma.trip.findFirst({
            where: {
              waypoints: {
                some: {
                  waypoint: {
                    id: post.waypoint.id,
                  },
                },
              },
            },
            select: {
              public_id: true,
              title: true,
            },
          })
        : undefined;

      // Check access for sponsored posts
      if (post.sponsored) {
        const isAuthor = userId && post.author_id === userId;
        const isAdmin = userRole === UserRole.ADMIN;
        const hasSponsorship = userId && await this.hasActiveSponsorship(userId, post.author_id);
        
        if (!isAuthor && !isAdmin && !hasSponsorship) {
          throw new ServiceForbiddenException('Access denied to sponsored content');
        }
      }

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
        isDraft: post.is_draft,
        waypoint: post.waypoint,
        trip: trip
          ? {
              id: trip.public_id,
              title: trip.title,
            }
          : undefined,
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

      const { title, lat, lon, date, place, waypointId, tripId, isDraft } = payload;
      const privacy = {
        public: payload.public,
        sponsored: payload.sponsored,
      };
      const content = normalizeText(payload.content);

      // Validate required fields for published posts (non-drafts)
      if (!isDraft) {
        if (!title || title.trim().length === 0) {
          throw new ServiceBadRequestException('Title is required for published posts');
        }
        if (!content || content.trim().length === 0) {
          throw new ServiceBadRequestException('Content is required for published posts');
        }
        if (!place || place.trim().length === 0) {
          throw new ServiceBadRequestException('Place is required for published posts');
        }
      }


      this.logger.log('post_create');

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
        this.logger.log('post_create: waypoint');

        // create a waypoint (only if we have coordinates or using existing waypoint)
        const waypoint = waypointId
          ? await tx.waypoint.findFirstOrThrow({
              where: { id: waypointId },
              select: { id: true },
            })
          : (lat != null && lon != null)
          ? await tx.waypoint.create({
              data: {
                lat,
                lon,
              },
              select: { id: true },
            })
          : null;

        this.logger.log('post_create: post');

        // create a post
        const post = await tx.post.create({
          data: {
            public_id: generator.publicId(),
            title: title || '',
            content: content || ' ', // Ensure non-empty content for database constraints
            date: date || new Date(),
            place: place || '',
            public: privacy.public,
            sponsored: privacy.sponsored,
            is_draft: isDraft === true,
            email_sent: privacy.public && !isDraft, // Only send email for published, non-draft posts
            author: { connect: { id: userId } },
            waypoint: waypoint ? { connect: { id: waypoint.id } } : undefined,
          },
          select: { id: true, public_id: true },
        });

        this.logger.log('post_create: media');

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

        // attach to the trip
        if (tripId) {
          this.logger.log('post_create: trip');

          // get trip
          const trip = await tx.trip.findFirst({
            where: { public_id: tripId, author_id: userId, deleted_at: null },
            select: { id: true },
          });
          if (!trip) return;

          // attach the waypoint to the trip
          await tx.tripWaypoint.create({
            data: {
              trip_id: trip.id,
              waypoint_id: waypoint.id,
            },
          });
        }

        // update the user
        await tx.user.update({
          where: { id: userId },
          data: { posts_count: { increment: 1 } },
        });

        return { post };
      });

      this.logger.log('post_create: success');

      // Trigger email delivery for monthly sponsors (only for public, published entries)
      if (privacy.public && !isDraft) {
        this.eventService.trigger({
          event: EVENTS.ENTRY_CREATED,
          data: {
            entryId: post.public_id,
            creatorId: userId,
            entryTitle: title,
            entryContent: content,
            entryPlace: place,
            entryDate: date,
          },
        });
      }

      const response: IPostCreateResponse = {
        id: post.public_id,
      };

      return response;
    } catch (e) {
      this.logger.log('post_create: error');
      this.logger.error(e);

      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('post not created');
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
      const { uploads, tripId } = payload;

      this.logger.log('post_update');

      if (!publicId) throw new ServiceNotFoundException('post not found');

      // check access
      const access = !!userId;
      if (!access) throw new ServiceForbiddenException();

      // check post and get current state
      const post = await this.prisma.post
        .findFirstOrThrow({
          where: {
            public_id: publicId,
            author_id: userId,
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
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('post not found');
        });
      const { waypoint } = payload;

      // update the post
      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.log('post_update: post');

        // Check if post is changing from draft to published or private to public
        const wasPrivate = !post.public;
        const wasDraft = post.is_draft;
        const isBecomingPublic = payload.public;
        const isBecomingPublished = !payload.isDraft && wasDraft;
        const shouldTriggerEmail = (wasPrivate && isBecomingPublic || isBecomingPublished) && !post.email_sent && payload.public;

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
            is_draft: payload.isDraft !== undefined ? payload.isDraft : post.is_draft,
            email_sent: shouldTriggerEmail ? true : post.email_sent, // Mark email as sent if triggering
          },
        });

        // Store email trigger info for later use
        const emailTriggerData = {
          publicId: post.public_id,
          title: payload.title || post.title,
          content: normalizeText(payload.content) || post.content,
          place: payload.place || post.place,
          date: payload.date || post.date,
        };

        // update the waypoint
        if (waypoint) {
          this.logger.log('post_update: waypoint');

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
        if (uploads) {
          this.logger.log('post_update: media');

          // update post media
          const media = await tx.postMedia.findMany({
            where: { post_id: post.id },
            select: {
              upload: {
                select: { id: true, public_id: true, thumbnail: true },
              },
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
        }

        // handle trip association
        if (tripId !== undefined) {
          this.logger.log('post_update: trip');

          // First, remove any existing trip associations for this waypoint
          if (post.waypoint_id) {
            await tx.tripWaypoint.deleteMany({
              where: {
                waypoint_id: post.waypoint_id,
              },
            });
          }

          // If tripId is provided (not null), add the new association
          if (tripId) {
            // get trip
            const trip = await tx.trip.findFirst({
              where: { public_id: tripId, author_id: userId, deleted_at: null },
              select: { id: true },
            });
            
            if (trip && post.waypoint_id) {
              await tx.tripWaypoint.create({
                data: {
                  trip_id: trip.id,
                  waypoint_id: post.waypoint_id,
                },
              });
            }
          }
        }
        
        // Return email trigger info
        return { 
          shouldTriggerEmail, 
          postData: shouldTriggerEmail ? emailTriggerData : null 
        };
      });

      // Trigger email delivery if post changed from private to public
      if (result.shouldTriggerEmail && result.postData) {
        this.eventService.trigger({
          event: EVENTS.ENTRY_CREATED,
          data: {
            entryId: result.postData.publicId,
            creatorId: userId,
            entryTitle: result.postData.title,
            entryContent: result.postData.content,
            entryPlace: result.postData.place,
            entryDate: result.postData.date,
          },
        });
      }

      this.logger.log('post_update: success');
    } catch (e) {
      this.logger.log('post_update: error');
      this.logger.error(e);
      const exception = e.status
        ? new ServiceException(e.message, e.status)
        : new ServiceBadRequestException('post not updated');
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
            event: EVENTS.NOTIFICATION_CREATE,
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
