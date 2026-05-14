'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ExpeditionCard } from '@/app/components/ExpeditionCard';
import { EntryCard } from '@/app/components/EntryCard';
import { ExplorerCard } from '@/app/components/ExplorerCard';
import {
  ExpeditionCardV2,
  EntryCardV2,
  ExplorerCardV2,
} from '@/app/components/preview/CardFullV2';
import {
  ReferenceExpeditionCard,
  ReferenceEntryCard,
  ReferenceExplorerCard,
} from '@/app/components/preview/HistoricalReferenceCards';

/**
 * Internal-only card preview page. Admin-gated, excluded from robots.
 *
 * A/B comparison between the actual production card components used on
 * /expeditions, /entries, /explorers (left column) and a V2 redesign
 * in the historical-archive aesthetic (right column) — same data shape
 * passed to both.
 *
 * V2 scope notes:
 *   - Every field rendered by the production card is rendered in V2.
 *   - Production ExpeditionCard renders a live Mapbox preview for
 *     blueprints; V2 uses the cover image (`imageUrl`) instead. All
 *     other expedition fields (status, mode, description, full stats
 *     grid, timeline bar, funding stats + percent, action buttons) are
 *     preserved.
 *   - Production radial-progress chart on the funding section is
 *     replaced by a large inline percent (saves the chart component
 *     dependency while keeping the same visual signal).
 */
