import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getHistoricalArchive } from '@/lib/server-api';
import { jsonLdScript } from '@/lib/seo-jsonld';
import type {
  IHistoricalArchiveEntry,
  IHistoricalArchiveExpedition,
} from '@repo/types';
import { explorerSlug } from '../../buckets';
import {
  EXPLORER_BIOS,
  bioBySlug,
  citationLabelFor,
  type ExplorerBio,
} from '../bios';

const SITE_URL = 'https://heimursaga.com';

export const revalidate = 600;

export function generateStaticParams() {
  // Skip in dev — Next.js 15's static-paths worker races with the main
  // dev compile, trying to load the page module before vendor chunks
  // (e.g. posthog-js, pulled in transitively via client components in
  // the page tree) are written to disk. Returning [] avoids the worker
  // load path entirely; pages still render on-demand thanks to the
  // default `dynamicParams: true`. Production builds get full SSG.
  if (process.env.NODE_ENV === 'development') return [];
  return EXPLORER_BIOS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bio = bioBySlug(slug);
  if (!bio) return { title: 'Explorer | Heimursaga' };

  const canonical = `${SITE_URL}/historical-archive/explorers/${bio.slug}`;
  const title = `${bio.shortName} — Expedition Journals | Heimursaga`;
  const description = bio.prose.slice(0, 200);

  // Try to use the first cover image from one of this explorer's expeditions
  // as the og:image. Fetch is fetch-cached so this doesn't double-fetch with
  // the page render.
  const archive = await getHistoricalArchive();
  const cover = archive?.expeditions.find(
    (x) => x.explorer === bio.displayName && x.coverImage,
  )?.coverImage;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      url: canonical,
      title,
      description,
      images: cover ? [cover] : undefined,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

function formatDateShort(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function toIsoDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function formatYearRange(
  start?: Date | string | null,
  end?: Date | string | null,
): string {
  const s = start ? new Date(start).getUTCFullYear() : undefined;
  const e = end ? new Date(end).getUTCFullYear() : undefined;
  if (s && e && s !== e) return `${s}–${e}`;
  if (s) return `${s}`;
  if (e) return `${e}`;
  return '';
}

function expeditionHref(x: IHistoricalArchiveExpedition): string {
  return `/expedition/${x.slug || x.publicId}`;
}

function entryHref(e: IHistoricalArchiveEntry): string {
  return `/entry/${e.slug || e.publicId}`;
}

function bucketByDecade(
  entries: IHistoricalArchiveEntry[],
): { decade: number; entries: IHistoricalArchiveEntry[] }[] {
  const buckets = new Map<number, IHistoricalArchiveEntry[]>();
  for (const e of entries) {
    const year = e.date ? new Date(e.date).getUTCFullYear() : null;
    if (year == null || !Number.isFinite(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    const bucket = buckets.get(decade);
    if (bucket) bucket.push(e);
    else buckets.set(decade, [e]);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, list]) => ({ decade, entries: list }));
}

function ExpeditionCard({ x }: { x: IHistoricalArchiveExpedition }) {
  const years = formatYearRange(x.startDate, x.endDate);
  return (
    <Link
      href={expeditionHref(x)}
      className="group block bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors"
    >
      <div className="relative aspect-[16/10] bg-[#e8e8e8] dark:bg-[#2a2a2a] overflow-hidden">
        {x.coverImage ? (
          <ImageWithFallback
            src={x.coverImage}
            alt={x.cleanTitle}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#616161] font-mono">
            NO COVER
          </div>
        )}
        <div className="absolute top-0 left-0 bg-[#202020]/85 text-white px-3 py-1 text-[10px] font-mono font-bold tracking-wider">
          {years || 'HISTORICAL'}
        </div>
      </div>
      <div className="p-4 border-t-2 border-[#202020] dark:border-[#616161]">
        <h3 className="text-base font-serif font-bold leading-tight text-[#202020] dark:text-[#e5e5e5] mb-2 group-hover:text-[#ac6d46]">
          {x.cleanTitle}
        </h3>
        {x.description && (
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-serif leading-relaxed line-clamp-3">
            {x.description}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] flex items-center justify-between text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4]">
          <span>
            {x.entriesCount} {x.entriesCount === 1 ? 'ENTRY' : 'ENTRIES'}
          </span>
          {x.region && <span className="uppercase">{x.region}</span>}
        </div>
      </div>
    </Link>
  );
}

function EntryTimelineRow({ e }: { e: IHistoricalArchiveEntry }) {
  const dateLabel = formatDateShort(e.date);
  const dateIso = toIsoDate(e.date);
  return (
    <Link
      href={entryHref(e)}
      className="group block h-full hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
    >
      <div className="px-4 md:px-6 py-2.5 md:py-3 min-w-0">
        {dateIso ? (
          <time
            dateTime={dateIso}
            className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider block mb-1"
          >
            {dateLabel?.toUpperCase()}
          </time>
        ) : (
          <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider block mb-1">
            {dateLabel?.toUpperCase()}
          </span>
        )}
        <h4 className="font-serif font-bold text-sm md:text-base text-[#202020] dark:text-[#e5e5e5] group-hover:text-[#ac6d46] leading-snug">
          {e.cleanTitle}
        </h4>
        {e.place && (
          <div className="text-[11px] text-[#616161] dark:text-[#b5bcc4] font-mono truncate mt-0.5">
            {e.place}
          </div>
        )}
      </div>
    </Link>
  );
}

function SectionHeader({ label, count }: { label: string; count?: number }) {
  return (
    <div className="bg-[#616161] text-white px-4 md:px-6 py-2.5 md:py-3 border-b-2 border-[#202020] dark:border-[#4a4a4a] flex items-center justify-between gap-3">
      <h2 className="text-xs md:text-sm font-bold tracking-[0.14em]">{label}</h2>
      {count !== undefined && (
        <span className="text-[10px] md:text-xs font-mono text-[#e5e5e5] whitespace-nowrap">
          {count}
        </span>
      )}
    </div>
  );
}

function buildJsonLd(
  bio: ExplorerBio,
  expeditions: IHistoricalArchiveExpedition[],
  pageUrl: string,
): object {
  const personId = `${pageUrl}#person`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#page`,
        url: pageUrl,
        name: `${bio.shortName} — Expedition Journals`,
        description: bio.prose.slice(0, 240),
        inLanguage: 'en',
        about: { '@id': personId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: bio.shortName,
        description: bio.knownFor,
        url: pageUrl,
        sameAs: bio.source === 'wikipedia' ? [bio.sourceUrl] : undefined,
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#expeditions`,
        name: `Expeditions by ${bio.shortName}`,
        numberOfItems: expeditions.length,
        itemListElement: expeditions.map((x, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}${expeditionHref(x)}`,
          name: x.cleanTitle,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Heimursaga', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Historical Archive',
            item: `${SITE_URL}/historical-archive`,
          },
          { '@type': 'ListItem', position: 3, name: bio.displayName, item: pageUrl },
        ],
      },
    ],
  };
}

export default async function ExplorerHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bio = bioBySlug(slug);
  if (!bio) notFound();

  const archive = await getHistoricalArchive();
  const allExpeditions = archive?.expeditions || [];
  const allEntries = archive?.entries || [];

  // Filter by display name (matches the parsed `explorer` field from
  // splitHistoricalTitle on the API side).
  const expeditions = allExpeditions.filter(
    (x) => x.explorer === bio.displayName,
  );
  const entries = allEntries
    .filter((e) => e.explorer === bio.displayName)
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

  const pageUrl = `${SITE_URL}/historical-archive/explorers/${bio.slug}`;

  // Cross-link sidebar: the other 13 explorer hubs, alphabetical.
  const siblings = EXPLORER_BIOS.filter((b) => b.slug !== bio.slug).sort(
    (a, b) => a.displayName.localeCompare(b.displayName),
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(buildJsonLd(bio, expeditions, pageUrl)),
        }}
      />

      {/* Page header card */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        {/* Sub-nav banner */}
        <div className="bg-[#616161] px-3 md:px-6 py-3 flex flex-wrap items-center gap-2 md:gap-3 border-b-2 border-[#202020] dark:border-[#4a4a4a]">
          <span className="text-xs text-[#e5e5e5] font-bold shrink-0 hidden md:inline">
            DISCOVER:
          </span>
          <Link
            href="/explorers"
            className="px-3 md:px-4 py-2 text-xs font-bold shrink-0 bg-[#2a2a2a] text-white hover:scale-105 transition-all"
          >
            EXPLORERS
          </Link>
          <Link
            href="/expeditions"
            className="px-3 md:px-4 py-2 text-xs font-bold shrink-0 bg-[#2a2a2a] text-white hover:scale-105 transition-all"
          >
            EXPEDITIONS
          </Link>
          <Link
            href="/entries"
            className="px-3 md:px-4 py-2 text-xs font-bold shrink-0 bg-[#2a2a2a] text-white hover:scale-105 transition-all"
          >
            ENTRIES
          </Link>
          <Link
            href="/historical-archive"
            className="px-3 md:px-4 py-2 text-xs font-bold shrink-0 bg-[#4676ac] text-white"
          >
            HISTORICAL ARCHIVE
          </Link>
        </div>

        {/* Header content */}
        <div className="p-4 md:p-6">
          <nav
            aria-label="Breadcrumb"
            className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider mb-3"
          >
            <Link href="/" className="hover:text-[#ac6d46]">
              HEIMURSAGA
            </Link>
            <span className="mx-2">›</span>
            <Link href="/historical-archive" className="hover:text-[#ac6d46]">
              HISTORICAL ARCHIVE
            </Link>
            <span className="mx-2">›</span>
            <span>{bio.displayName.toUpperCase()}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 md:gap-6 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-3">
            <h1 className="text-xl md:text-3xl font-bold dark:text-[#e5e5e5] leading-tight">
              {bio.displayName.toUpperCase()}
            </h1>
            <span className="text-[10px] md:text-xs text-[#616161] dark:text-[#b5bcc4] font-mono whitespace-nowrap">
              {expeditions.length}{' '}
              {expeditions.length === 1 ? 'EXPEDITION' : 'EXPEDITIONS'} ·{' '}
              {entries.length} {entries.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
          </div>

          {/* Lifespan + known-for line */}
          {(bio.lifespan || bio.knownFor) && (
            <div className="text-[10px] md:text-xs font-mono text-[#ac6d46] tracking-wider mb-4">
              {bio.lifespan && <span>{bio.lifespan}</span>}
              {bio.lifespan && bio.knownFor && (
                <span className="mx-2 text-[#616161] dark:text-[#b5bcc4]">·</span>
              )}
              {bio.knownFor && <span>{bio.knownFor.toUpperCase()}</span>}
            </div>
          )}

          {/* Bio prose (verbatim from cited source) */}
          <blockquote className="max-w-3xl border-l-4 border-[#ac6d46] pl-4 font-serif text-sm md:text-[15px] leading-relaxed text-[#202020] dark:text-[#e5e5e5]">
            <p>{bio.prose}</p>
            <footer className="mt-3 text-[10px] md:text-xs font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider not-italic">
              SOURCED FROM{' '}
              <a
                href={bio.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ac6d46] hover:underline"
              >
                {citationLabelFor(bio.source).toUpperCase()}
              </a>{' '}
              · {bio.sourceTitle}
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Expeditions */}
      {expeditions.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader
            label="EXPEDITIONS BY THIS EXPLORER"
            count={expeditions.length}
          />
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {expeditions.map((x) => (
              <ExpeditionCard key={x.publicId} x={x} />
            ))}
          </div>
        </section>
      )}

      {/* Chronological entries (decade buckets) */}
      {entries.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader
            label="CHRONOLOGICAL ENTRIES"
            count={entries.length}
          />
          <div>
            {bucketByDecade(entries).map(({ decade, entries: list }) => (
              <div key={decade}>
                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 md:px-6 py-2 border-b border-[#b5bcc4] dark:border-[#3a3a3a] flex items-baseline justify-between gap-3">
                  <h3 className="text-xs md:text-sm font-bold tracking-[0.14em] text-[#202020] dark:text-[#e5e5e5]">
                    {decade}s
                  </h3>
                  <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider whitespace-nowrap">
                    {list.length} {list.length === 1 ? 'ENTRY' : 'ENTRIES'}
                  </span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2">
                  {list.map((e, i) => (
                    <li
                      key={e.publicId}
                      className={`border-b border-[#b5bcc4] dark:border-[#3a3a3a] ${
                        i % 2 === 0 && i < list.length - 1
                          ? 'md:border-r md:border-r-[#b5bcc4] md:dark:border-r-[#3a3a3a]'
                          : ''
                      }`}
                    >
                      <EntryTimelineRow e={e} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cross-links to other explorers */}
      {siblings.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader label="OTHER EXPLORERS IN THE ARCHIVE" />
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-1">
            {siblings.map((s) => (
              <Link
                key={s.slug}
                href={`/historical-archive/explorers/${s.slug}`}
                className="flex items-baseline justify-between gap-3 border-b border-[#b5bcc4] dark:border-[#3a3a3a] py-2 hover:text-[#ac6d46] focus-visible:outline-none focus-visible:text-[#ac6d46]"
              >
                <span className="font-serif text-sm text-[#202020] dark:text-[#e5e5e5] truncate">
                  {s.displayName}
                </span>
                {s.lifespan && (
                  <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider whitespace-nowrap shrink-0">
                    {s.lifespan}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="text-center">
        <Link
          href="/historical-archive"
          className="inline-block px-4 py-2 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] text-xs font-bold tracking-[0.14em] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#ac6d46] dark:hover:bg-[#ac6d46] hover:text-white hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors"
        >
          ← BACK TO HISTORICAL ARCHIVE
        </Link>
      </div>
    </div>
  );
}
