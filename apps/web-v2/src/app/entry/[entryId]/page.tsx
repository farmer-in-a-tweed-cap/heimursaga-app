import type { Metadata } from 'next';
import { getEntry } from '@/lib/server-api';
import { JournalEntryPage } from '@/app/pages/JournalEntryPage';

export async function generateMetadata({ params }: { params: Promise<{ entryId: string }> }): Promise<Metadata> {
  const { entryId } = await params;
  const entry = await getEntry(entryId);
  if (!entry) return { title: 'Entry Not Found' };
  return {
    title: entry.title,
    description: entry.body?.slice(0, 160) || 'Read this journal entry on Heimursaga.',
    openGraph: {
      type: 'article',
      images: entry.coverImage ? [entry.coverImage] : [],
      ...(entry.publishedAt && { publishedTime: entry.publishedAt }),
    },
  };
}

export default function Page() {
  return <JournalEntryPage />;
}
