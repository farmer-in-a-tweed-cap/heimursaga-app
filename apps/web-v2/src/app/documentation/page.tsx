import type { Metadata } from 'next';
import { DocumentationPage } from '@/app/pages/DocumentationPage';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Learn how to use Heimursaga to document expeditions, connect with explorers, and manage sponsorships.',
};

export default function Page() {
  return <DocumentationPage />;
}
