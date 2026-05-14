'use client';

import {
  MapPin,
  FileText,
  User,
  Bookmark,
  Calendar,
  DollarSign,
  Loader2,
  Star,
} from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { ExplorerAvatar } from '@/app/components/ExplorerAvatar';
import {
  ExplorerStatusBadge,
  type ExplorerStatus,
} from '@/app/components/ExplorerStatusBadge';
import { useAuth } from '@/app/context/AuthContext';
import { formatDate } from '@/app/utils/dateFormat';
import { formatDuration } from '@/app/utils/formatDuration';

/**
 * V2 redesigns of the FULL production cards rendered on /expeditions,
 * /entries, /explorers (i.e. `ExpeditionCard`, `EntryCard`,
 * `ExplorerCard` — not the lighter Portrait variants).
 *
 * Border vocabulary (historical-archive aesthetic):
 *   - Outer 2px #202020 (light) / #616161 (dark), flips to copper on hover
 *   - Image-to-body boundary: 2px border-t in outer color
 *   - Inside the body: NO internal dividers, everything one block
 *   - Body-to-footer (stats / actions): 1px hairline #b5bcc4 / #3a3a3a
 *
 * Typography:
 *   - Title: text-lg font-serif font-bold leading-tight (was text-lg
 *     font-serif font-bold on entry/expedition, plain font-bold on
 *     explorer — V2 unifies to serif across all three)
 *   - 10px mono uppercase copper #ac6d46 for explorer / type label
 *     (replaces the `bg-[#b5bcc4]` header bar)
 *   - 11px mono for inline icon+text metadata rows
 *   - 9px mono uppercase stat labels in #616161, sm bold values
 *   - Description / excerpt: font-serif leading-relaxed line-clamp
 *
 * Scope notes:
 *   - ExpeditionCardV2 keeps every field the production card renders
 *     EXCEPT the live mapbox preview for blueprints — replaced by the
 *     cover image (`imageUrl`). Everything else (status, mode label,
 *     description, full stats grid, timeline bar, funding stats with
 *     radial progress equivalent, all action buttons) is preserved.
 *   - EntryCardV2 keeps everything: cover-image background tint,
 *     decorative quote, excerpt, title, explorer / expedition links,
 *     location, header date, word count, quick-sponsor chip, type,
 *     view + bookmark actions.
 *   - ExplorerCardV2 keeps everything: account type + status badge,
 *     avatar with accent ring, location row, username, journal name,
 *     tagline, 3-stat grid (Expeditions / Entries / Followers), and
 *     all three action buttons (View Journal/Portfolio, Follow,
 *     Bookmark).
 */

// =================================================================
// EXPEDITION CARD V2
// =================================================================

interface ExpeditionV2Props {
  id: string;
  title: string;
  explorer: string;
  description: string;
  imageUrl: string;
  locationName?: string;
  region?: string;
  startDate: string;
  endDate: string | null;
  journalEntries: number;
  fundingGoal: number;
  fundingCurrent: number;
  fundingPercentage: number;
  backers: number;
  distance?: number;
  status: 'active' | 'completed' | 'planned' | 'cancelled';
  mode?: string;
  isBlueprint?: boolean;
  adoptionsCount?: number;
  averageRating?: number;
  ratingsCount?: number;
  isBookmarked?: boolean;
  isBookmarkLoading?: boolean;
  isFullyFunded?: boolean;
  sponsorshipsEnabled?: boolean;
  /** Production card derives this from explorerIsPro + stripeConnected; pass already-resolved. */
  showSponsorshipSection?: boolean;
  /** Production card derives a textual progress %; pass already-resolved (0-100). */
  timelineProgress?: number;
  totalPlannedDays?: number;
  onViewJournal?: () => void;
  onSupport?: () => void;
  onBookmark?: () => void;
  onViewExplorer?: () => void;
  onAdopt?: () => void;
}

