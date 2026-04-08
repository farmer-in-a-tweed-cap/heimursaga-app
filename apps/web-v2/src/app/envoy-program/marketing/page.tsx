import type { Metadata } from 'next';
import { EnvoyMarketingPage } from '@/app/pages/EnvoyMarketingPage';

export const metadata: Metadata = {
  title: 'Envoy Program — Marketing Reference | Heimursaga',
  description:
    'Marketing reference material for the Heimursaga Envoy Program.',
  robots: 'noindex, nofollow',
};

export default function Page() {
  return <EnvoyMarketingPage />;
}
