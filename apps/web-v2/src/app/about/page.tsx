import type { Metadata } from 'next';
import { AboutPage } from '@/app/pages/AboutPage';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Heimursaga — the journaling and fundraising platform for explorers.',
};

export default function Page() {
  return <AboutPage />;
}
