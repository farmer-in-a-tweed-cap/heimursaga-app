import type { Metadata } from 'next';
import { TermsOfServicePage } from '@/app/pages/TermsOfServicePage';
import { DEFAULT_OG_IMAGE } from '@/lib/static-map';

export const metadata: Metadata = {
  alternates: { canonical: '/legal/terms' },
  title: 'Terms of Service',
  description:
    'Read the Terms of Service for Heimursaga, the global expedition documentation and sponsorship platform.',
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: 'Terms of Service | Heimursaga',
    description:
      'Read the Terms of Service for Heimursaga, the global expedition documentation and sponsorship platform.',
    url: 'https://heimursaga.com/legal/terms',
  },
};

export default function Page() {
  return <TermsOfServicePage />;
}
