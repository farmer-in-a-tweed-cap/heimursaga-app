import type { Metadata } from 'next';
import { getExplorerProfile } from '@/lib/server-api';
import { DEFAULT_OG_IMAGE, OG_IMAGE_SIZE } from '@/lib/static-map';
import { ExplorerProfilePage } from '@/app/pages/ExplorerProfilePage';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const explorer = await getExplorerProfile(username);
  if (!explorer) return { title: 'Explorer | Heimursaga' };

  const title = explorer.displayName || explorer.username;
  const description = explorer.bio?.slice(0, 160) || `Follow ${explorer.displayName || explorer.username}'s expeditions on Heimursaga.`;
  const images = [
    explorer.picture
      ? { url: explorer.picture, alt: title }
      : { ...OG_IMAGE_SIZE, url: DEFAULT_OG_IMAGE, alt: 'Heimursaga' },
  ];
  const canonical = `https://heimursaga.com/journal/${explorer.username}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      title,
      description,
      images,
    },
    twitter: {
      card: explorer.picture ? 'summary' : 'summary_large_image',
      title,
      description,
      images,
    },
  };
}

export default function Page() {
  return <ExplorerProfilePage />;
}
