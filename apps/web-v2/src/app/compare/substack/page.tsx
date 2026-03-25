import type { Metadata } from 'next';
import { CompareSubstackPage } from '@/app/pages/CompareSubstackPage';

export const metadata: Metadata = {
  title: 'Substack vs Heimursaga',
  description:
    'An honest side-by-side comparison of Substack and Heimursaga for expedition creators — fees, features, and storytelling tools.',
  openGraph: {
    title: 'Substack vs Heimursaga | Heimursaga',
    description:
      'An honest side-by-side comparison of Substack and Heimursaga for expedition creators — fees, features, and storytelling tools.',
    url: 'https://heimursaga.com/compare/substack',
  },
};

export default function Page() {
  return <CompareSubstackPage />;
}
