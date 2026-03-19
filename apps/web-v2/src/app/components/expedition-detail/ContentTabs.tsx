'use client';

import Link from 'next/link';
import { formatCurrency } from '@/app/utils/formatCurrency';
import { useState } from 'react';
import { Users, ArrowDown, ArrowUp } from 'lucide-react';
import { EntryCardLandscape } from '@/app/components/EntryCardLandscape';
import { WaypointCardLandscape } from '@/app/components/WaypointCardLandscape';
import { ExpeditionNotes } from '@/app/components/ExpeditionNotes';
import type { TransformedExpedition, WaypointType, JournalEntryType } from '@/app/components/expedition-detail/types';
import type { ExpeditionNote } from '@/app/services/api';
import type { Ref } from 'react';

interface ContentTabsProps {
  selectedView: 'notes' | 'entries' | 'waypoints' | 'sponsors';
  onSelectView: (view: 'notes' | 'entries' | 'waypoints' | 'sponsors') => void;
  expedition: TransformedExpedition;
  showSponsorshipSection: boolean;
  journalEntries: JournalEntryType[];
  waypoints: WaypointType[];
  sponsors: any[];
  expeditionNotes: ExpeditionNote[];
  noteCount: number;
  dailyLimit?: { used: number; max: number };
  isSponsoring: boolean;
  isPublicNotes: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  notesSectionRef: Ref<HTMLDivElement>;
  onPostNote: (text: string) => Promise<void>;
  onPostReply: (noteId: string, text: string) => Promise<void>;
  onEditNote: (noteId: string, text: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onEditReply: (noteId: string, replyId: string, text: string) => Promise<void>;
  onDeleteReply: (noteId: string, replyId: string) => Promise<void>;
  onWaypointClick: (coords: { lat: number; lng: number }) => void;
  router: { push: (url: string) => void };
}

export function ContentTabs({
  selectedView,
  onSelectView,
  expedition,
  showSponsorshipSection,
  journalEntries,
  waypoints,
  sponsors,
  expeditionNotes,
  noteCount,
  dailyLimit,
  isSponsoring,
  isPublicNotes,
  isOwner,
  isAuthenticated,
  notesSectionRef,
  onPostNote,
  onPostReply,
  onEditNote,
  onDeleteNote,
  onEditReply,
  onDeleteReply,
  onWaypointClick,
  router,
}: ContentTabsProps) {
  // 'asc' = earliest first (route order), 'desc' = latest first
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const showSortToggle = selectedView === 'entries' || selectedView === 'waypoints';

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
      {/* Tab Navigation */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] flex">
        <button
          onClick={() => onSelectView('entries')}
          className={`flex-1 py-3 text-sm font-bold ${
            selectedView === 'entries'
              ? 'bg-[#4676ac] text-white'
              : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
          } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]`}
        >
          JOURNAL ENTRIES ({expedition.totalEntries})
        </button>
        {expedition.explorerIsPro && expedition.privacy !== 'private' && (
          <button
            onClick={() => onSelectView('notes')}
            className={`flex-1 py-3 text-sm font-bold ${
              selectedView === 'notes'
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
            } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border-l-2 border-[#202020] dark:border-[#616161]`}
          >
            EXPEDITION NOTES
          </button>
        )}
        <button
          onClick={() => onSelectView('waypoints')}
          className={`flex-1 py-3 text-sm font-bold ${
            selectedView === 'waypoints'
              ? 'bg-[#4676ac] text-white'
              : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
          } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border-l-2 border-[#202020] dark:border-[#616161]`}
        >
          WAYPOINTS ({expedition.totalWaypoints})
        </button>
        {/* Sponsors tab - only show if sponsorships enabled */}
        {showSponsorshipSection && (
          <button
            onClick={() => onSelectView('sponsors')}
            className={`flex-1 py-3 text-sm font-bold ${
              selectedView === 'sponsors'
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
            } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border-l-2 border-[#202020] dark:border-[#616161]`}
          >
            SPONSORS ({expedition.sponsors})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Sort toggle for entries/waypoints */}
        {showSortToggle && (
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-[#616161] dark:text-[#b5bcc4] hover:text-[#202020] dark:hover:text-[#e5e5e5] transition-colors"
              title={sortDirection === 'asc' ? 'Showing earliest first' : 'Showing latest first'}
            >
              {sortDirection === 'asc' ? (
                <><ArrowDown className="w-3 h-3" />EARLIEST FIRST</>
              ) : (
                <><ArrowUp className="w-3 h-3" />LATEST FIRST</>
              )}
            </button>
          </div>
        )}

        {selectedView === 'notes' && expedition.explorerIsPro && expedition.privacy !== 'private' && (
          <div ref={notesSectionRef}>
            <ExpeditionNotes
              expeditionId={expedition.id}
              explorerId={expedition.explorerId}
              explorerName={expedition.explorerName}
              explorerPicture={expedition.explorerPicture}
              isOwner={isOwner}
              isSponsoring={isSponsoring}
              isPublicNotes={isPublicNotes}
              expeditionStatus={expedition.status}
              notes={expeditionNotes.map(note => ({
                ...note,
                id: String(note.id),
                replies: note.replies?.map(reply => ({
                  ...reply,
                  id: String(reply.id),
                  noteId: String(reply.noteId),
                })),
              }))}
              noteCount={noteCount}
              dailyLimit={dailyLimit}
              onPostNote={onPostNote}
              onPostReply={onPostReply}
              onEditNote={onEditNote}
              onDeleteNote={onDeleteNote}
              onEditReply={onEditReply}
              onDeleteReply={onDeleteReply}
            />
          </div>
        )}

        {/* Journal Entries View */}
        {selectedView === 'entries' && (() => {
          // Entry numbers: date asc, route position as tiebreaker for same-date entries
          const entryRoutePosition = new Map<string, number>();
          waypoints.forEach((wp, wpIdx) => {
            (wp.entryIds || []).forEach((eid: string) => entryRoutePosition.set(eid, wpIdx));
          });
          const sortedAsc = [...journalEntries].sort((a, b) => {
            const da = new Date(a.date).getTime(), db = new Date(b.date).getTime();
            if (da !== db) return da - db;
            const ra = entryRoutePosition.get(a.id) ?? Infinity, rb = entryRoutePosition.get(b.id) ?? Infinity;
            if (ra !== rb) return ra - rb;
            return (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          });
          const entryNumberMap = new Map(sortedAsc.map((e, i) => [e.id, i + 1]));
          const displayEntries = sortDirection === 'asc' ? sortedAsc : [...sortedAsc].reverse();
          return (
          <div className="space-y-4">
            {displayEntries.length > 0 ? (
              <>
                {displayEntries.map((entry) => (
                  <EntryCardLandscape
                    key={entry.id}
                    id={entry.id}
                    title={entry.title}
                    explorerUsername={expedition.explorerName}
                    expeditionName={expedition.title}
                    location={entry.location}
                    date={entry.date}
                    excerpt={entry.excerpt}
                    type={entry.type}
                    entryNumber={entryNumberMap.get(entry.id) ?? 0}
                    visibility={entry.visibility}
                    isMilestone={entry.isMilestone}
                    isCurrent={expedition.currentLocationSource === 'entry' && expedition.currentLocationId === entry.id}
                    onClick={() => router.push(`/entry/${entry.id}`)}
                  />
                ))}
              </>
            ) : (
              <div className="border border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-8 text-center">
                <div className="text-sm font-bold font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
                  NO ENTRIES LOGGED YET
                </div>
                <div className="text-xs text-[#b5bcc4] dark:text-[#616161]">
                  Journal entries for this expedition will appear here once published.
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* Waypoints View — only unconverted waypoints (entries replace their waypoints) */}
        {selectedView === 'waypoints' && (() => {
            const unconvertedWaypoints = waypoints
              .filter((wp) => !(wp.entryIds && wp.entryIds.length > 0));
            // Number in route order, then optionally reverse for display
            const numbered = unconvertedWaypoints.map((wp, i) => ({ wp, num: i + 1 }));
            const displayWaypoints = sortDirection === 'asc' ? numbered : [...numbered].reverse();
            return (
              <div className="space-y-4">
                {displayWaypoints.length > 0 ? displayWaypoints.map(({ wp, num }) => (
                  <WaypointCardLandscape
                    key={wp.id}
                    id={wp.id}
                    title={wp.title}
                    explorerUsername={expedition.explorerName}
                    expeditionName={expedition.title}
                    location={wp.location}
                    description={wp.description}
                    date={wp.date}
                    latitude={wp.coords.lat}
                    longitude={wp.coords.lng}
                    elevation={undefined}
                    views={0}
                    markerNumber={num}
                    isStart={num === 1}
                    isEnd={num === unconvertedWaypoints.length}
                    isCurrent={expedition.currentLocationSource === 'waypoint' && expedition.currentLocationId === wp.id}
                    onClick={() => onWaypointClick(wp.coords)}
                  />
                )) : (
                  <div className="p-8 text-center">
                    <div className="text-xs text-[#b5bcc4] dark:text-[#616161]">
                      No standalone waypoints. All route points have been converted to journal entries.
                    </div>
                  </div>
                )}
              </div>
            );
        })()}

        {/* Sponsors Leaderboard - only show if sponsorships enabled */}
        {selectedView === 'sponsors' && showSponsorshipSection && (
          <div>
            {sponsors.length > 0 ? (
              <div className="space-y-0">
                {/* Leaderboard Header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 bg-[#616161] dark:bg-[#3a3a3a] text-white text-xs font-bold font-mono">
                  <span className="w-8 text-center">#</span>
                  <span>SPONSOR</span>
                  <span className="text-right">TYPE</span>
                  <span className="w-24 text-right">AMOUNT</span>
                </div>

                {sponsors.map((s: any, idx: number) => {
                  const isPublic = s.isPublic !== false;
                  const isMessagePublic = s.isMessagePublic !== false;
                  const sponsor = s.user || s.sponsor;
                  const isRecurring = s.type?.toUpperCase() === 'SUBSCRIPTION';
                  const isCustomAmount = !s.tier || (s.tier.price && s.amount !== s.tier.price);
                  const tierLabel = isCustomAmount ? 'Custom' : s.tier?.description || 'Custom';

                  return (
                    <div
                      key={s.id}
                      className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 items-center border-b border-[#b5bcc4] dark:border-[#3a3a3a] ${
                        idx === 0 ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]' : idx === 1 ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]' : idx === 2 ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className={`w-8 text-center font-bold font-mono text-sm ${
                        idx === 0 ? 'text-[#ac6d46]' : idx === 1 ? 'text-[#4676ac]' : idx === 2 ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#b5bcc4] dark:text-[#616161]'
                      }`}>
                        {idx + 1}
                      </div>

                      {/* Sponsor Info */}
                      <div className="min-w-0">
                        {isPublic && sponsor ? (
                          <div>
                            <Link
                              href={`/journal/${sponsor.username}`}
                              className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] hover:text-[#ac6d46] transition-all"
                            >
                              {sponsor.username}
                            </Link>
                            {isMessagePublic && s.message && (
                              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-0.5 truncate italic">
                                "{s.message}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-[#616161] dark:text-[#b5bcc4] italic">
                            Anonymous Sponsor
                          </div>
                        )}
                      </div>

                      {/* Tier / Type */}
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 text-xs font-bold ${
                          isRecurring
                            ? 'bg-[#4676ac] text-white'
                            : 'bg-[#ac6d46] text-white'
                        }`}>
                          {tierLabel}
                        </span>
                        <div className="text-[10px] text-[#b5bcc4] dark:text-[#616161] mt-0.5 font-mono">
                          {isRecurring ? 'MONTHLY' : 'ONE-TIME'}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="w-24 text-right">
                        <div className="font-bold text-sm dark:text-[#e5e5e5]">
                          ${formatCurrency(s.totalContribution || s.amount || 0)}
                        </div>
                        {isRecurring && (
                          <div className="text-[10px] text-[#4676ac] font-mono">
                            ${formatCurrency(s.amount || 0)}/mo
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-8 text-center">
                <Users className="w-12 h-12 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-3" />
                <div className="text-sm font-bold font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
                  NO SPONSORS YET
                </div>
                <div className="text-xs text-[#b5bcc4] dark:text-[#616161]">
                  Be the first to support this expedition.
                </div>
                {!isOwner && expedition.status !== 'completed' && expedition.status !== 'cancelled' && (
                  <Link
                    href={isAuthenticated ? `/sponsor/${expedition.id}` : `/login?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
                    className="inline-block mt-4 px-6 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] text-sm font-bold"
                  >
                    BECOME A SPONSOR
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
