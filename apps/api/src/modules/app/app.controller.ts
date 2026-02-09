import { Controller, Get, Header, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

import { Public } from '@/common/decorators';

import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  health() {
    return;
  }

  @Public()
  @Post('test')
  test() {
    return this.appService.test();
  }

  @Public()
  @Get('sitemap')
  sitemap() {
    return this.appService.generateSitemap();
  }

  @Public()
  @Get('sitemap.xml')
  async sitemapXml(@Res() reply: FastifyReply) {
    const data = await this.appService.generateSitemap();
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...data.sources.map(
        (s) =>
          `  <url><loc>${s.loc}</loc><lastmod>${new Date(s.lastmod).toISOString()}</lastmod><changefreq>${s.changefreq}</changefreq><priority>${s.priority}</priority></url>`,
      ),
      '</urlset>',
    ].join('\n');
    reply.header('Content-Type', 'application/xml').send(xml);
  }
}
