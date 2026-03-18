import type { Metadata } from 'next';
import { ExpeditionsPage } from '@/app/pages/ExpeditionsPage';

export const metadata: Metadata = {
  title: 'Expeditions',
  description:
    'Browse, follow, and sponsor expeditions from explorers around the world.',
  openGraph: {
    title: 'Expeditions | Heimursaga',
    description:
      'Browse, follow, and sponsor expeditions from explorers around the world.',
    url: 'https://heimursaga.com/expeditions',
  },
};

export default function Page() {
  return <ExpeditionsPage />;
}
