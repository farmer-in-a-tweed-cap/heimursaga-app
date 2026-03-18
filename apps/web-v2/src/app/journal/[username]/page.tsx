import type { Metadata } from 'next';
import { getExplorerProfile } from '@/lib/server-api';
import { ExplorerProfilePage } from '@/app/pages/ExplorerProfilePage';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const explorer = await getExplorerProfile(username);
  if (!explorer) return { title: 'Explorer | Heimursaga' };

  const title = explorer.displayName || explorer.username;
  const description = explorer.bio?.slice(0, 160) || `Follow ${explorer.displayName || explorer.username}'s expeditions on Heimursaga.`;
  const images = explorer.picture ? [explorer.picture] : [];

  return {
    title,
    description,
    openGraph: {
      type: 'profile',
      title,
      description,
      images,
    },
    twitter: {
      card: explorer.picture ? 'summary_large_image' : 'summary',
      title,
      description,
      images,
    },
  };
}

export default function Page() {
  return <ExplorerProfilePage />;
}
