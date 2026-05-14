'use client';

import { MapPin, FileText, Calendar, User } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { ExplorerAvatar } from '@/app/components/ExplorerAvatar';
import { formatDate, formatDateWithOptionalTime } from '@/app/utils/dateFormat';

/**
 * V2 portrait card variants — historical-archive aesthetic applied
 * while preserving every visual field the current cards show. No data
 * is dropped or compressed; only typography, color, border style, and
 * section composition change.
 *
 * Border vocabulary (matches the historical-archive ExpeditionCard):
 *   - Outer: 2px solid #202020 (light) / #616161 (dark), flips to
 *     #ac6d46 on hover.
 *   - Image-to-body boundary: 2px border-t in the outer color (only
 *     present when the card has an image at the top, i.e. expedition).
 *   - Inside the body: NO internal dividers. Everything is one block
 *     with internal padding.
 *   - Body-to-footer boundary: 1px hairline border-t in #b5bcc4
 *     (light) / #3a3a3a (dark). The only divider used inside the card.
 *
 * Typography:
 *   - Title: text-base font-serif font-bold leading-tight (was
 *     text-sm font-serif font-bold).
 *   - 10px mono uppercase copper #ac6d46 for the explorer / type label
 *     above the title (replaces the bg-[#b5bcc4] header bar).
 *   - 11px mono for inline metadata stack (expedition / location /
 *     date), each with a 12px lucide icon.
 *   - 9px mono uppercase stat labels in #616161, 14px bold stat values.
 *   - Excerpt: text-sm font-serif text-[#202020] leading-relaxed
 *     line-clamp-3.
 *
 * What does NOT change vs current:
 *   - Every data field rendered by the current card is rendered here.
 *   - Status / account-type indicators preserved (just moved into a
 *     corner image chip or a single mono caption line).
 *   - The duplicated EXPLORER PRO / EXPEDITION GUIDE pill on the
 *     explorer card is preserved alongside the top caption.
 *   - The blue Views accent on the entry stats, the copper Funding
 *     accent on the expedition stats, the copper Expeditions accent
 *     on the explorer stats — all preserved.
 */

// =================================================================
// EXPEDITION CARD V2
// =================================================================

interface ExpeditionV2Props {
  title: string;
  explorerUsername: string;
  imageUrl: string;
  location?: string;
  region?: string;
  locationName?: string;
  status: 'active' | 'completed' | 'planned' | 'paused';
  daysElapsed: number;
  journalEntries: number;
  fundingPercentage: number;
  backers: number;
  fundingEnabled?: boolean;
  raised?: number;
  startDate?: string;
  endDate?: string | null;
  onClick?: () => void;
}

export function ExpeditionCardPortraitV2({
  title,
  explorerUsername,
  imageUrl,
  location,
  region,
  locationName,
  status,
  daysElapsed,
  journalEntries,
  fundingPercentage,
  backers,
  fundingEnabled,
  raised,
  startDate,
  endDate,
  onClick,
}: ExpeditionV2Props) {
  const showFundingStats = fundingEnabled && (raised ?? 0) > 0;
  const currentLocation = locationName || location || region || '';

  const statusColors = {
    active: 'bg-[#ac6d46]',
    completed: 'bg-[#616161]',
    planned: 'bg-[#4676ac]',
    paused: 'bg-[#b5bcc4]',
  } as const;
  const statusLabels = {
    active: 'ACTIVE EXPEDITION',
    completed: 'COMPLETED EXPEDITION',
    planned: 'PLANNED EXPEDITION',
    paused: 'PAUSED EXPEDITION',
  } as const;

  return (
    <div
      onClick={onClick}
      className="group block bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors cursor-pointer active:scale-[0.98]"
    >
      {/* Image with corner status chip */}
      <div className="relative aspect-[16/10] bg-[#e8e8e8] dark:bg-[#2a2a2a] overflow-hidden">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute top-0 left-0 bg-[#202020]/85 text-white px-3 py-1 text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 ${statusColors[status]}`} />
          {statusLabels[status]}
        </div>
      </div>

      {/* Body (everything between image and footer is one block,
          no internal border dividers) */}
      <div className="px-4 pt-4 pb-3 border-t-2 border-[#202020] dark:border-[#616161]">
        <div className="text-[10px] font-mono font-bold text-[#ac6d46] tracking-wider mb-1 truncate flex items-center gap-1.5">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{explorerUsername.toUpperCase()}</span>
        </div>
        <h3 className="text-base font-serif font-bold leading-tight text-[#202020] dark:text-[#e5e5e5] mb-2 line-clamp-2 group-hover:text-[#ac6d46]">
          {title}
        </h3>
        {currentLocation && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{currentLocation}</span>
          </div>
        )}
      </div>

      {/* Footer: 2x2 stats grid, hairline border-t */}
      <StatGridV2 columns={2}>
        <StatV2
          label={status === 'completed' ? 'Duration' : 'Days Elapsed'}
          value={daysElapsed.toString()}
        />
        <StatV2 label="Entries" value={journalEntries.toString()} />
        {showFundingStats ? (
          <>
            <StatV2
              label="Funding"
              value={`${fundingPercentage}%`}
              accent="copper"
            />
            <StatV2 label="Sponsors" value={backers.toString()} />
          </>
        ) : (
          <>
            <StatV2
              label="Start"
              value={startDate ? formatDate(startDate) || startDate : 'TBD'}
            />
            <StatV2
              label="End"
              value={endDate ? formatDate(endDate) || endDate : 'Ongoing'}
            />
          </>
        )}
      </StatGridV2>
    </div>
  );
}

