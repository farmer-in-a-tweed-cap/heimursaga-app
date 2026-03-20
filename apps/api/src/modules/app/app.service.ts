import { Injectable } from '@nestjs/common';
import { ISitemapGetResponse } from '@repo/types';

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
      // entries (published, not deleted, not off-grid)
      const posts = await this.prisma.entry.findMany({
        where: {
          public: true,
          public_id: { not: null },
          deleted_at: null,
          NOT: { visibility: 'off-grid' },
          OR: [
            { expedition_id: null },
            { expedition: { visibility: 'public' } },
          ],
        },
        select: {
          public_id: true,
          updated_at: true,
        },
      });

      // expeditions (public, not deleted)
      const expeditions = await this.prisma.expedition.findMany({
        where: {
          visibility: 'public',
          deleted_at: null,
        },
        select: {
          public_id: true,
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
          .map(({ public_id, updated_at }) => ({
            publicId: public_id!,
            updatedAt: updated_at,
          })),
        entries: posts
          .filter(({ public_id }) => public_id && public_id !== '')
          .map(({ public_id, updated_at }) => ({
            publicId: public_id!,
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
