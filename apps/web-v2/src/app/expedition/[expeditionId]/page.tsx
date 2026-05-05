import type { Metadata } from 'next';
import { getExpedition } from '@/lib/server-api';
import { ExpeditionDetailPage } from '@/app/pages/ExpeditionDetailPage';
import {
  buildExpeditionJsonLd,
  jsonLdScript,
} from '@/lib/seo-jsonld';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ expeditionId: string }>;
}): Promise<Metadata> {
  const { expeditionId } = await params;
  const expedition = await getExpedition(expeditionId);
  if (!expedition) return { title: 'Expedition | Heimursaga' };

  const title = expedition.authorUsername
    ? `${expedition.title} — an expedition by ${expedition.authorUsername} — Heimursaga`
    : `${expedition.title} — Heimursaga`;
  const description =
    expedition.description?.slice(0, 160) ||
    'Follow this expedition on Heimursaga.';
  const images = expedition.coverImage ? [expedition.coverImage] : [];

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      images,
    },
    twitter: {
      card: expedition.coverImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ expeditionId: string }>;
}) {
  const { expeditionId } = await params;
  const expedition = await getExpedition(expeditionId);
  const ld = expedition ? buildExpeditionJsonLd(expedition) : null;

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
        />
      )}
      <ExpeditionDetailPage />
    </>
  );
}
