import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EmbedExpeditionMap } from '@/app/pages/EmbedExpeditionPage';

export const metadata: Metadata = {
  title: 'Expedition Map Embed',
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ expeditionId: string }> }) {
  const { expeditionId } = await params;
  if (!expeditionId || !/^[a-zA-Z0-9_-]{1,128}$/.test(expeditionId)) {
    notFound();
  }
  return <EmbedExpeditionMap expeditionId={expeditionId} />;
}
