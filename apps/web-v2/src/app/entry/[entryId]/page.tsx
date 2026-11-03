import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getEntry } from '@/lib/server-api';
import { DEFAULT_OG_IMAGE, OG_IMAGE_SIZE, staticMapUrl } from '@/lib/static-map';
import { JournalEntryPage } from '@/app/pages/JournalEntryPage';
import {
  EntryArticleSsr,
  SsrShellAssets,
} from '@/app/components/ssr/SsrArticleShell';
import {
  buildEntryJsonLd,
  buildEntryDescription,
  jsonLdScript,
  splitHistoricalTitle,
} from '@/lib/seo-jsonld';

function formatHistoricalDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ entryId: string }>;
}): Promise<Metadata> {
  const { entryId } = await params;
  const entry = await getEntry(entryId);
  if (!entry) return { title: 'Journal Entry | Heimursaga' };

  const isHistorical = entry.entryType === 'historical';
  const { explorer, title: cleanTitle } = splitHistoricalTitle(entry.title);

  let title: string;
  if (isHistorical) {
    const datePretty = formatHistoricalDate(entry.date || entry.publishedAt);
    if (explorer && datePretty) {
      title = `${cleanTitle}: ${explorer} on ${datePretty} — Heimursaga`;
    } else if (explorer) {
      title = `${cleanTitle}: ${explorer} — Heimursaga`;
    } else {
      title = `${cleanTitle} — Heimursaga`;
    }
  } else {
    const authorLabel = entry.authorUsername || 'an explorer';
    title = `${entry.title} — a journal entry by ${authorLabel} — Heimursaga`;
  }

  // Description: mechanical template assembled from structured fields for
  // historical entries (no AI-generated prose); body excerpt for live
  // entries authored by users.
  const description = (
    buildEntryDescription(entry, isHistorical, explorer, cleanTitle) ||
    'Read this journal entry on Heimursaga.'
  ).slice(0, 160);

  // Cover photo, else a map of where it was written, else the author's
  // picture, else the site image.
  const mapImage =
    entry.lat !== undefined && entry.lon !== undefined
      ? staticMapUrl([{ lat: entry.lat, lon: entry.lon }])
      : null;
  const images = [
    entry.coverImage
      ? { url: entry.coverImage, alt: cleanTitle }
      : mapImage
        ? { ...OG_IMAGE_SIZE, url: mapImage, alt: `Map of ${entry.place || cleanTitle}` }
        : entry.authorPicture
          ? { url: entry.authorPicture, alt: entry.authorUsername || 'Explorer' }
          : { ...OG_IMAGE_SIZE, url: DEFAULT_OG_IMAGE, alt: 'Heimursaga' },
  ];

  const canonical = `https://heimursaga.com/entry/${entry.slug || entry.publicId}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      images,
      ...(entry.publishedAt && { publishedTime: entry.publishedAt }),
    },
    twitter: {
      card: entry.authorPicture && !entry.coverImage && !mapImage ? 'summary' : 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const entry = await getEntry(entryId);

  // Permanent redirect from legacy publicId URL to the canonical slug URL
  // when one is available. permanentRedirect emits 308; Google treats this
  // the same as 301 and transfers ranking signals.
  if (entry?.slug && entry.slug !== entryId) {
    permanentRedirect(`/entry/${entry.slug}`);
  }

  const ld = entry ? buildEntryJsonLd(entry) : null;

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
        />
      )}
      {entry && (
        <>
          <SsrShellAssets />
          <EntryArticleSsr entry={entry} />
        </>
      )}
      <JournalEntryPage />
    </>
  );
}
