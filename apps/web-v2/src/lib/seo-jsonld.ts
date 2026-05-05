/**
 * Schema.org JSON-LD builders for SEO.
 *
 * For historical-archive entries (entryType === 'historical') we lean into
 * Article + Person + Place + Event so the page can be associated with known
 * historical figures and locations even when the prose body is verbatim
 * public-domain text. For non-historical entries we still emit Article +
 * Person + Place but skip the public-domain license metadata.
 */

import type { EntryMeta, ExpeditionMeta } from './server-api';

const SITE_URL = 'https://heimursaga.com';
const PUBLIC_DOMAIN_LICENSE =
  'https://creativecommons.org/publicdomain/mark/1.0/';

/**
 * Titles for historical entries are stored as "Explorer Name - Title".
 * Split off the explorer so we can use a real historical-figure name in
 * Person schema instead of the generic platform username.
 */
export function splitHistoricalTitle(rawTitle: string | undefined): {
  explorer?: string;
  title: string;
} {
  if (!rawTitle) return { title: '' };
  const sepIdx = rawTitle.indexOf(' - ');
  if (sepIdx === -1) return { title: rawTitle };
  return {
    explorer: rawTitle.slice(0, sepIdx).trim(),
    title: rawTitle.slice(sepIdx + 3).trim(),
  };
}

