import type { Metadata } from 'next';
import Link from 'next/link';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { getHistoricalArchive } from '@/lib/server-api';
import { jsonLdScript } from '@/lib/seo-jsonld';
import type {
  IHistoricalArchiveEntry,
  IHistoricalArchiveExpedition,
} from '@repo/types';
import {
  ERAS,
  REGIONS,
  eraForYear,
  expeditionYear,
  explorerSlug,
  regionForEntry,
  regionForExpedition,
} from './buckets';

const SITE_URL = 'https://heimursaga.com';
const PAGE_URL = `${SITE_URL}/historical-archive`;

export const revalidate = 600; // refresh every 10 minutes so new historical entries surface quickly

const META_TITLE = 'Historical Expedition Journals — Heimursaga';
const META_DESCRIPTION =
  'First-person dispatches from explorers across the Age of Romantic Exploration, the Victorian era, and the Heroic Age — drawn from public-domain texts, dated, geotagged, and presented unedited.';

export async function generateMetadata(): Promise<Metadata> {
  // Pull the first expedition with a cover image and use it as the social
  // share thumbnail. `getHistoricalArchive` is fetch-cached so this doesn't
  // double-fetch with the page render.
  const data = await getHistoricalArchive();
  const cover = data?.expeditions.find((x) => x.coverImage)?.coverImage;
  const images = cover ? [cover] : undefined;
  return {
    title: META_TITLE,
    description: META_DESCRIPTION,
    alternates: { canonical: PAGE_URL },
    openGraph: {
      type: 'website',
      url: PAGE_URL,
      title: META_TITLE,
      description: META_DESCRIPTION,
      images,
    },
    twitter: {
      card: cover ? 'summary_large_image' : 'summary',
      title: META_TITLE,
      description: META_DESCRIPTION,
      images,
    },
  };
}

function formatDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
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
        <div className="text-[10px] font-mono font-bold text-[#ac6d46] tracking-wider mb-1">
          {x.explorer.toUpperCase() || 'EXPLORER'}
        </div>
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
        <div className="flex items-baseline gap-2 mb-1">
          {dateIso ? (
            <time
              dateTime={dateIso}
              className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider shrink-0"
            >
              {dateLabel?.toUpperCase()}
            </time>
          ) : (
            <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider shrink-0">
              {dateLabel?.toUpperCase()}
            </span>
          )}
          {e.explorer && (
            <span className="text-[10px] font-mono font-bold text-[#ac6d46] tracking-wider truncate">
              · {e.explorer.toUpperCase()}
            </span>
          )}
        </div>
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
  expeditions: IHistoricalArchiveExpedition[],
): object {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${PAGE_URL}#page`,
        url: PAGE_URL,
        name: 'Historical Expedition Journals',
        description:
          'First-person expedition journals from the Age of Romantic Exploration, the Victorian era, and the Heroic Age of Exploration — sourced from public-domain texts.',
        inLanguage: 'en',
        license: 'https://creativecommons.org/publicdomain/mark/1.0/',
      },
      {
        '@type': 'ItemList',
        '@id': `${PAGE_URL}#expeditions`,
        name: 'Expedition journals',
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
            item: PAGE_URL,
          },
        ],
      },
    ],
  };
}

