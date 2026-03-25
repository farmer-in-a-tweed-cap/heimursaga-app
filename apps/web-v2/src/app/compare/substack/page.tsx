import type { Metadata } from 'next';
import { CompareSubstackPage } from '@/app/pages/CompareSubstackPage';

export const metadata: Metadata = {
  title: 'Substack vs Heimursaga for Expedition Creators (2026)',
  description:
    'Compare Substack and Heimursaga side by side — newsletter delivery vs expedition maps, subscription fees, content tools, and storytelling for adventure creators.',
  alternates: { canonical: '/compare/substack' },
  openGraph: {
    title: 'Substack vs Heimursaga | Heimursaga',
    description:
      'Compare Substack and Heimursaga side by side — newsletter delivery vs expedition maps, subscription fees, and storytelling for adventure creators.',
    url: 'https://heimursaga.com/compare/substack',
    type: 'website',
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://heimursaga.com' },
            { '@type': 'ListItem', position: 2, name: 'Compare Platforms', item: 'https://heimursaga.com/compare' },
            { '@type': 'ListItem', position: 3, name: 'Substack vs Heimursaga' },
          ],
        }) }}
      />
      <CompareSubstackPage />
    </>
  );
}
