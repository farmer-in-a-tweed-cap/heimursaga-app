import type { Metadata } from 'next';
import { getEntry } from '@/lib/server-api';
import { JournalEntryPage } from '@/app/pages/JournalEntryPage';

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const entry = await getEntry(entryId);
  if (!entry) return { title: 'Journal Entry | Heimursaga' };

  const authorLabel = entry.authorUsername || 'an explorer';
  const title = `${entry.title} — a journal entry by ${authorLabel} — Heimursaga`;
  const description = entry.body?.replace(/[#*_~`>\[\]()!]/g, '').slice(0, 160) || 'Read this journal entry on Heimursaga.';
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

export default function Page() {
  return <JournalEntryPage />;
}