export default async function HistoricalArchivePage() {
  const data = await getHistoricalArchive();
  const expeditions = data?.expeditions || [];
  const entries = data?.entries || [];

  // Featured: first 6 expeditions with cover images (fall back to first 6).
  const withCovers = expeditions.filter((x) => x.coverImage);
  const featured = (withCovers.length >= 6 ? withCovers : expeditions).slice(0, 6);

  // By explorer — group, sort alphabetically.
  const byExplorer = new Map<string, number>();
  for (const e of entries) {
    const name = e.explorer || 'Unknown';
    byExplorer.set(name, (byExplorer.get(name) || 0) + 1);
  }
  const explorerList = [...byExplorer.entries()]
    .filter(([name]) => name && name !== 'Unknown')
    .sort((a, b) => a[0].localeCompare(b[0]));

  // By era — group expeditions.
  const eraGroups = ERAS.map((era) => ({
    era,
    expeditions: expeditions.filter((x) => {
      const year = expeditionYear(x);
      return year != null && eraForYear(year) === era.id;
    }),
  })).filter((g) => g.expeditions.length > 0);

  // By region — group expeditions.
  const regionGroups = REGIONS.map((region) => ({
    region,
    expeditions: expeditions.filter(
      (x) => regionForExpedition(x, entries) === region.id,
    ),
  })).filter((g) => g.expeditions.length > 0);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(buildJsonLd(expeditions)) }}
      />

      {/* Page Header */}
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
          <nav className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider mb-3">
            <Link href="/" className="hover:text-[#ac6d46]">
              HEIMURSAGA
            </Link>
            <span className="mx-2">›</span>
            <span>HISTORICAL ARCHIVE</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 md:gap-6 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-3">
            <h1 className="text-xl md:text-3xl font-bold dark:text-[#e5e5e5] leading-tight">
              HISTORICAL EXPEDITION JOURNALS
            </h1>
            <span className="text-[10px] md:text-xs text-[#616161] dark:text-[#b5bcc4] font-mono whitespace-nowrap">
              {expeditions.length} EXPEDITIONS · {entries.length} ENTRIES
            </span>
          </div>
          <div className="prose-none max-w-3xl space-y-3 font-serif text-sm md:text-[15px] leading-relaxed text-[#202020] dark:text-[#e5e5e5]">
            <p>
              First-hand accounts from explorers of the Romantic, Victorian,
              and Heroic ages, preserved as originally written. Dates,
              coordinates, and the original prose are presented without
              alteration. Sources are public domain: Project Gutenberg,
              Wikisource, and the original expedition volumes.
            </p>
            <p>
              No paraphrasing, no summaries, no AI-generated prose.
              Translations and transcriptions of handwritten logs are
              identified as such on the entry.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Expeditions */}
      {featured.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader label="FEATURED EXPEDITIONS" count={featured.length} />
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {featured.map((x) => (
              <ExpeditionCard key={x.publicId} x={x} />
            ))}
          </div>
        </section>
      )}

      {/* By Explorer */}
      {explorerList.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader label="BY EXPLORER" count={explorerList.length} />
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-1">
            {explorerList.map(([name, count]) => (
              <Link
                key={name}
                href={`/historical-archive/explorers/${explorerSlug(name)}`}
                className="flex items-baseline justify-between gap-3 border-b border-[#b5bcc4] dark:border-[#3a3a3a] py-2 hover:text-[#ac6d46] focus-visible:outline-none focus-visible:text-[#ac6d46]"
              >
                <span className="font-serif text-sm text-[#202020] dark:text-[#e5e5e5] truncate group-hover:text-[#ac6d46]">
                  {name}
                </span>
                <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider whitespace-nowrap shrink-0">
                  {count} {count === 1 ? 'ENTRY' : 'ENTRIES'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* By Era */}
      {eraGroups.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader label="BY ERA" />
          <div className="p-4 md:p-6 space-y-6">
            {eraGroups.map(({ era, expeditions: list }) => (
              <div key={era.id}>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-3 border-b-2 border-[#202020] dark:border-[#616161] pb-2 mb-3">
                  <h3 className="text-sm md:text-base font-bold dark:text-[#e5e5e5]">
                    {era.label}
                  </h3>
                  <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider whitespace-nowrap">
                    {era.from}–{era.to} · {list.length}{' '}
                    {list.length === 1 ? 'EXPEDITION' : 'EXPEDITIONS'}
                  </span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                  {list.map((x) => (
                    <li key={x.publicId}>
                      <Link
                        href={expeditionHref(x)}
                        className="block py-1 hover:text-[#ac6d46] focus-visible:outline-none focus-visible:text-[#ac6d46] group"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider w-14 md:w-16 shrink-0">
                            {formatYearRange(x.startDate, x.endDate)}
                          </span>
                          <span className="font-serif text-sm text-[#202020] dark:text-[#e5e5e5] group-hover:text-[#ac6d46] leading-snug">
                            {x.explorer && (
                              <span className="text-[#ac6d46] font-bold">
                                {x.explorer}
                                {' — '}
                              </span>
                            )}
                            {x.cleanTitle}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* By Region */}
      {regionGroups.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader label="BY REGION" />
          <div className="p-4 md:p-6 space-y-6">
            {regionGroups.map(({ region, expeditions: list }) => (
              <div key={region.id}>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-3 border-b-2 border-[#202020] dark:border-[#616161] pb-2 mb-3">
                  <h3 className="text-sm md:text-base font-bold dark:text-[#e5e5e5]">
                    {region.label}
                  </h3>
                  <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider whitespace-nowrap">
                    {list.length} {list.length === 1 ? 'EXPEDITION' : 'EXPEDITIONS'}
                  </span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
                  {list.map((x) => (
                    <li key={x.publicId}>
                      <Link
                        href={expeditionHref(x)}
                        className="block py-1 hover:text-[#ac6d46] focus-visible:outline-none focus-visible:text-[#ac6d46] group"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider w-14 md:w-16 shrink-0">
                            {formatYearRange(x.startDate, x.endDate)}
                          </span>
                          <span className="font-serif text-sm text-[#202020] dark:text-[#e5e5e5] group-hover:text-[#ac6d46] leading-snug">
                            {x.explorer && (
                              <span className="text-[#ac6d46] font-bold">
                                {x.explorer}
                                {' — '}
                              </span>
                            )}
                            {x.cleanTitle}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chronological Timeline */}
      {entries.length > 0 && (
        <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <SectionHeader label="CHRONOLOGICAL TIMELINE" count={entries.length} />
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
                        // Vertical divider between columns on desktop only.
                        // Apply to every odd-indexed entry except the last
                        // odd one in a list whose total count is odd (it
                        // would orphan the divider into an empty column).
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

      {/* About this archive */}
      <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
        <SectionHeader label="ABOUT THIS ARCHIVE" />
        <div className="p-4 md:p-6 max-w-3xl space-y-3 font-serif text-sm md:text-[15px] leading-relaxed text-[#202020] dark:text-[#e5e5e5]">
          <p>
            Heimursaga curates this archive directly, without paywall or
            registration. Each entry credits its source, typically Project
            Gutenberg, Wikisource, or the original published volume.
          </p>
          <p>
            Coordinates come from the explorer&rsquo;s own descriptions.
            Where the text provides a precise position, the entry uses that
            position unchanged; if only a place name is given, the location
            is geocoded and marked approximate.
          </p>
          <p>
            If you find a transcription error or a misattribution, please{' '}
            <Link href="/contact" className="text-[#ac6d46] hover:underline">
              report it
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
