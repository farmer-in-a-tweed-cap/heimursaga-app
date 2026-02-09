import type { Metadata } from 'next';
import { getExpedition } from '@/lib/server-api';
import { ExpeditionDetailPage } from '@/app/pages/ExpeditionDetailPage';

export async function generateMetadata({ params }: { params: Promise<{ expeditionId: string }> }): Promise<Metadata> {
  const { expeditionId } = await params;
  const expedition = await getExpedition(expeditionId);
  if (!expedition) return { title: 'Expedition Not Found' };
  return {
    title: expedition.title,
    description: expedition.description?.slice(0, 160) || 'Follow this expedition on Heimursaga.',
    openGraph: {
      type: 'website',
      images: expedition.coverImage ? [expedition.coverImage] : [],
    },
  };
}

export default function Page() {
  return <ExpeditionDetailPage />;
}
