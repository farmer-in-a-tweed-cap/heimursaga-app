import type { Metadata } from 'next';
import { getExpedition } from '@/lib/server-api';
import { SponsorshipPaymentPage } from '@/app/pages/SponsorshipPaymentPage';

export async function generateMetadata({ params }: { params: Promise<{ expeditionId: string }> }): Promise<Metadata> {
  const { expeditionId } = await params;
  const expedition = await getExpedition(expeditionId);
  if (!expedition) return { title: 'Sponsor Expedition' };
  return {
    title: `Sponsor ${expedition.title}`,
    description: `Support this expedition on Heimursaga.`,
    robots: 'noindex',
  };
}

export default function Page() {
  return <SponsorshipPaymentPage />;
}