function ensureProtocol(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function imageObject(url: string, license?: string) {
  return {
    '@type': 'ImageObject',
    url,
    ...(license ? { license, acquireLicensePage: license } : {}),
  };
}

export function buildEntryJsonLd(entry: EntryMeta): object | null {
  if (!entry) return null;
  const isHistorical = entry.entryType === 'historical';
  const { explorer, title: cleanTitle } = isHistorical
    ? splitHistoricalTitle(entry.title)
    : { explorer: undefined, title: entry.title };

  const url = `${SITE_URL}/entry/${entry.publicId}`;
  const personUrl = entry.authorUsername
    ? `${SITE_URL}/journal/${entry.authorUsername}`
    : undefined;
  const personId = personUrl ? `${personUrl}#person` : undefined;
  const expeditionUrl = entry.expeditionPublicId
    ? `${SITE_URL}/expedition/${entry.expeditionPublicId}`
    : undefined;

  const description =
    typeof entry.metadata?.editorialIntro === 'string' && entry.metadata.editorialIntro
      ? (entry.metadata.editorialIntro as string).slice(0, 300)
      : (entry.body || '')
          .replace(/[#*_~`>\[\]()!]/g, '')
          .slice(0, 300);

  const imageUrls: string[] = [];
  if (entry.coverImage) imageUrls.push(entry.coverImage);
  for (const im of entry.images || []) {
    if (im && !imageUrls.includes(im)) imageUrls.push(im);
  }

  const articleNode: Record<string, unknown> = {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: cleanTitle,
    name: cleanTitle,
    description,
    url,
    inLanguage: 'en',
    ...(entry.publishedAt ? { datePublished: entry.publishedAt } : {}),
    ...(entry.date ? { dateCreated: entry.date } : {}),
    ...(personId
      ? {
          author: {
            '@id': personId,
          },
        }
      : {}),
    ...(imageUrls.length > 0
      ? {
          image: imageUrls.map((u) =>
            imageObject(u, isHistorical ? PUBLIC_DOMAIN_LICENSE : undefined),
          ),
        }
      : {}),
    ...(isHistorical
      ? {
          articleSection: 'Historical Archive',
          license: PUBLIC_DOMAIN_LICENSE,
          isBasedOn: 'https://www.gutenberg.org/',
        }
      : {}),
    ...(expeditionUrl
      ? {
          isPartOf: { '@id': `${expeditionUrl}#event` },
        }
      : {}),
  };

  // Place + GeoCoordinates
  const placeNode =
    typeof entry.lat === 'number' && typeof entry.lon === 'number'
      ? {
          '@type': 'Place',
          '@id': `${url}#place`,
          ...(entry.place ? { name: entry.place } : {}),
          geo: {
            '@type': 'GeoCoordinates',
            latitude: entry.lat,
            longitude: entry.lon,
          },
        }
      : null;
  if (placeNode) {
    articleNode.contentLocation = { '@id': `${url}#place` };
  }

  // Person — prefer the historical figure name when available
  const personNode = personId
    ? {
        '@type': 'Person',
        '@id': personId,
        name: explorer || entry.authorName || entry.authorUsername,
        url: personUrl,
        ...(entry.authorPicture ? { image: entry.authorPicture } : {}),
      }
    : null;

  // BreadcrumbList: Home › Entries (or Expedition) › Entry Title
  const crumbs: object[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Heimursaga',
      item: SITE_URL,
    },
  ];
  if (expeditionUrl && entry.expeditionTitle) {
    const { title: expCleanTitle } = isHistorical
      ? splitHistoricalTitle(entry.expeditionTitle)
      : { title: entry.expeditionTitle };
    crumbs.push({
      '@type': 'ListItem',
      position: 2,
      name: expCleanTitle,
      item: expeditionUrl,
    });
    crumbs.push({
      '@type': 'ListItem',
      position: 3,
      name: cleanTitle,
    });
  } else {
    crumbs.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Entries',
      item: `${SITE_URL}/entries`,
    });
    crumbs.push({
      '@type': 'ListItem',
      position: 3,
      name: cleanTitle,
    });
  }

  const graph: object[] = [articleNode];
  if (placeNode) graph.push(placeNode);
  if (personNode) graph.push(personNode);
  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: crumbs,
  });

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildExpeditionJsonLd(
  expedition: ExpeditionMeta,
): object | null {
  if (!expedition) return null;
  const url = `${SITE_URL}/expedition/${expedition.publicId}`;
  const isHistorical =
    !!expedition.endDate && new Date(expedition.endDate) < new Date('1923-01-01');

  const { explorer, title: cleanTitle } = isHistorical
    ? splitHistoricalTitle(expedition.title)
    : { explorer: undefined, title: expedition.title };

  const personUrl = expedition.authorUsername
    ? `${SITE_URL}/journal/${expedition.authorUsername}`
    : undefined;
  const personId = personUrl ? `${personUrl}#person` : undefined;

  const eventNode: Record<string, unknown> = {
    '@type': 'Event',
    '@id': `${url}#event`,
    name: cleanTitle,
    description: expedition.description?.slice(0, 500),
    url,
    inLanguage: 'en',
    ...(expedition.startDate ? { startDate: expedition.startDate } : {}),
    ...(expedition.endDate ? { endDate: expedition.endDate } : {}),
    ...(expedition.coverImage
      ? {
          image: imageObject(
            expedition.coverImage,
            isHistorical ? PUBLIC_DOMAIN_LICENSE : undefined,
          ),
        }
      : {}),
    ...(personId
      ? {
          organizer: { '@id': personId },
          performer: { '@id': personId },
        }
      : {}),
    ...(expedition.region
      ? {
          location: {
            '@type': 'Place',
            name: expedition.region,
          },
        }
      : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
  };

  const personNode = personId
    ? {
        '@type': 'Person',
        '@id': personId,
        name: explorer || expedition.authorName || expedition.authorUsername,
        url: personUrl,
      }
    : null;

  const crumbs: object[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Heimursaga',
      item: SITE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Expeditions',
      item: `${SITE_URL}/expeditions`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: cleanTitle,
    },
  ];

  const graph: object[] = [eventNode];
  if (personNode) graph.push(personNode);
  graph.push({
    '@type': 'BreadcrumbList',
    itemListElement: crumbs,
  });

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

/**
 * Inline-render JSON-LD as a `<script type="application/ld+json">` tag.
 * Use inside a server component so the data lands in the initial HTML.
 *
 * Stringify with JSON.stringify (not pretty-printed) and ensure no </script>
 * sequence in the rendered output. None of our schema values produce that
 * sequence in practice, but escape defensively.
 */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/<\/script/gi, '<\\/script');
}
