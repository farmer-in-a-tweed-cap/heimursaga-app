import type { Metadata } from 'next';
import { getEntry } from '@/lib/server-api';
import { JournalEntryPage } from '@/app/pages/JournalEntryPage';
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

  const images = entry.coverImage
    ? [entry.coverImage]
    : entry.authorPicture
      ? [entry.authorPicture]
      : [];

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      images,
      ...(entry.publishedAt && { publishedTime: entry.publishedAt }),
    },
    twitter: {
      card: entry.coverImage ? 'summary_large_image' : 'summary',
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
  const ld = entry ? buildEntryJsonLd(entry) : null;

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
        />
      )}
      <JournalEntryPage />
    </>
  );
}