export default function CardsPreviewPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user?.admin) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center">
        <div className="text-sm font-mono text-[#616161] dark:text-[#b5bcc4]">
          LOADING…
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !user?.admin) return null;

  // Sample data used identically for both columns. Avatar URLs are
  // intentionally omitted on explorer cards — Unsplash is not in
  // `next.config.ts` remotePatterns, so passing one would throw inside
  // next/image (ExplorerAvatar). The avatar falls back to a colored-
  // initial tile, which is fine for visual preview.
  const expeditionUnsplash =
    'https://images.unsplash.com/photo-1662454456011-24874d23c389?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
  const expeditionUnsplash2 =
    'https://images.unsplash.com/photo-1562743227-dbfb8875c61b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

  const expeditionShared = {
    id: 'exp-1',
    title: 'Cycling the Silk Road',
    explorer: 'sarah_wanderer',
    description:
      'A six-month cycling expedition documenting the historic Silk Road trade routes through Central Asia, exploring ancient cities, mountain passes, and cultural heritage sites.',
    imageUrl: expeditionUnsplash,
    locationName: 'Samarkand, Uzbekistan',
    region: 'Central Asia',
    startDate: '2026-01-15',
    endDate: '2026-07-15',
    journalEntries: 89,
    fundingGoal: 45000,
    fundingCurrent: 38750,
    fundingPercentage: 86.1,
    backers: 127,
    distance: 8420,
    status: 'active' as const,
    terrain: 'Mountain Passes',
    averageSpeed: 57.3,
    sponsorshipsEnabled: true,
    explorerIsPro: true,
    stripeConnected: true,
    mode: 'cycle',
  };
  const expeditionV2Shared = {
    ...expeditionShared,
    showSponsorshipSection: true,
    timelineProgress: 62,
    totalPlannedDays: 182,
  };

  const expeditionPlanned = {
    id: 'exp-2',
    title: 'Antarctic Research Mission',
    explorer: 'marcus_explorer',
    description:
      'Conducting climate research and wildlife population studies at the McMurdo Dry Valleys, collecting ice core samples and documenting penguin colonies.',
    imageUrl: expeditionUnsplash2,
    locationName: 'McMurdo Dry Valleys',
    region: 'Antarctic Region',
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    journalEntries: 0,
    fundingGoal: 0,
    fundingCurrent: 0,
    fundingPercentage: 0,
    backers: 0,
    distance: 2140,
    status: 'planned' as const,
    terrain: 'Polar Ice',
    averageSpeed: 0,
    sponsorshipsEnabled: false,
    explorerIsPro: false,
    stripeConnected: false,
    mode: 'sail',
  };
  const expeditionPlannedV2 = {
    ...expeditionPlanned,
    showSponsorshipSection: false,
    timelineProgress: 0,
    totalPlannedDays: 120,
  };

  const entryShared = {
    id: 'entry-1',
    title: 'Summit Day on Kilimanjaro',
    explorerUsername: 'alex_mountain',
    expeditionName: 'Climbing Kilimanjaro 2025',
    location: 'Mount Kilimanjaro, Tanzania',
    date: 'Jan 12, 2025',
    excerpt:
      'After 6 days of climbing, we finally reached Uhuru Peak at 5,895m. The sunrise from the summit was absolutely breathtaking, with clouds rolling beneath us like an ocean. Every step was worth it.',
    mediaCount: 28,
    views: 1547,
    wordCount: 2341,
    type: 'Summit Reflection',
    coverImageUrl: expeditionUnsplash,
    quickSponsorsCount: 12,
  };
  const entryStorm = {
    id: 'entry-2',
    title: 'Crossing the Atlantic Storm',
    explorerUsername: 'jordan_rows',
    expeditionName: 'Solo Atlantic Rowing',
    location: 'Mid-Atlantic Ocean',
    date: 'Dec 3, 2024',
    excerpt:
      "Day 47 brought the most intense storm I've faced. 6-meter waves crashed over the boat continuously. I couldn't sleep for 36 hours straight, but I kept rowing. This is what I trained for.",
    mediaCount: 12,
    views: 3421,
    wordCount: 1876,
    type: 'Weather Update',
    quickSponsorsCount: 0,
  };

  const explorerPro = {
    id: 'explorer-1',
    username: 'sarah_wanderer',
    journalName: 'Wandering Chronicles',
    imageUrl: '', // empty so ExplorerAvatar falls back to colored initial
    location: 'Central Asia',
    accountType: 'explorer-pro' as const,
    joined: 'Mar 2024',
    activeExpeditions: 2,
    totalEntries: 234,
    totalSponsored: 47820,
    followers: 1247,
    tagline:
      'Documentary photographer exploring traditional cultures along historic trade routes',
  };
  const explorerGuide = {
    id: 'explorer-2',
    username: 'marcus_explorer',
    journalName: 'Field Notes from the Edge',
    imageUrl: '',
    location: 'Antarctic Region',
    accountType: 'expedition-guide' as const,
    joined: 'Jan 2023',
    activeExpeditions: 1,
    totalEntries: 156,
    totalSponsored: 89450,
    followers: 2341,
    tagline:
      'Climate researcher studying ice core samples and environmental change in polar regions',
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#2a2a2a] py-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 border-l-4 border-[#ac6d46] pl-4">
          <h1 className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            CARD REDESIGN PREVIEW
          </h1>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
            Left: production card used on /expeditions, /entries, /explorers.
            Right: V2 redesign in the historical-archive aesthetic. Same data,
            same width.
          </p>
        </div>

        {/* Reference: historical-archive cards at the top so the target
            aesthetic is visible without scrolling between A/B rows. */}
        <section className="mb-12">
          <h2 className="text-base md:text-lg font-bold text-[#ac6d46] mb-2 border-b-2 border-[#ac6d46] pb-2">
            REFERENCE — HISTORICAL-ARCHIVE AESTHETIC
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-6">
            Live cards from /historical-archive. V2 below applies this same
            visual language (typography, color, border weight, footer
            divider) to the production cards.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <ReferenceExpeditionCard
              title="The Endurance Expedition"
              explorer="Ernest Shackleton"
              years="1914–1917"
              description="Shackleton's Imperial Trans-Antarctic Expedition aimed to cross the Antarctic continent. After the Endurance was crushed in pack ice, the crew survived 22 months on the ice before reaching South Georgia in a small boat."
              imageUrl="https://images.unsplash.com/photo-1562743227-dbfb8875c61b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
              entriesCount={7}
              region="Antarctica"
            />
            <ReferenceEntryCard
              title="Endurance Crushed"
              explorer="Ernest Shackleton"
              date="Oct 27, 1915"
              place="Position of Endurance when abandoned, Weddell Sea pack"
              excerpt="The end of the Endurance has come. Her end was always inevitable, but now it is brought to a stage where we must abandon her."
            />
            <ReferenceExplorerCard
              name="Ernest Shackleton"
              lifespan="1874–1922"
              knownFor="Anglo-Irish Antarctic explorer, principal figure of the Heroic Age of Antarctic Exploration"
              expeditions={1}
              entries={7}
            />
          </div>
        </section>

        {/* Design-delta notes */}
        <div className="mb-10 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] p-4 md:p-6 text-sm text-[#202020] dark:text-[#e5e5e5]">
          <div className="font-bold tracking-[0.14em] text-[10px] md:text-xs mb-3 text-[#ac6d46]">
            V2 CHANGES (DATA UNCHANGED — AESTHETIC ONLY)
          </div>
          <ul className="list-disc ml-5 space-y-1.5 font-mono text-xs md:text-sm leading-relaxed">
            <li>
              <strong>Status bar</strong> moves from a full-width
              <code> bg-[#b5bcc4]</code> header into a corner chip on the hero
              image (with the same dot + label).
            </li>
            <li>
              <strong>Internal section dividers</strong> change from heavy
              <code> border-b-2 border-[#202020]</code> to hairline
              <code> border-t border-[#b5bcc4]</code>. The only 2px structural
              divider inside the card is the image-to-body boundary
              (expedition) and the body-to-actions boundary (all three).
            </li>
            <li>
              <strong>Tinted-background sections</strong> (
              <code>bg-[#f5f5f5]</code>) are removed inside the body — one
              continuous body block, optional hairline separators.
            </li>
            <li>
              <strong>Explorer / type label</strong> becomes a 10px mono
              uppercase copper line above the title (instead of a separate
              attribution row).
            </li>
            <li>
              <strong>Title</strong> stays font-serif font-bold; sizes settle
              at <code>text-lg</code> consistently.
            </li>
            <li>
              <strong>Stat grids</strong> keep the same column counts and
              field set; labels are 9px tracked uppercase mono and values are
              sm bold mono — matching the historical-archive cards.
            </li>
            <li>
              <strong>Hover</strong>: border flips to copper and title turns
              copper across all three cards.
            </li>
            <li>
              <strong>Scope:</strong> ExpeditionCardV2 replaces the live
              Mapbox blueprint preview with the cover image, and renders the
              funding-progress as a large inline percent instead of a radial
              chart. Every other field unchanged.
            </li>
          </ul>
        </div>

        {/* EXPEDITION */}
        <Section label="EXPEDITION CARDS">
          <ABRow
            current={<ExpeditionCard {...expeditionShared} />}
            v2={<ExpeditionCardV2 {...expeditionV2Shared} />}
          />
          <ABRow
            current={<ExpeditionCard {...expeditionPlanned} />}
            v2={<ExpeditionCardV2 {...expeditionPlannedV2} />}
          />
        </Section>

        {/* ENTRY */}
        <Section label="ENTRY CARDS">
          <ABRow
            current={<EntryCard {...entryShared} />}
            v2={<EntryCardV2 {...entryShared} />}
          />
          <ABRow
            current={<EntryCard {...entryStorm} />}
            v2={<EntryCardV2 {...entryStorm} />}
          />
        </Section>

        {/* EXPLORER */}
        <Section label="EXPLORER CARDS">
          <ABRow
            current={<ExplorerCard {...explorerPro} />}
            v2={<ExplorerCardV2 {...explorerPro} />}
          />
          <ABRow
            current={<ExplorerCard {...explorerGuide} />}
            v2={<ExplorerCardV2 {...explorerGuide} />}
          />
        </Section>

        {/* Compare against production */}
        <div className="mt-12 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] p-4 md:p-6 text-sm">
          <div className="font-bold tracking-[0.14em] text-[10px] md:text-xs mb-3 text-[#4676ac]">
            COMPARE AGAINST PRODUCTION SURFACES
          </div>
          <ul className="list-disc ml-5 space-y-1 font-mono text-xs md:text-sm">
            <li>
              <Link
                href="/expeditions"
                className="text-[#4676ac] hover:text-[#ac6d46] hover:underline"
              >
                /expeditions
              </Link>{' '}
              — production ExpeditionCard in-app
            </li>
            <li>
              <Link
                href="/entries"
                className="text-[#4676ac] hover:text-[#ac6d46] hover:underline"
              >
                /entries
              </Link>{' '}
              — production EntryCard in-app
            </li>
            <li>
              <Link
                href="/explorers"
                className="text-[#4676ac] hover:text-[#ac6d46] hover:underline"
              >
                /explorers
              </Link>{' '}
              — production ExplorerCard in-app
            </li>
            <li>
              <Link
                href="/historical-archive"
                className="text-[#4676ac] hover:text-[#ac6d46] hover:underline"
              >
                /historical-archive
              </Link>{' '}
              — the reference aesthetic in production
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-base md:text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        {label}
      </h2>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

function ABRow({
  current,
  v2,
}: {
  current: React.ReactNode;
  v2: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="text-[10px] font-mono font-bold tracking-wider text-[#616161] dark:text-[#b5bcc4] mb-2 uppercase">
          Current (production)
        </div>
        <div className="flex justify-center">{current}</div>
      </div>
      <div>
        <div className="text-[10px] font-mono font-bold tracking-wider text-[#ac6d46] mb-2 uppercase">
          V2 Redesign
        </div>
        <div className="flex justify-center">{v2}</div>
      </div>
    </div>
  );
}
