import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { getExpedition } from '@/lib/server-api';
import { DEFAULT_OG_IMAGE, OG_IMAGE_SIZE, staticMapUrl } from '@/lib/static-map';
import { ExpeditionDetailPage } from '@/app/pages/ExpeditionDetailPage';
import {
  ExpeditionArticleSsr,
  SsrShellAssets,
} from '@/app/components/ssr/SsrArticleShell';
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
  // Cover photo, else a map of the route, else the site image.
  const mapImage = staticMapUrl(expedition.waypoints ?? []);
  const images = [
    expedition.coverImage
      ? { url: expedition.coverImage, alt: expedition.title }
      : mapImage
        ? { ...OG_IMAGE_SIZE, url: mapImage, alt: `Map of ${expedition.title}` }
        : { ...OG_IMAGE_SIZE, url: DEFAULT_OG_IMAGE, alt: 'Heimursaga' },
  ];

  const canonical = `https://heimursaga.com/expedition/${expedition.slug || expedition.publicId}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
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

  // Canonicalize: legacy publicId URL → slug URL (308 permanent).
  if (expedition?.slug && expedition.slug !== expeditionId) {
    permanentRedirect(`/expedition/${expedition.slug}`);
  }

  const ld = expedition ? buildExpeditionJsonLd(expedition) : null;

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
        />
      )}
      {expedition && (
        <>
          <SsrShellAssets />
          <ExpeditionArticleSsr expedition={expedition} />
        </>
      )}
      <ExpeditionDetailPage />
    </>
  );
}
