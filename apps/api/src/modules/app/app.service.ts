import { EmailService } from '../email';
import { Injectable } from '@nestjs/common';
import { ISitemapGetResponse } from '@repo/types';

import { getEnv } from '@/lib/utils';

import { ENVIRONMENTS } from '@/common/constants';
import { EMAIL_TEMPLATES } from '@/common/email-templates';
import {
  ServiceBadRequestException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { EVENTS, EventService, IEventSendEmail } from '@/modules/event';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private emailService: EmailService,
    private eventService: EventService,
  ) {}

  async test() {
    try {
      // check access
      const access = getEnv() === ENVIRONMENTS.DEVELOPMENT;
      if (!access) throw new ServiceForbiddenException();

      // Send test welcome email
      this.eventService.trigger<IEventSendEmail>({
        event: EVENTS.SEND_EMAIL,
        data: {
          to: 'cnhamilton1@yahoo.com',
          template: EMAIL_TEMPLATES.WELCOME,
        },
      });

      return { message: 'Test welcome email sent to cnhamilton1@yahoo.com' };
    } catch (error) {
      throw new ServiceForbiddenException();
    }
  }

  async generateSitemap(): Promise<ISitemapGetResponse> {
    try {
      const buildUrl = (path: string) => {
        const baseUrl = process.env.APP_BASE_URL;
        const url = new URL(path, baseUrl).toString();
        return url;
      };

      type SitemapSource = {
        path: string;
        priority: number;
        changefreq: 'daily' | 'monthly' | 'yearly';
        date: Date;
      };

      const sources: SitemapSource[] = [];

      // static pages
      sources.push(
        ...[
          { path: '/', changefreq: 'daily' as const },
          { path: '/explorers', changefreq: 'daily' as const },
          { path: '/expeditions', changefreq: 'daily' as const },
          { path: '/entries', changefreq: 'daily' as const },
          { path: '/about', changefreq: 'monthly' as const },
          { path: '/documentation', changefreq: 'monthly' as const },
          { path: '/explorer-guidelines', changefreq: 'monthly' as const },
          { path: '/sponsorship-guide', changefreq: 'monthly' as const },
          { path: '/upgrade', changefreq: 'monthly' as const },
          { path: '/legal/terms', changefreq: 'monthly' as const },
          { path: '/legal/privacy', changefreq: 'monthly' as const },
        ].map(
          ({ path, changefreq }) =>
            ({
              path,
              date: new Date(),
              priority: 1,
              changefreq,
            }) as SitemapSource,
        ),
      );

      // entries
      const posts = await this.prisma.entry.findMany({
        where: {
          public: true,
          public_id: { not: null },
          deleted_at: null,
        },
        select: {
          public_id: true,
          updated_at: true,
        },
      });

      sources.push(
        ...posts
          .filter(({ public_id }) => public_id && public_id !== '')
          .map(
            ({ public_id, updated_at }) =>
              ({
                path: `entry/${public_id}`,
                date: updated_at,
                priority: 0.8,
                changefreq: 'daily',
              }) as SitemapSource,
          ),
      );

      // expeditions (public, not deleted)
      const expeditions = await this.prisma.expedition.findMany({
        where: {
          public: true,
          deleted_at: null,
        },
        select: {
          public_id: true,
          updated_at: true,
        },
      });

      sources.push(
        ...expeditions
          .filter(({ public_id }) => public_id && public_id !== '')
          .map(
            ({ public_id, updated_at }) =>
              ({
                path: `expedition/${public_id}`,
                date: updated_at,
                priority: 0.9,
                changefreq: 'daily',
              }) as SitemapSource,
          ),
      );

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

      sources.push(
        ...users.map(
          ({ username, updated_at }) =>
            ({
              path: `journal/${username}`,
              date: updated_at,
              priority: 0.8,
              changefreq: 'daily',
            }) as SitemapSource,
        ),
      );

      const response: ISitemapGetResponse = {
        sources: sources.map(({ path, date, changefreq, priority }) => ({
          loc: buildUrl(path),
          lastmod: date,
          changefreq,
          priority,
        })),
      };

      return response;
    } catch (error) {
      throw new ServiceBadRequestException('sitemap is not generated');
    }
  }
}
