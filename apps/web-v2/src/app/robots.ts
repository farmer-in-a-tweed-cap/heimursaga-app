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
          '/cards-preview',
        ],
      },
      // Block AI *training* crawlers. Heimursaga is an anti-AI brand; do not
      // feed training corpora.
      { userAgent: 'GPTBot', disallow: '/' }, // OpenAI training
      { userAgent: 'Google-Extended', disallow: '/' }, // Gemini / Vertex training
      { userAgent: 'CCBot', disallow: '/' }, // Common Crawl — feeds most LLMs
      { userAgent: 'anthropic-ai', disallow: '/' }, // Anthropic legacy training UA
      { userAgent: 'ClaudeBot', disallow: '/' }, // Anthropic training crawler
      { userAgent: 'Applebot-Extended', disallow: '/' }, // Apple Intelligence training
      { userAgent: 'Bytespider', disallow: '/' }, // ByteDance / Doubao
      { userAgent: 'Meta-ExternalAgent', disallow: '/' }, // Meta AI training
      { userAgent: 'FacebookBot', disallow: '/' }, // Meta speech-data training (NOT facebookexternalhit, which is the OG-tag social crawler and inherits the wildcard rules below)
      { userAgent: 'Amazonbot', disallow: '/' }, // Alexa / Amazon AI training
      { userAgent: 'cohere-ai', disallow: '/' }, // Cohere training

      // Block commercial scrapers and surveillance crawlers. Not strictly AI
      // training, but content harvesters with no editorial benefit.
      { userAgent: 'Diffbot', disallow: '/' },
      { userAgent: 'ImagesiftBot', disallow: '/' }, // Hive brand-safety / ad-targeting scraper
      { userAgent: 'Omgilibot', disallow: '/' }, // Webz.io
      { userAgent: 'YouBot', disallow: '/' }, // You.com retrieval index

      // Answer-time AI fetchers (ChatGPT-User, OAI-SearchBot, PerplexityBot,
      // Perplexity-User, Claude-User, Claude-SearchBot, Applebot) and social
      // sharing crawlers (facebookexternalhit, Twitterbot, LinkedInBot) are
      // INTENTIONALLY NOT LISTED. They inherit the wildcard group above:
      // `allow: /` with the private-path disallows. Per RFC 9309 §2.2.1,
      // adding a named stanza for a bot makes that bot ignore the wildcard
      // entirely — so an explicit `{ userAgent: X, allow: '/' }` would
      // silently re-expose /settings, /checkout, /messages, etc. Leave them
      // unlisted unless you also repeat the disallow list in their stanza.
    ],
    sitemap: 'https://heimursaga.com/sitemap.xml',
  };
}
