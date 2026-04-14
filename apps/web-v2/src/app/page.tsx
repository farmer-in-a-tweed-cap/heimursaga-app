import type { Metadata } from 'next';
import { HomePage } from '@/app/pages/HomePage';

export const metadata: Metadata = {
  other: {
    'facebook-domain-verification': 'yk3xtzu4wv7wtapa18gyaq2yhpncge',
  },
};

export default function Page() {
  return <HomePage />;
}
