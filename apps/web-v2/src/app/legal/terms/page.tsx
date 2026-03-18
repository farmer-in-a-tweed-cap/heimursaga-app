import type { Metadata } from 'next';
import { TermsOfServicePage } from '@/app/pages/TermsOfServicePage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the Terms of Service for Heimursaga, the global expedition documentation and sponsorship platform.',
  openGraph: {
    title: 'Terms of Service | Heimursaga',
    description:
      'Read the Terms of Service for Heimursaga, the global expedition documentation and sponsorship platform.',
    url: 'https://heimursaga.com/legal/terms',
  },
};

export default function Page() {
  return <TermsOfServicePage />;
}
