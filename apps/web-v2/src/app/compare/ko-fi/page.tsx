import type { Metadata } from 'next';
import { CompareKofiPage } from '@/app/pages/CompareKofiPage';

export const metadata: Metadata = {
  title: 'Ko-fi vs Heimursaga for Expedition Creators (2026)',
  description:
    'Compare Ko-fi and Heimursaga side by side — 0% tip fees vs expedition-specific tools, memberships, mapping features, and sponsorship for adventure creators.',
  alternates: { canonical: '/compare/ko-fi' },
  openGraph: {
    title: 'Ko-fi vs Heimursaga | Heimursaga',
    description:
      'Compare Ko-fi and Heimursaga side by side — 0% tip fees vs expedition-specific tools, memberships, and sponsorship for adventure creators.',
    url: 'https://heimursaga.com/compare/ko-fi',
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
            { '@type': 'ListItem', position: 3, name: 'Ko-fi vs Heimursaga' },
          ],
        }) }}
      />
      <CompareKofiPage />
    </>
  );
}
