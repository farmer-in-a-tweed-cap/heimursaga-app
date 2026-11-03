import type { Metadata } from 'next';
import { AboutPage } from '@/app/pages/AboutPage';
import { DEFAULT_OG_IMAGE } from '@/lib/static-map';

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  title: 'About',
  description:
    'Learn about Heimursaga — the journaling and fundraising platform for explorers.',
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: 'About | Heimursaga',
    description:
      'Learn about Heimursaga — the journaling and fundraising platform for explorers.',
    url: 'https://heimursaga.com/about',
  },
};

export default function Page() {
  return <AboutPage />;
}
