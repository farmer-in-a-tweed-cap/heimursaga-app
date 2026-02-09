import type { Metadata } from 'next';
import { ExplorerGuidelinesPage } from '@/app/pages/ExplorerGuidelinesPage';

export const metadata: Metadata = {
  title: 'Explorer Guidelines',
  description:
    'Community guidelines for explorers using the Heimursaga platform.',
};

export default function Page() {
  return <ExplorerGuidelinesPage />;
}
