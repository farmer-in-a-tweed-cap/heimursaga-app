import type { Metadata } from 'next';
import { ComparePage } from '@/app/pages/ComparePage';

export const metadata: Metadata = {
  title: 'Patreon vs Heimursaga',
  description:
    'An honest side-by-side comparison of Patreon and Heimursaga for expedition creators — fees, features, and storytelling tools.',
  openGraph: {
    title: 'Patreon vs Heimursaga | Heimursaga',
    description:
      'An honest side-by-side comparison of Patreon and Heimursaga for expedition creators — fees, features, and storytelling tools.',
    url: 'https://heimursaga.com/compare/patreon',
  },
};

export default function Page() {
  return <ComparePage />;
}