export function ExpeditionCardV2(props: ExpeditionV2Props) {
  const {
    title,
    explorer,
    description,
    imageUrl,
    locationName,
    region,
    startDate,
    endDate,
    journalEntries,
    fundingGoal,
    fundingCurrent,
    fundingPercentage,
    backers,
    distance,
    status,
    mode,
    isBlueprint,
    adoptionsCount = 0,
    averageRating = 0,
    ratingsCount = 0,
    isBookmarked,
    isBookmarkLoading,
    isFullyFunded,
    showSponsorshipSection,
    timelineProgress = 0,
    totalPlannedDays,
    onViewJournal,
    onSupport,
    onBookmark,
    onAdopt,
  } = props;
  const { isAuthenticated } = useAuth();

  const statusColors = {
    active: 'bg-[#ac6d46]',
    completed: 'bg-[#616161]',
    planned: 'bg-[#4676ac]',
    cancelled: 'bg-[#b5bcc4]',
  } as const;
  const statusLabels = {
    active: 'ACTIVE EXPEDITION',
    completed: 'COMPLETED EXPEDITION',
    planned: 'PLANNED EXPEDITION',
    cancelled: 'CANCELLED EXPEDITION',
  } as const;
  const headerLabel = isBlueprint ? 'EXPEDITION BLUEPRINT' : statusLabels[status];
  const headerDot = isBlueprint ? 'bg-[#598636]' : statusColors[status];

  return (
    <div className="group flex flex-col bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors h-full w-full max-w-lg overflow-hidden">
      {/* Hero image with overlaid status chip + location strip */}
      <div className="relative aspect-[16/9] bg-[#e8e8e8] dark:bg-[#2a2a2a] overflow-hidden">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute top-0 left-0 bg-[#202020]/85 text-white px-3 py-1 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 ${headerDot}`} />
          {headerLabel}
        </div>
        {mode && (
          <div
            className="absolute top-0 right-0 bg-[#202020]/85 text-white px-3 py-1 text-[10px] font-mono font-bold tracking-wider"
            style={{ color: isBlueprint ? '#598636' : '#ac6d46' }}
          >
            {mode.toUpperCase()}
          </div>
        )}
        {(locationName || region) && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#202020]/85 px-4 py-2 text-white">
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="line-clamp-1">{locationName || region}</span>
            </div>
          </div>
        )}
      </div>

      {/* Body (single block, no internal dividers) */}
      <div className="px-5 pt-4 pb-3 border-t-2 border-[#202020] dark:border-[#616161]">
        <div className="text-[10px] font-mono font-bold text-[#ac6d46] tracking-wider mb-1.5 truncate flex items-center gap-1.5">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {(isBlueprint ? 'GUIDE · ' : 'EXPLORER · ') + explorer.toUpperCase()}
          </span>
        </div>
        <h3 className="text-base font-serif font-bold leading-tight text-[#202020] dark:text-[#e5e5e5] mb-2 line-clamp-2 group-hover:text-[#ac6d46]">
          {title}
        </h3>
        <p className="text-xs font-serif text-[#616161] dark:text-[#b5bcc4] leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>

      {/* Key stats grid — preserved 2x2 layout, restyled */}
      <div className="px-5 pb-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs">
        {isBlueprint ? (
          <>
            <StatFullV2
              label="Rating"
              value={
                ratingsCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-[#ac6d46] text-[#ac6d46]" />
                    {averageRating.toFixed(1)}
                    <span className="font-normal text-[#616161] dark:text-[#b5bcc4]">
                      ({ratingsCount})
                    </span>
                  </span>
                ) : (
                  <span className="text-[#b5bcc4] dark:text-[#616161]">No reviews</span>
                )
              }
            />
            <StatFullV2 label="Launches" value={adoptionsCount.toString()} />
            <StatFullV2
              label="Distance"
              value={`${Math.round(distance || 0).toLocaleString()} km`}
            />
          </>
        ) : (
          <>
            <StatFullV2
              label={status === 'completed' ? 'Duration' : 'Day'}
              value={
                totalPlannedDays
                  ? totalPlannedDays.toString()
                  : '—'
              }
            />
            <StatFullV2
              label="Distance"
              value={`${Math.round(distance || 0).toLocaleString()} km`}
            />
            <StatFullV2 label="Journal Entries" value={journalEntries.toString()} />
            {showSponsorshipSection && (
              <StatFullV2 label="Sponsors" value={backers.toString()} />
            )}
          </>
        )}
      </div>

      {/* Timeline progress (non-blueprint only) */}
      {!isBlueprint && (
        <div className="px-5 pb-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
          <div className="flex items-center justify-between mb-2 text-[10px] font-mono tracking-wider">
            <span className="text-[#616161] dark:text-[#b5bcc4]">
              {status === 'completed' ? 'EXPEDITION COMPLETE' : 'TIMELINE'}
            </span>
            <span className="text-[#4676ac] font-bold">
              {Math.round(timelineProgress)}%
            </span>
          </div>
          <div className="h-1.5 bg-[#b5bcc4] dark:bg-[#3a3a3a] mb-2 overflow-hidden">
            <div
              className="h-full bg-[#4676ac]"
              style={{ width: `${Math.min(100, Math.max(0, timelineProgress))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#616161] dark:text-[#b5bcc4]">
              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">
                {startDate ? formatDate(startDate) || startDate : 'TBD'}
              </span>{' '}
              –{' '}
              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">
                {endDate ? formatDate(endDate) || endDate : 'Ongoing'}
              </span>
            </span>
            {totalPlannedDays && (
              <span className="text-[#616161] dark:text-[#b5bcc4]">
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">
                  {totalPlannedDays}d
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Funding status — preserved 4-stat grid + percent (no radial here;
          the radial is a small chart in production. V2 renders a clean
          large percent inline + 4 stats. Functionality unchanged.) */}
      {!isBlueprint && showSponsorshipSection && (
        <div className="px-5 pb-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] flex items-start gap-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs flex-1">
            <StatFullV2 label="Raised" value={`$${(fundingCurrent || 0).toLocaleString()}`} />
            <StatFullV2
              label="Goal"
              value={fundingGoal ? `$${fundingGoal.toLocaleString()}` : 'None'}
            />
            <StatFullV2 label="Sponsors" value={backers.toString()} />
            <StatFullV2
              label="Remaining"
              value={`$${Math.max(0, (fundingGoal || 0) - (fundingCurrent || 0)).toLocaleString()}`}
            />
          </div>
          <div className="flex flex-col items-center justify-center min-w-[60px]">
            <div
              className={`text-lg font-bold font-mono ${
                isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#ac6d46]'
              }`}
            >
              {(fundingPercentage || 0).toFixed(0)}%
            </div>
            <div className="text-[9px] tracking-[0.14em] font-mono text-[#616161] dark:text-[#b5bcc4] uppercase">
              Funded
            </div>
          </div>
        </div>
      )}
      {!isBlueprint && !showSponsorshipSection && (
        <div className="px-5 pb-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] text-[11px] font-mono text-[#616161] dark:text-[#b5bcc4]">
          Self-funded expedition. Explorer is not accepting sponsorships for this journey.
        </div>
      )}
      {isBlueprint && (
        <div className="px-5 pb-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] text-[11px] font-mono text-[#616161] dark:text-[#b5bcc4] flex-1">
          Pre-planned expedition route. Launch your own expedition from this
          blueprint with a proven route.
        </div>
      )}

      {/* Actions footer */}
      <div className="mt-auto px-5 py-3 border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] flex items-center gap-2">
        {isBlueprint ? (
          <button
            onClick={onAdopt}
            className="flex-1 px-4 py-2 text-xs font-bold bg-[#598636] text-white hover:bg-[#476b2b] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#598636]"
          >
            LAUNCH EXPEDITION
          </button>
        ) : (
          <>
            <button
              onClick={onViewJournal}
              className="flex-1 px-4 py-2 text-xs font-bold bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
            >
              VIEW JOURNAL
            </button>
            {showSponsorshipSection && (
              <button
                onClick={onSupport}
                className="flex-1 px-4 py-2 text-xs font-bold bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                SPONSOR
              </button>
            )}
          </>
        )}
        {isAuthenticated && (
          <button
            onClick={onBookmark}
            disabled={isBookmarkLoading}
            className={`px-3 py-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
              isBookmarked
                ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
            }`}
          >
            {isBookmarkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// =================================================================
// ENTRY CARD V2
// =================================================================

interface EntryV2Props {
  id: string;
  title: string;
  explorerUsername: string;
  expeditionName: string;
  location: string;
  date: string;
  excerpt: string;
  mediaCount: number;
  views: number;
  wordCount: number;
  type: string;
  coverImageUrl?: string;
  quickSponsorsCount?: number;
  isBookmarked?: boolean;
  isBookmarkLoading?: boolean;
  onReadEntry?: () => void;
  onViewExpedition?: () => void;
  onBookmark?: () => void;
  onViewExplorer?: () => void;
}

export function EntryCardV2({
  title,
  explorerUsername,
  expeditionName,
  location,
  date,
  excerpt,
  wordCount,
  type,
  coverImageUrl,
  quickSponsorsCount = 0,
  isBookmarked,
  isBookmarkLoading,
  onReadEntry,
  onViewExpedition,
  onBookmark,
  onViewExplorer,
}: EntryV2Props) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="group flex flex-col bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors h-full w-full max-w-lg overflow-hidden">
      {/* Excerpt block with optional cover image background tint */}
      <div className="relative flex-grow">
        {coverImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        )}
        <div
          className={`absolute inset-0 ${
            coverImageUrl
              ? 'bg-[#f8f7f5]/85 dark:bg-[#1a1a1a]/85'
              : 'bg-[#f8f7f5] dark:bg-[#1a1a1a]'
          }`}
        />
        <div className="relative px-6 pt-5 pb-6">
          {/* Type + Date inline caption */}
          <div className="flex items-baseline gap-2 mb-3 text-[10px] font-mono tracking-wider">
            <span className="h-1.5 w-1.5 bg-[#4676ac] inline-block self-center" />
            <span className="text-[#4676ac] font-bold">JOURNAL ENTRY</span>
            <span className="text-[#b5bcc4]">·</span>
            <span className="text-[#616161] dark:text-[#b5bcc4]">
              <Calendar className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              {formatDate(date) || date}
            </span>
          </div>

          {/* Decorative quote + excerpt */}
          <div className="relative">
            <div
              className="absolute top-0 -left-1 text-5xl font-serif text-[#4676ac]/20 dark:text-[#4676ac]/30 leading-none select-none"
              aria-hidden="true"
            >
              “
            </div>
            <p
              className="relative pt-3 pl-4 text-sm font-serif italic text-[#202020] dark:text-[#e5e5e5] leading-relaxed min-h-[4rem]"
              style={{ lineHeight: 1.7 }}
            >
              {excerpt}
            </p>
          </div>
        </div>
      </div>

      {/* Title + attribution body */}
      <div className="px-5 pt-4 pb-3 border-t-2 border-[#202020] dark:border-[#616161]">
        <h3 className="text-base font-serif font-bold text-[#202020] dark:text-[#e5e5e5] leading-snug mb-2 line-clamp-2 group-hover:text-[#ac6d46]">
          {title}
        </h3>
        <div className="space-y-1 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 shrink-0 text-[#616161] dark:text-[#b5bcc4]" />
            <span className="text-[#616161] dark:text-[#b5bcc4]">by</span>
            <button
              onClick={onViewExplorer}
              className="text-[#ac6d46] hover:text-[#4676ac] transition-colors focus-visible:outline-none focus-visible:underline truncate"
            >
              {explorerUsername}
            </button>
          </div>
          {expeditionName && (
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 shrink-0 text-[#616161] dark:text-[#b5bcc4]" />
              <button
                onClick={onViewExpedition}
                className="text-[#4676ac] hover:text-[#ac6d46] transition-colors focus-visible:outline-none focus-visible:underline truncate"
              >
                {expeditionName}
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Meta info footer (word count, type, quick sponsors) */}
      <div className="px-5 pb-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] flex items-center justify-between text-[10px] font-mono tracking-wider">
        <span className="text-[#616161] dark:text-[#b5bcc4]">
          <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">
            {wordCount.toLocaleString()}
          </span>{' '}
          WORDS
        </span>
        <div className="flex items-center gap-3">
          {quickSponsorsCount > 0 && (
            <span className="flex items-center gap-1 text-[#ac6d46]">
              <DollarSign className="w-3 h-3" />
              <span className="font-bold">{quickSponsorsCount}</span>
            </span>
          )}
          <span className="text-[#616161] dark:text-[#b5bcc4]">
            {type.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] flex items-center gap-2">
        <button
          onClick={onReadEntry}
          className="flex-1 px-4 py-2 text-xs font-bold bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
        >
          VIEW ENTRY
        </button>
        {isAuthenticated && (
          <button
            onClick={onBookmark}
            disabled={isBookmarkLoading}
            className={`px-3 py-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
              isBookmarked
                ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
            }`}
          >
            {isBookmarkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// =================================================================
// EXPLORER CARD V2
// =================================================================

interface ExplorerV2Props {
  id: string;
  username: string;
  journalName: string;
  imageUrl?: string;
  location: string;
  accountType: 'explorer' | 'explorer-pro' | 'expedition-guide';
  activeExpeditions: number;
  totalEntries: number;
  followers: number;
  tagline: string;
  explorerStatus?: ExplorerStatus;
  isFollowing?: boolean;
  isBookmarked?: boolean;
  isFollowLoading?: boolean;
  isBookmarkLoading?: boolean;
  onViewJournal?: () => void;
  onFollow?: () => void;
  onBookmark?: () => void;
}

export function ExplorerCardV2({
  username,
  journalName,
  imageUrl,
  location,
  accountType,
  activeExpeditions,
  totalEntries,
  followers,
  tagline,
  explorerStatus,
  isFollowing,
  isBookmarked,
  isFollowLoading,
  isBookmarkLoading,
  onViewJournal,
  onFollow,
  onBookmark,
}: ExplorerV2Props) {
  const { isAuthenticated } = useAuth();

  const accentColor =
    accountType === 'expedition-guide'
      ? '#598636'
      : accountType === 'explorer-pro'
        ? '#ac6d46'
        : '#616161';
  const accountLabel =
    accountType === 'expedition-guide'
      ? 'EXPEDITION GUIDE'
      : accountType === 'explorer-pro'
        ? 'EXPLORER PRO'
        : 'EXPLORER';

  return (
    <div className="group flex flex-col bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors h-full w-full max-w-lg">
      {/* Body (single block — account type caption, avatar, name, journal, tagline, all together) */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider">
            <span
              className="h-1.5 w-1.5 inline-block"
              style={{ background: accentColor }}
            />
            <span className="font-bold" style={{ color: accentColor }}>
              {accountLabel}
            </span>
          </div>
          {explorerStatus &&
            !(accountType === 'expedition-guide' && explorerStatus === 'RESTING') && (
              <ExplorerStatusBadge
                status={explorerStatus}
                size="sm"
                showIcon={false}
              />
            )}
        </div>

        {/* Avatar + location */}
        <div className="flex flex-col items-center mb-3">
          <div
            className="w-32 h-32 border-4 overflow-hidden bg-[#b5bcc4] mb-3"
            style={{ borderColor: accentColor }}
          >
            <ExplorerAvatar
              username={username}
              src={imageUrl}
              size={128}
              className="w-full h-full"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#616161] dark:text-[#b5bcc4] max-w-full">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        {/* Username + duplicated account-type pill (preserved from current card) */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="text-base md:text-lg font-serif font-bold text-[#202020] dark:text-[#e5e5e5] group-hover:text-[#ac6d46] leading-snug">
            {username}
          </h3>
          {(accountType === 'expedition-guide' ||
            accountType === 'explorer-pro') && (
            <span
              className="px-2 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap tracking-wider"
              style={{ background: accentColor }}
            >
              {accountLabel}
            </span>
          )}
        </div>

        <p className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-2 truncate">
          {journalName}
        </p>

        <p className="text-xs font-serif text-[#616161] dark:text-[#b5bcc4] leading-relaxed line-clamp-3">
          {tagline}
        </p>
      </div>

      {/* 3-stat footer */}
      <div className="px-5 pb-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] grid grid-cols-3 gap-x-4 font-mono text-xs">
        <StatFullV2
          label="Expeditions"
          value={activeExpeditions.toString()}
          accent="copper"
        />
        <StatFullV2 label="Entries" value={totalEntries.toString()} />
        <StatFullV2 label="Followers" value={followers.toLocaleString()} />
      </div>

      {/* Actions */}
      <div className="mt-auto px-5 py-3 border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] flex items-center gap-2">
        <button
          onClick={onViewJournal}
          className="flex-1 px-4 py-2 text-xs font-bold bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
        >
          {accountType === 'expedition-guide' ? 'VIEW PORTFOLIO' : 'VIEW JOURNAL'}
        </button>
        {isAuthenticated && (
          <button
            onClick={onFollow}
            disabled={isFollowLoading}
            className={`flex-1 px-4 py-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
              isFollowing
                ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              {isFollowLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isFollowing ? 'FOLLOWING' : 'FOLLOW'}</span>
            </div>
          </button>
        )}
        {isAuthenticated && (
          <button
            onClick={onBookmark}
            disabled={isBookmarkLoading}
            className={`px-3 py-2 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
              isBookmarked
                ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
            }`}
          >
            {isBookmarkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// =================================================================
// Shared stat cell
// =================================================================

function StatFullV2({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: 'copper' | 'blue';
}) {
  const valueColor =
    accent === 'copper'
      ? 'text-[#ac6d46]'
      : accent === 'blue'
        ? 'text-[#4676ac]'
        : 'text-[#202020] dark:text-[#e5e5e5]';
  return (
    <div>
      <div className="text-[9px] tracking-[0.14em] text-[#616161] dark:text-[#b5bcc4] uppercase mb-0.5 font-mono">
        {label}
      </div>
      <div className={`text-sm font-bold font-mono ${valueColor}`}>{value}</div>
    </div>
  );
}
