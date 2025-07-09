import { EmailService } from '../email';
import { Injectable } from '@nestjs/common';
import { ISitemapGetResponse } from '@repo/types';

import { getEnv } from '@/lib/utils';

import { ENVIRONMENTS } from '@/common/constants';
import {
  ServiceBadRequestException,
  ServiceForbiddenException,
} from '@/common/exceptions';
import { PrismaService } from '@/modules/prisma';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async test() {
    try {
      // check access
      const access = getEnv() === ENVIRONMENTS.DEVELOPMENT;
      if (!access) throw new ServiceForbiddenException();

      // test
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

      const router = {
        posts: 'posts',
        legal: 'legal',
      };

      type SitemapSource = {
        path: string;
        priority: number;
        changefreq: 'daily' | 'monthly' | 'yearly';
        date: Date;
      };

      const sources: SitemapSource[] = [];

      // @todo: add static pages
      sources.push(
        ...[
          { path: '/' },
          { path: '/explore' },
          { path: '/blog' },
          { path: '/login' },
          { path: '/signup' },
          { path: [router.legal, 'terms'].join('/') },
          { path: [router.legal, 'privacy'].join('/') },
        ].map(
          ({ path }) =>
            ({
              path,
              date: new Date(),
              priority: 1,
              changefreq: 'daily',
            }) as SitemapSource,
        ),
      );

      // add posts
      const posts = await this.prisma.post.findMany({
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
                path: [router.posts, public_id].join('/'),
                date: updated_at,
                priority: 1,
                changefreq: 'daily',
              }) as SitemapSource,
          ),
      );

      // add users
      const users = await this.prisma.user.findMany({
        select: {
          username: true,
          updated_at: true,
        },
      });

      sources.push(
        ...users.map(
          ({ username, updated_at }) =>
            ({
              path: username,
              date: updated_at,
              priority: 1,
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
