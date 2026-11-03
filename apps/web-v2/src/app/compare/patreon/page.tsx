import type { Metadata } from 'next';
import { ComparePage } from '@/app/pages/ComparePage';
import { DEFAULT_OG_IMAGE } from '@/lib/static-map';

export const metadata: Metadata = {
  title: 'Patreon vs Heimursaga for Expedition Creators (2026)',
  description:
    'Compare Patreon and Heimursaga side by side — fees, sponsorship tools, mapping features, and expedition storytelling for sailors, overlanders, and adventure creators.',
  alternates: { canonical: '/compare/patreon' },
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: 'Patreon vs Heimursaga | Heimursaga',
    description:
      'Compare Patreon and Heimursaga side by side — fees, sponsorship tools, mapping features, and expedition storytelling for adventure creators.',
    url: 'https://heimursaga.com/compare/patreon',
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
            { '@type': 'ListItem', position: 3, name: 'Patreon vs Heimursaga' },
          ],
        }) }}
      />
      <ComparePage />
    </>
  );
}
