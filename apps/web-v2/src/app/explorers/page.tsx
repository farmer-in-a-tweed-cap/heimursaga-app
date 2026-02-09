import type { Metadata } from 'next';
import { ExplorersPage } from '@/app/pages/ExplorersPage';

export const metadata: Metadata = {
  title: 'Explorers',
  description:
    'Discover explorers from around the world sharing their adventures on Heimursaga.',
};

export default function Page() {
  return <ExplorersPage />;
}
