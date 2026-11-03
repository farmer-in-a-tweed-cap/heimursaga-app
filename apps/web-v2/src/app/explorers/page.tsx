import type { Metadata } from 'next';
import { ExplorersPage } from '@/app/pages/ExplorersPage';
import { DEFAULT_OG_IMAGE } from '@/lib/static-map';

export const metadata: Metadata = {
  alternates: { canonical: '/explorers' },
  title: 'Explorers',
  description:
    'Discover explorers from around the world sharing their adventures on Heimursaga.',
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: 'Explorers | Heimursaga',
    description:
      'Discover explorers from around the world sharing their adventures on Heimursaga.',
    url: 'https://heimursaga.com/explorers',
  },
};

export default function Page() {
  return <ExplorersPage />;
}
