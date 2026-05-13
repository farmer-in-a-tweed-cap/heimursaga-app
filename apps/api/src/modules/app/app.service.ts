import { Injectable } from '@nestjs/common';
import { IHistoricalArchiveResponse, ISitemapGetResponse } from '@repo/types';

import { splitHistoricalTitle } from '@/lib/slug';
import { getStaticMediaUrl } from '@/lib/upload';

import {
  ServiceBadRequestException,
  ServiceInternalException,
} from '@/common/exceptions';
import { EVENTS, EventService, IEventSendEmail } from '@/modules/event';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private eventService: EventService,
    private logger: Logger,
  ) {}

  async generateSitemap(): Promise<ISitemapGetResponse> {
    try {
      // entries: public, not deleted, not private/off-grid. Standalone
      // entries (no parent expedition) are always eligible; entries linked
      // to an expedition require the expedition to be live (not cancelled,
      // drafted, or deleted). `is_draft` is not filtered — explorers can
      // mark `public: true` on in-progress entries and they should be
      // crawlable.
      const posts = await this.prisma.entry.findMany({
        where: {
          public: true,
          public_id: { not: null },
          deleted_at: null,
          NOT: { visibility: { in: ['private', 'off-grid'] } },
          OR: [
            { expedition_id: null },
            {
              expedition: {
                visibility: 'public',
                deleted_at: null,
                status: { notIn: ['cancelled', 'draft'] },
              },
            },
          ],
        },
        select: {
          public_id: true,
          slug: true,
          updated_at: true,
        },
      });

      // expeditions (public, not deleted, not cancelled or drafted).
      const expeditions = await this.prisma.expedition.findMany({
        where: {
          visibility: 'public',
          deleted_at: null,
          status: { notIn: ['cancelled', 'draft'] },
        },
        select: {
          public_id: true,
          slug: true,
          updated_at: true,
        },
      });

      // explorer journals (exclude blocked users)
      const users = await this.prisma.explorer.findMany({
        where: {
          NOT: {
            blocked: true,
          },
        },
        select: {
          username: true,
          updated_at: true,
        },
      });

      const response: ISitemapGetResponse = {
        expeditions: expeditions
          .filter(({ public_id }) => public_id && public_id !== '')
          .map(({ public_id, slug, updated_at }) => ({
            publicId: public_id!,
            slug: slug || undefined,
            updatedAt: updated_at,
          })),
        entries: posts
          .filter(({ public_id }) => public_id && public_id !== '')
          .map(({ public_id, slug, updated_at }) => ({
            publicId: public_id!,
            slug: slug || undefined,
            updatedAt: updated_at,
          })),
        explorers: users.map(({ username, updated_at }) => ({
          username,
          updatedAt: updated_at,
        })),
      };

      return response;
    } catch (error) {
      throw new ServiceBadRequestException('sitemap is not generated');
    }
  }

  /**
   * Aggregated payload for the /historical-archive landing page. Returns every
   * public, undeleted expedition and historical entry authored by the
   * `explorersfromhistory` account, in a single round-trip so the page can
   * render server-side without N+1 fetches.
   */
  async getHistoricalArchive(): Promise<IHistoricalArchiveResponse> {
   try {
    const expeditions = await this.prisma.expedition.findMany({
      where: {
        visibility: 'public',
        deleted_at: null,
        status: { notIn: ['cancelled', 'draft'] },
        author: { username: 'explorersfromhistory' },
      },
      select: {
        public_id: true,
        slug: true,
        title: true,
        description: true,
        cover_image: true,
        start_date: true,
        end_date: true,
        region: true,
        country_code: true,
        country_name: true,
        entries_count: true,
      },
      orderBy: { start_date: 'asc' },
    });

    const entries = await this.prisma.entry.findMany({
      where: {
        public: true,
        is_draft: false,
        deleted_at: null,
        public_id: { not: null },
        NOT: { visibility: { in: ['private', 'off-grid'] } },
        entry_type: 'historical',
        author: { username: 'explorersfromhistory' },
      },
      select: {
        public_id: true,
        slug: true,
        title: true,
        content: true,
        date: true,
        place: true,
        lat: true,
        lon: true,
        country_code: true,
        cover_upload: { select: { original: true, thumbnail: true } },
        media: {
          take: 1,
          orderBy: { created_at: 'asc' },
          select: { upload: { select: { thumbnail: true, original: true } } },
        },
        expedition: { select: { public_id: true, slug: true, title: true } },
      },
      orderBy: { date: 'asc' },
    });

    return {
      expeditions: expeditions.map((x) => {
        const { explorer, title: cleanTitle } = splitHistoricalTitle(x.title);
        return {
          publicId: x.public_id,
          slug: x.slug || undefined,
          title: x.title,
          cleanTitle,
          explorer: explorer || '',
          description: x.description || '',
          coverImage: x.cover_image
            ? getStaticMediaUrl(x.cover_image)
            : undefined,
          startDate: x.start_date,
          endDate: x.end_date,
          region: x.region || undefined,
          countryCode: x.country_code || undefined,
          countryName: x.country_name || undefined,
          entriesCount: x.entries_count || 0,
        };
      }),
      entries: entries.map((e) => {
        const { explorer, title: cleanTitle } = splitHistoricalTitle(e.title);
        const expClean = e.expedition
          ? splitHistoricalTitle(e.expedition.title).title
          : undefined;
        const firstMedia = e.media[0]?.upload;
        const cover = e.cover_upload?.original
          ? getStaticMediaUrl(e.cover_upload.original)
          : firstMedia?.thumbnail
            ? getStaticMediaUrl(firstMedia.thumbnail)
            : firstMedia?.original
              ? getStaticMediaUrl(firstMedia.original)
              : undefined;
        return {
          publicId: e.public_id!,
          slug: e.slug || undefined,
          title: e.title || '',
          cleanTitle,
          explorer: explorer || '',
          excerpt: (e.content || '')
            .replace(/[#*_~`>[\]()!]/g, '')
            .trim()
            .slice(0, 220),
          date: e.date,
          place: e.place || undefined,
          lat: typeof e.lat === 'number' ? e.lat : undefined,
          lon: typeof e.lon === 'number' ? e.lon : undefined,
          countryCode: e.country_code || undefined,
          coverImage: cover,
          expeditionPublicId: e.expedition?.public_id,
          expeditionSlug: e.expedition?.slug || undefined,
          expeditionTitle: expClean,
        };
      }),
    };
   } catch (error) {
     this.logger.error('getHistoricalArchive failed', error);
     return { expeditions: [], entries: [] };
   }
  }

  async submitContactForm(payload: {
    name: string;
    email: string;
    category: string;
    subject: string;
    message: string;
    url?: string;
  }) {
    const { name, email, category, subject, message, url } = payload;

    if (!name || !email || !category || !subject || !message) {
      throw new ServiceBadRequestException(
        'Name, email, category, subject, and message are required',
      );
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ServiceBadRequestException('Invalid email address');
    }

    const validCategories = [
      'violation',
      'technical',
      'account',
      'billing',
      'general',
      'feedback',
    ];
    if (!validCategories.includes(category)) {
      throw new ServiceBadRequestException('Invalid category');
    }

    const categoryLabels: Record<string, string> = {
      violation: 'Content Violation Report',
      technical: 'Technical Support',
      account: 'Account Issue',
      billing: 'Billing & Payments',
      general: 'General Inquiry',
      feedback: 'Feature Request / Feedback',
    };

    try {
      const adminEmail = process.env.CONTACT_EMAIL || 'admin@heimursaga.com';
      const categoryLabel = categoryLabels[category] || category;

      const escapeHtml = (text: string): string =>
        text.replace(
          /[&<>"']/g,
          (c) =>
            ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#039;',
            })[c]!,
        );

      const escapeUrl = (rawUrl: string): string => {
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'))
          return '#';
        return escapeHtml(rawUrl);
      };

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #202020; color: white; padding: 20px;">
            <h2 style="margin: 0; font-size: 16px;">HEIMURSAGA CONTACT FORM</h2>
          </div>
          <div style="padding: 20px; background: #f5f5f5;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; width: 120px; vertical-align: top;">Category:</td>
                <td style="padding: 8px 12px;">${categoryLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; vertical-align: top;">From:</td>
                <td style="padding: 8px 12px;">${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; vertical-align: top;">Subject:</td>
                <td style="padding: 8px 12px;">${escapeHtml(subject)}</td>
              </tr>
              ${url ? `<tr><td style="padding: 8px 12px; font-weight: bold; vertical-align: top;">URL:</td><td style="padding: 8px 12px;"><a href="${escapeUrl(url)}">${escapeHtml(url)}</a></td></tr>` : ''}
            </table>
            <div style="margin-top: 16px; padding: 16px; background: white; border-left: 4px solid #ac6d46;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px; color: #616161;">MESSAGE</div>
              <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6;">${escapeHtml(message)}</div>
            </div>
          </div>
        </div>
      `;

      this.eventService.trigger<IEventSendEmail>({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: adminEmail,
          subject: `[${categoryLabel}] ${escapeHtml(subject)}`,
          html,
        },
      });

      this.logger.log(
        `Contact form submitted: category=${category}, from=${email}`,
      );

      return { success: true };
    } catch (e) {
      this.logger.error('Failed to process contact form:', e);
      throw new ServiceInternalException();
    }
  }
}
