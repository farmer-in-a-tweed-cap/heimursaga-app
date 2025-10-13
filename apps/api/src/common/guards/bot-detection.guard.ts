import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class BotDetectionGuard implements CanActivate {
  private readonly suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /nodejs/i,
    /axios/i,
    /postman/i,
    /insomnia/i,
    /^$/,
  ];

  private readonly knownBots = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'whatsapp',
    'telegram',
    'discord',
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userAgent = request.headers['user-agent'] || '';
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];

    // Check for missing or suspicious user agent
    if (!userAgent || this.isSuspiciousUserAgent(userAgent)) {
      throw new ForbiddenException('Suspicious user agent detected');
    }

    // Check for rapid requests (basic rate limiting at guard level)
    if (this.hasRapidRequests(request)) {
      throw new ForbiddenException('Too many requests detected');
    }

    // Check for suspicious headers combination
    if (this.hasSuspiciousHeaders(request)) {
      throw new ForbiddenException('Suspicious request headers detected');
    }

    return true;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const lowerUserAgent = userAgent.toLowerCase();

    // Skip check for known legitimate bots
    for (const knownBot of this.knownBots) {
      if (lowerUserAgent.includes(knownBot)) {
        return false;
      }
    }

    // Check against suspicious patterns
    return this.suspiciousUserAgents.some((pattern) => pattern.test(userAgent));
  }

  private hasRapidRequests(request: Request): boolean {
    // This is a basic check - in production you'd use Redis or similar
    // for now, we'll check if multiple headers suggest automation
    const automationHeaders = [
      request.headers['x-requested-with'],
      request.headers['x-automation'],
      request.headers['x-robot'],
    ].filter(Boolean);

    return automationHeaders.length > 0;
  }

  private hasSuspiciousHeaders(request: Request): boolean {
    // Check for missing standard browser headers
    const hasAccept = request.headers.accept;
    const hasAcceptLanguage = request.headers['accept-language'];
    const hasAcceptEncoding = request.headers['accept-encoding'];

    // Browsers typically send these headers
    if (!hasAccept || !hasAcceptLanguage || !hasAcceptEncoding) {
      return true;
    }

    // Check for programmatic indicators
    const suspiciousHeaders = [
      'x-python-version',
      'x-node-version',
      'x-requested-with',
    ];

    return suspiciousHeaders.some((header) => request.headers[header]);
  }
}
