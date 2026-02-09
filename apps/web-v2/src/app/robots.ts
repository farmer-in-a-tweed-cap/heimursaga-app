import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/settings',
          '/checkout',
          '/edit-profile',
          '/messages',
          '/insights',
          '/bookmarks',
          '/notifications',
          '/select-expedition',
          '/expedition-builder',
          '/expedition-quick-entry',
          '/log-entry',
          '/edit-entry',
          '/sponsorship',
          '/upgrade-success',
          '/payment-success',
        ],
      },
      // Block AI crawlers
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'Claude-Web', disallow: '/' },
      { userAgent: 'PerplexityBot', disallow: '/' },
      { userAgent: 'Omgilibot', disallow: '/' },
      { userAgent: 'FacebookBot', disallow: '/' },
      // Allow social media crawlers
      { userAgent: 'facebookexternalhit', allow: '/' },
      { userAgent: 'Twitterbot', allow: '/' },
      { userAgent: 'LinkedInBot', allow: '/' },
    ],
    sitemap: 'https://heimursaga.com/sitemap.xml',
  };
}
