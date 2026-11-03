import type { Metadata } from 'next';
import { ExpeditionsPage } from '@/app/pages/ExpeditionsPage';
import { DEFAULT_OG_IMAGE } from '@/lib/static-map';

export const metadata: Metadata = {
  alternates: { canonical: '/expeditions' },
  title: 'Expeditions',
  description:
    'Browse, follow, and sponsor expeditions from explorers around the world.',
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: 'Expeditions | Heimursaga',
    description:
      'Browse, follow, and sponsor expeditions from explorers around the world.',
    url: 'https://heimursaga.com/expeditions',
  },
};

export default function Page() {
  return <ExpeditionsPage />;
}
