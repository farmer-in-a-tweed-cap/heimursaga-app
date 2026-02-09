import type { Metadata } from 'next';
import { getExplorerProfile } from '@/lib/server-api';
import { ExplorerProfilePage } from '@/app/pages/ExplorerProfilePage';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const explorer = await getExplorerProfile(username);
  if (!explorer) return { title: 'Explorer Not Found' };
  return {
    title: explorer.displayName || explorer.username,
    description: explorer.bio?.slice(0, 160) || `Follow ${explorer.displayName || explorer.username}'s expeditions on Heimursaga.`,
    openGraph: {
      type: 'profile',
      images: explorer.picture ? [explorer.picture] : [],
    },
  };
}

export default function Page() {
  return <ExplorerProfilePage />;
}
