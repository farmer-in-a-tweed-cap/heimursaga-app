import type { Metadata } from 'next';
import { EntriesPage } from '@/app/pages/EntriesPage';

export const metadata: Metadata = {
  alternates: { canonical: '/entries' },
  title: 'Entries',
  description:
    'Read geo-tagged journal entries from explorers documenting their adventures.',
};

export default function Page() {
  return <EntriesPage />;
}
