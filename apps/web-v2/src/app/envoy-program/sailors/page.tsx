import type { Metadata } from 'next';
import { EnvoySailorsPage } from '@/app/pages/EnvoySailorsPage';

export const metadata: Metadata = {
  title: 'Envoy Program for Sailors — Marketing Reference | Heimursaga',
  description:
    'Marketing reference material for the Heimursaga Envoy Program, tailored for sailors and cruisers.',
  robots: 'noindex, nofollow',
};

export default function Page() {
  return <EnvoySailorsPage />;
}