// =================================================================
// ENTRY CARD V2
// =================================================================

interface EntryV2Props {
  title: string;
  explorerUsername: string;
  expeditionName: string;
  location: string;
  date: string;
  excerpt: string;
  views: number;
  wordCount: number;
  mediaCount: number;
  type: string;
  onClick?: () => void;
}

export function EntryCardPortraitV2({
  title,
  explorerUsername,
  expeditionName,
  location,
  date,
  excerpt,
  views,
  wordCount,
  mediaCount,
  type,
  onClick,
}: EntryV2Props) {
  return (
    <div
      onClick={onClick}
      className="group block bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors cursor-pointer active:scale-[0.98] flex flex-col"
    >
      {/* Body (single block, no internal dividers) */}
      <div className="px-4 pt-4 pb-3 flex-grow">
        {/* ENTRY · TYPE caption */}
        <div className="flex items-baseline gap-2 mb-2 text-[10px] font-mono tracking-wider">
          <span className="h-1.5 w-1.5 bg-[#4676ac] inline-block self-center" />
          <span className="text-[#4676ac] font-bold">ENTRY</span>
          <span className="text-[#b5bcc4]">·</span>
          <span className="text-[#616161] dark:text-[#b5bcc4] truncate">
            {type.toUpperCase()}
          </span>
        </div>

        {/* Explorer copper label */}
        <div className="text-[10px] font-mono font-bold text-[#ac6d46] tracking-wider mb-1 truncate flex items-center gap-1.5">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate">{explorerUsername.toUpperCase()}</span>
        </div>

        <h3 className="text-base font-serif font-bold text-[#202020] dark:text-[#e5e5e5] leading-snug mb-2 line-clamp-2 group-hover:text-[#ac6d46]">
          {title}
        </h3>

        {/* Full metadata stack — expedition, location, date */}
        <div className="space-y-1 text-[11px] font-mono mb-3">
          <div className="flex items-center gap-1.5 text-[#4676ac]">
            <FileText className="w-3 h-3 shrink-0" />
            <span className="truncate">{expeditionName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{formatDateWithOptionalTime(date) || date}</span>
          </div>
        </div>

        {/* Excerpt — still inside the body block, no divider */}
        <p className="text-sm font-serif text-[#202020] dark:text-[#e5e5e5] leading-relaxed line-clamp-3">
          {excerpt}
        </p>
      </div>

      {/* Footer: 3-stat grid, hairline border-t */}
      <StatGridV2 columns={3}>
        <StatV2 label="Views" value={views.toLocaleString()} accent="blue" />
        <StatV2 label="Words" value={wordCount.toLocaleString()} />
        <StatV2 label="Media" value={mediaCount.toString()} />
      </StatGridV2>
    </div>
  );
}

// =================================================================
// EXPLORER CARD V2
// =================================================================

interface ExplorerV2Props {
  username: string;
  journalName: string;
  avatarUrl?: string;
  location: string;
  accountType: 'explorer' | 'explorer-pro' | 'expedition-guide';
  activeExpeditions: number;
  totalEntries: number;
  onClick?: () => void;
}

export function ExplorerCardPortraitV2({
  username,
  journalName,
  avatarUrl,
  location,
  accountType,
  activeExpeditions,
  totalEntries,
  onClick,
}: ExplorerV2Props) {
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
    <div
      onClick={onClick}
      className="group block bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors cursor-pointer active:scale-[0.98]"
    >
      {/* Body (single block, no internal dividers) */}
      <div className="px-4 pt-4 pb-4 flex flex-col items-center">
        {/* Account type caption */}
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-wider mb-3 self-start">
          <span
            className="h-1.5 w-1.5 inline-block"
            style={{ background: accentColor }}
          />
          <span className="font-bold" style={{ color: accentColor }}>
            {accountLabel}
          </span>
        </div>

        {/* Avatar */}
        <div
          className="w-28 h-28 border-2 overflow-hidden bg-[#b5bcc4] mb-3"
          style={{ borderColor: accentColor }}
        >
          <ExplorerAvatar
            username={username}
            src={avatarUrl}
            size={112}
            className="w-full h-full"
          />
        </div>

        {/* Username + duplicated account-type pill (matches current card) */}
        <div className="flex items-center gap-2 flex-wrap justify-center mb-1 max-w-full">
          <h3 className="text-base font-serif font-bold text-[#202020] dark:text-[#e5e5e5] group-hover:text-[#ac6d46] leading-snug truncate">
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

        <div className="text-xs font-serif italic text-[#616161] dark:text-[#b5bcc4] text-center mb-1 line-clamp-1 max-w-full">
          {journalName}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#616161] dark:text-[#b5bcc4] max-w-full">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      </div>

      {/* Footer: 2-stat grid, hairline border-t */}
      <StatGridV2 columns={2}>
        <StatV2
          label="Expeditions"
          value={activeExpeditions.toString()}
          accent="copper"
        />
        <StatV2 label="Entries" value={totalEntries.toString()} />
      </StatGridV2>
    </div>
  );
}

// =================================================================
// Shared footer primitives — hairline border-t + 2 or 3 column grid
// =================================================================

function StatGridV2({
  columns,
  children,
}: {
  columns: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`px-4 pb-4 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] grid gap-x-4 gap-y-3 ${
        columns === 3 ? 'grid-cols-3' : 'grid-cols-2'
      }`}
    >
      {children}
    </div>
  );
}

function StatV2({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
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
