import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
  @Get('sitemap')
  sitemap() {
    return this.appService.generateSitemap();
  }

  @Public()
  @Get('sitemap.xml')
  async sitemapXml(@Res() reply: FastifyReply) {
    const BASE = 'https://heimursaga.com';
    const data = await this.appService.generateSitemap();
    const urls: string[] = [];

    for (const e of data.expeditions) {
      urls.push(
        `  <url><loc>${BASE}/expedition/${e.publicId}</loc><lastmod>${new Date(e.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      );
    }
    for (const e of data.entries) {
      urls.push(
        `  <url><loc>${BASE}/entry/${e.publicId}</loc><lastmod>${new Date(e.updatedAt).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`,
      );
    }
    for (const e of data.explorers) {
      urls.push(
        `  <url><loc>${BASE}/journal/${e.username}</loc><lastmod>${new Date(e.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
      );
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
    ].join('\n');
    reply.header('Content-Type', 'application/xml').send(xml);
  }

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 submissions per 5 minutes
  async contact(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('category') category: string,
    @Body('subject') subject: string,
    @Body('message') message: string,
    @Body('url') url?: string,
  ) {
    return this.appService.submitContactForm({
      name,
      email,
      category,
      subject,
      message,
      url,
    });
  }
}
