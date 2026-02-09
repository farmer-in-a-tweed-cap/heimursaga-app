import type { Metadata } from 'next';
import { SponsorshipGuidePage } from '@/app/pages/SponsorshipGuidePage';

export const metadata: Metadata = {
  title: 'Sponsorship Guide',
  description:
    'Learn how expedition sponsorship works on Heimursaga.',
};

export default function Page() {
  return <SponsorshipGuidePage />;
}
