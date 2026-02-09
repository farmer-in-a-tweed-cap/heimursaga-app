import type { Metadata } from 'next';
import { ExpeditionsPage } from '@/app/pages/ExpeditionsPage';

export const metadata: Metadata = {
  title: 'Expeditions',
  description:
    'Browse, follow, and sponsor expeditions from explorers around the world.',
};

export default function Page() {
  return <ExpeditionsPage />;
}
