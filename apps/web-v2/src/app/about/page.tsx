import type { Metadata } from 'next';
import { AboutPage } from '@/app/pages/AboutPage';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Heimursaga — the journaling and fundraising platform for explorers.',
  openGraph: {
    title: 'About | Heimursaga',
    description:
      'Learn about Heimursaga — the journaling and fundraising platform for explorers.',
    url: 'https://heimursaga.com/about',
  },
};

export default function Page() {
  return <AboutPage />;
}
