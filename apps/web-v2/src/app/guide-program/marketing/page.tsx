import type { Metadata } from 'next';
import { GuideMarketingPage } from '@/app/pages/GuideMarketingPage';

export const metadata: Metadata = {
  title: 'Expedition Guide Program — Marketing Reference',
  description:
    'Marketing reference material for the Heimursaga Expedition Guide Program.',
  robots: 'noindex, nofollow',
};

export default function Page() {
  return <GuideMarketingPage />;
}
