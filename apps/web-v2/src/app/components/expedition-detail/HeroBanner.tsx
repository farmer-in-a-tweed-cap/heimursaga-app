import { type Ref } from 'react';
import Link from 'next/link';
import { Users, Maximize2, Loader2, Lock, EyeOff, XCircle, ShieldAlert, MapPin, Globe } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { CoverPhotoFallback } from '@/app/components/CoverPhotoFallback';
import { ExplorerAvatar } from '@/app/components/ExplorerAvatar';
import { LiveTrackBadge } from '@/app/components/expedition-detail/LiveTrackBadge';
import { ShareButton } from '@/app/components/ShareButton';
import type { TransformedExpedition, CurrentLocationData } from '@/app/components/expedition-detail/types';
import type { Expedition, ExplorerProfile } from '@/app/services/api';

interface HeroBannerProps {
  expedition: TransformedExpedition;
  hasMapData: boolean;
  bannerMapContainerRef: Ref<HTMLDivElement>;
  currentLocationData: CurrentLocationData | null;
  isOwner: boolean;
  isAuthenticated: boolean;
  showSponsorshipSection: boolean;
  isFollowingExplorer: boolean;
  followLoading: boolean;
  isBookmarked: boolean;
  bookmarkLoading: boolean;
  embedCopied: boolean;
  isPro: boolean;
  apiExpedition: Expedition | null;
  totalDuration: number | null;
  formatDate: (date: string | undefined) => string;
  formatCoords: (lat: number, lng: number) => string;
  onOpenMapModal: () => void;
  onFollow: (explorerId: string) => void;
  onBookmark: () => void;
  onCopyEmbed: () => void;
  onCurrentLocationClick: (coords: { lat: number; lng: number }) => void;
  explorerProfile: ExplorerProfile | null;
  onReport?: () => void;
  onAdopt?: () => void;
  /**
   * Live tracking state. When present and a timestamp is available, renders
   * a "Live · 14 min ago" freshness badge below the current-location bar.
   * The hook that produces this (useLiveTrack) is gated to active or
   * previously-tracked expeditions so the prop is null in most cases.
   */
  liveTrack?: {
    trackId: number | null;
    isActive: boolean;
    lastPointAt: string | null;
    heartbeatAt: string | null;
  } | null;
  /**
   * Owner-only polyline visibility. Click cycles through public → sponsors
   * → private. Calls `onLiveTrackVisibilityChange` with the new value; the
   * parent persists + refetches.
   */
  liveTrackVisibility?: 'public' | 'sponsors' | 'private';
  onLiveTrackVisibilityChange?: (
    next: 'public' | 'sponsors' | 'private',
  ) => Promise<void> | void;
  /**
   * Owner-only stop control. Called when the owner clicks Stop on an
   * active track. The parent persists + refetches.
   */
  onStopTrack?: () => Promise<void> | void;
}

// Opt-up direction per Phase 1 spec decision #1: starting from the safe
// 'private' default, each click should EXPAND the audience (private →
// sponsors → public), then loop back. The reverse direction would let
// a single accidental click from the default jump straight to public,
// which is the opposite of the spec's "consciously opt up" goal.
const VISIBILITY_CYCLE: Record<
  'public' | 'sponsors' | 'private',
  'public' | 'sponsors' | 'private'
> = {
  private: 'sponsors',
  sponsors: 'public',
  public: 'private',
};

const VISIBILITY_LABEL: Record<'public' | 'sponsors' | 'private', string> = {
  public: 'PUBLIC',
  sponsors: 'SPONSORS',
  private: 'PRIVATE',
};

export function HeroBanner({
  expedition,
  hasMapData,
  bannerMapContainerRef,
  currentLocationData,
  isOwner,
  isAuthenticated,
  showSponsorshipSection,
  isFollowingExplorer,
  followLoading,
  isBookmarked,
  bookmarkLoading,
  embedCopied,
  isPro,
  apiExpedition,
  totalDuration,
  formatDate,
  formatCoords,
  onOpenMapModal,
  onFollow,
  onBookmark,
  onCopyEmbed,
  onCurrentLocationClick,
  explorerProfile,
  onReport,
  onAdopt,
  liveTrack,
  liveTrackVisibility,
  onLiveTrackVisibilityChange,
  onStopTrack,
}: HeroBannerProps) {
  return (
    <div
      className={`relative h-[400px] md:h-[600px] overflow-hidden${hasMapData ? ' cursor-pointer' : ''}`}
      onClick={() => hasMapData && onOpenMapModal()}
      role={hasMapData ? 'button' : undefined}
      tabIndex={hasMapData ? 0 : undefined}
      onKeyDown={hasMapData ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenMapModal(); } } : undefined}
    >
      {/* Banner Map */}
      <div ref={bannerMapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Fallback cover image when no map data */}
      {!hasMapData && expedition.imageUrl && (
        <ImageWithFallback
          src={expedition.imageUrl}
          alt={expedition.title}
          className="absolute inset-0 h-full w-full object-cover z-0"
        />
      )}
      {/* No cover & no map = topo pattern fallback */}
      {!hasMapData && !expedition.imageUrl && (
        <CoverPhotoFallback className="absolute inset-0 h-full w-full z-0" />
      )}

      {/* Dark gradient overlay for text readability (only when cover image or map) */}
      {(hasMapData || expedition.imageUrl) && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#202020]/70 via-[#202020]/60 to-[#202020]/90 pointer-events-none z-[1]" />
      )}

      {/* Expedition Status Banner - Top Border */}
      <div className={`absolute top-0 left-0 right-0 py-2 px-6 ${
        apiExpedition?.isBlueprint
          ? 'bg-[#598636]'
          : expedition.status === 'active'
          ? 'bg-[#ac6d46]'
          : expedition.status === 'planned'
          ? 'bg-[#4676ac]'
          : 'bg-[#616161]'
      } z-10 flex items-center justify-between pointer-events-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="text-white font-bold text-sm tracking-wide flex items-center gap-3">
          {apiExpedition?.isBlueprint
            ? 'EXPEDITION BLUEPRINT'
            : expedition.status === 'cancelled' ? 'CANCELLED EXPEDITION' : expedition.status === 'active' ? 'ACTIVE EXPEDITION' : expedition.status === 'planned' ? 'PLANNED EXPEDITION' : 'COMPLETED EXPEDITION'}
          {apiExpedition?.mode && (
            <span className="px-2 py-0.5 text-xs font-bold bg-white/20 tracking-wide uppercase">{apiExpedition.mode}</span>
          )}
        </div>
        {expedition.privacy !== 'public' && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold tracking-wide ${
            expedition.privacy === 'off-grid' ? 'bg-[#6b5c4e] text-white' : 'bg-[#202020] text-white'
          }`}>
            {expedition.privacy === 'off-grid' ? <EyeOff className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {expedition.privacy === 'off-grid' ? 'OFF-GRID' : 'PRIVATE'}
          </div>
        )}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 text-white pt-16 pointer-events-none z-[2]">
        {/* Top Section: Title, Explorer, Description */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="mb-3">
              <h1 className="text-2xl md:text-4xl font-serif font-bold" style={{ lineHeight: 1.15 }}>{expedition.title}</h1>
              {expedition.locationName && (
                <div className="flex items-center gap-2 mt-2.5">
                  <MapPin size={16} className="text-[#ac6d46] flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-sm md:text-base text-white/90 font-serif" style={{ lineHeight: 1.3 }}>{expedition.locationName}</span>
                </div>
              )}
              {(expedition.category || expedition.region) && (
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {expedition.region && expedition.region.split(', ').map(r => (
                    <span key={r} className="px-2.5 py-0.5 bg-white/15 text-white/80 text-xs font-bold tracking-wide whitespace-nowrap rounded-full">
                      {r.toUpperCase()}
                    </span>
                  ))}
                  {expedition.category && (
                    expedition.category === 'Historical Archive' ? (
                      <Link
                        href="/historical-archive"
                        className="px-2.5 py-0.5 bg-white/15 text-white/80 text-xs font-bold tracking-wide whitespace-nowrap rounded-full hover:bg-white/25 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] pointer-events-auto"
                        aria-label="View the historical archive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {expedition.category.toUpperCase()}
                      </Link>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-white/15 text-white/80 text-xs font-bold tracking-wide whitespace-nowrap rounded-full">
                        {expedition.category.toUpperCase()}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
            {!apiExpedition?.isBlueprint && (
              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-[#b5bcc4] mb-3 font-mono">
                <span>Day {expedition.daysActive} of {totalDuration || '?'}</span>
                <span>&bull;</span>
                <span>{formatDate(expedition.startDate)} to {formatDate(expedition.estimatedEndDate)}</span>
              </div>
            )}

            <p className="text-sm font-serif text-white/90 max-w-4xl hidden md:block" style={{ lineHeight: 1.75 }}>{expedition.description}</p>

            {/* Source blueprint attribution */}
            {apiExpedition?.sourceBlueprint && (
              <div className="mt-3 pointer-events-auto">
                <Link href={`/expedition/${apiExpedition.sourceBlueprint.id}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#598636]/80 text-white text-xs font-bold hover:bg-[#598636] transition-all">
                  Based on &ldquo;{apiExpedition.sourceBlueprint.title}&rdquo;
                  {apiExpedition.sourceBlueprint.author && (
                    <span className="text-white/70">by {apiExpedition.sourceBlueprint.author.username}</span>
                  )}
                </Link>
              </div>
            )}

            {/* Blueprint stats */}
            {apiExpedition?.isBlueprint && (
              <div className="flex items-center gap-4 mt-3 text-xs text-white/80 font-mono pointer-events-auto">
                {(apiExpedition.ratingsCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    {'★'.repeat(Math.round(apiExpedition.averageRating || 0))}{'☆'.repeat(5 - Math.round(apiExpedition.averageRating || 0))}
                    <span className="ml-1">({apiExpedition.ratingsCount})</span>
                  </span>
                )}
                <span>{apiExpedition.adoptionsCount ?? 0} launches</span>
              </div>
            )}
          </div>

          {/* Explorer Info Card - hidden on mobile to prevent overlap */}
          <div className="hidden md:block text-xs font-mono bg-[#202020]/80 border-2 border-[#ac6d46] p-4 min-w-[280px] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-[#b5bcc4] mb-3 font-bold border-b-2 border-[#616161] pb-2">{apiExpedition?.isBlueprint ? 'GUIDE INFORMATION' : 'EXPLORER INFORMATION'}</div>

            <div className="flex items-center gap-3 mb-4">
              <Link href={`/journal/${expedition.explorerId}`} className="flex-shrink-0">
                <div className={`w-16 h-16 border-2 ${apiExpedition?.isBlueprint ? 'border-[#598636]' : expedition.explorerIsPro ? 'border-[#ac6d46]' : 'border-[#616161]'} overflow-hidden bg-[#202020] hover:border-[#4676ac] transition-all`}>
                  <ExplorerAvatar
                    username={expedition.explorerId}
                    src={expedition.explorerPicture}
                    size={64}
                  />
                </div>
              </Link>
              <div className="flex-1">
                <Link href={`/journal/${expedition.explorerId}`} className="text-white font-bold hover:text-[#ac6d46] transition-all focus-visible:outline-none focus-visible:underline block mb-1">
                  {expedition.explorerId}
                </Link>
                {explorerProfile?.name && (
                  <div className="text-[#b5bcc4]">{explorerProfile.name}</div>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t-2 border-[#616161] pt-3">
              <div className="flex justify-between gap-4">
                <span className="text-[#b5bcc4]">Account Type:</span>
                <span className={`font-bold ${apiExpedition?.isBlueprint ? 'text-[#598636]' : 'text-[#ac6d46]'}`}>{apiExpedition?.isBlueprint ? 'EXPEDITION GUIDE' : expedition.explorerIsPro ? 'EXPLORER PRO' : 'EXPLORER'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#b5bcc4]">{apiExpedition?.isBlueprint ? 'Total Blueprints:' : 'Total Expeditions:'}</span>
                <span className="text-white font-bold">{explorerProfile?.expeditionsCount ?? '—'}</span>
              </div>
              {!apiExpedition?.isBlueprint && (
              <div className="flex justify-between gap-4">
                <span className="text-[#b5bcc4]">Total Entries:</span>
                <span className="text-white font-bold">{explorerProfile?.entriesCount ?? '—'}</span>
              </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Link
                href={`/journal/${expedition.explorerId}`}
                className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] font-bold"
              >
                {apiExpedition?.isBlueprint ? 'VIEW PORTFOLIO' : 'VIEW JOURNAL'}
              </Link>
              {!isOwner && (
                <button
                  onClick={() => onFollow(expedition.explorerId)}
                  disabled={followLoading}
                  className={`w-full py-1.5 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-xs font-bold ${
                    isFollowingExplorer
                      ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                      : 'border-2 border-[#616161] text-white hover:bg-[#616161]/30 focus-visible:ring-[#616161]'
                  }`}
                >
                  {followLoading ? 'LOADING...' : isFollowingExplorer ? 'FOLLOWING' : 'FOLLOW'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Current Location + Action Bar */}
        <div className="-mx-6 -mb-6">
          {/* "CLICK MAP TO EXPLORE" hint */}
          {hasMapData && (
            <div className="flex justify-center pb-3 pointer-events-none">
              <div className="bg-[#202020]/60 text-white/80 text-xs font-mono px-3 py-1.5 flex items-center gap-2">
                <Maximize2 size={12} />
                CLICK MAP TO EXPLORE
              </div>
            </div>
          )}
          {/* Cancelled Banner */}
          {expedition.status === 'cancelled' && apiExpedition?.cancelledAt && (
            <div className="bg-[#994040] px-6 py-3 flex items-center gap-3 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <XCircle size={16} className="text-white flex-shrink-0" strokeWidth={2} />
              <div className="font-mono text-sm">
                <span className="text-white font-bold tracking-wide mr-3">EXPEDITION CANCELLED</span>
                {apiExpedition.cancellationReason && (
                  <span className="text-white/70">{apiExpedition.cancellationReason} &middot; </span>
                )}
                <span className="text-white/70">{formatDate(apiExpedition.cancelledAt as unknown as string)}</span>
              </div>
            </div>
          )}
          {/* Planned Departure Bar */}
          {expedition.status === 'planned' && expedition.startDate && !currentLocationData?.location && (() => {
            const daysUntil = Math.max(0, Math.ceil((new Date(expedition.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
            return (
              <div className="w-full bg-[#4676ac] px-6 py-3 flex items-center justify-center gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <div className="relative flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <div className="font-mono text-sm">
                  <span className="text-white/70 font-bold tracking-wide mr-3">PLANNED DEPARTURE</span>
                  <span className="text-white font-bold">{formatDate(expedition.startDate)}</span>
                </div>
                <div className="text-xs text-white/70 font-mono border-l border-white/30 pl-4">
                  {daysUntil === 0 ? 'Departing today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`}
                </div>
              </div>
            );
          })()}
          {/* Current Location Bar - showing for all statuses temporarily */}
          {currentLocationData?.location && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentLocationData.coords) {
                  onCurrentLocationClick(currentLocationData.coords);
                }
              }}
              className="w-full bg-[#4676ac] px-6 py-3 flex items-center justify-center gap-4 hover:bg-[#365a87] transition-all cursor-pointer pointer-events-auto"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-3 h-3 bg-white rounded-full animate-ping opacity-75" />
                <div className="relative w-2 h-2 bg-white rounded-full" />
              </div>
              <div className="font-mono text-sm">
                <span className="text-white/70 font-bold tracking-wide mr-3">CURRENT LOCATION</span>
                <span className="text-white font-bold">{currentLocationData.location}</span>
              </div>
              {currentLocationData.coords && (
                <div className="text-xs text-white/70 font-mono border-l border-white/30 pl-4">
                  {formatCoords(currentLocationData.coords.lat, currentLocationData.coords.lng)}
                </div>
              )}
              {/* Visibility indicator */}
              {isOwner && expedition.currentLocationVisibility && expedition.currentLocationVisibility !== 'public' && (
                <div className="flex items-center gap-1.5 border-l border-white/30 pl-4">
                  {expedition.currentLocationVisibility === 'sponsors' && (
                    <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                      <Users className="w-3.5 h-3.5 text-white" />
                      <span className="text-white text-xs font-bold font-mono tracking-wide">SPONSORS ONLY</span>
                    </div>
                  )}
                  {expedition.currentLocationVisibility === 'private' && (
                    <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                      <Lock className="w-3.5 h-3.5 text-white" />
                      <span className="text-white text-xs font-bold font-mono tracking-wide">PRIVATE</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          )}

          {/* Live tracking freshness — rendered when the live-track hook
              returns timestamp data. Matches the current-location bar
              styling above (same blue, same padding, same gap) so the
              two bars read as a single block of status. */}
          {liveTrack && (liveTrack.lastPointAt || liveTrack.heartbeatAt) && (
            <div
              className="w-full bg-[#4676ac] px-6 py-3 flex items-center justify-center gap-4 pointer-events-auto text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <LiveTrackBadge
                lastPointAt={liveTrack.lastPointAt}
                heartbeatAt={liveTrack.heartbeatAt}
                isActive={liveTrack.isActive}
              />
              {/* Owner-only polyline visibility cycler. Click to advance:
                  public → sponsors → private → public. The polyline is
                  hidden from non-owners when set to 'private' (the
                  default). */}
              {isOwner && liveTrackVisibility && onLiveTrackVisibilityChange && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onLiveTrackVisibilityChange(
                      VISIBILITY_CYCLE[liveTrackVisibility],
                    );
                  }}
                  title="Click to change track visibility"
                  className="inline-flex items-center gap-1.5 border border-white/40 px-3 py-1 text-xs font-bold font-mono uppercase tracking-wide hover:bg-white/15 transition-colors"
                >
                  {liveTrackVisibility === 'public' && <Globe className="w-3.5 h-3.5" />}
                  {liveTrackVisibility === 'sponsors' && <Users className="w-3.5 h-3.5" />}
                  {liveTrackVisibility === 'private' && <Lock className="w-3.5 h-3.5" />}
                  <span>Visibility: {VISIBILITY_LABEL[liveTrackVisibility]}</span>
                </button>
              )}
              {/* Owner-only stop control. Tracks started from mobile can be
                  stopped from the web — the pin stays frozen at the last
                  point per the Phase 1 spec. */}
              {isOwner && liveTrack.isActive && onStopTrack && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      typeof window !== 'undefined' &&
                      !window.confirm('Stop tracking? The pin stays at the last position; you can re-pin manually anytime.')
                    ) {
                      return;
                    }
                    void onStopTrack();
                  }}
                  title="Stop tracking. The last position remains as your pin."
                  className="inline-flex items-center gap-1.5 bg-[#994040] px-3 py-1 text-white text-xs font-bold font-mono uppercase tracking-wide hover:bg-[#7a3232] transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Stop tracking</span>
                </button>
              )}
              {/* Inline sponsor CTA — the live bar is where sponsors watch
                  the expedition unfold, so the ask lives next to the live
                  signal (Phase 1 spec). The action bar below has the same
                  destination; this one converts the "it's happening right
                  now" moment. */}
              {!isOwner &&
                showSponsorshipSection &&
                liveTrack.isActive &&
                expedition.status !== 'completed' &&
                expedition.status !== 'cancelled' && (
                  <Link
                    href={isAuthenticated ? `/sponsor/${expedition.id}` : `/auth?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 bg-[#ac6d46] px-3 py-1 text-white text-xs font-bold font-mono uppercase tracking-wide hover:bg-[#8a5738] transition-colors"
                  >
                    <span>Sponsor this expedition</span>
                  </Link>
                )}
            </div>
          )}

          {/* Action Bar - Always visible */}
          <div className="bg-[#202020]/90 px-3 md:px-6 py-2 md:py-3 border-t-2 border-[#616161] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2 md:gap-6">
            {/* Expedition Status - hidden on mobile to give buttons room */}
            <div className="hidden md:flex items-center gap-3">
              <div className="font-mono text-sm text-[#b5bcc4]">
                {apiExpedition?.isBlueprint
                  ? 'EXPEDITION BLUEPRINT'
                  : expedition.status === 'cancelled' ? 'CANCELLED EXPEDITION' : expedition.status === 'completed' ? 'COMPLETED EXPEDITION' : expedition.status === 'planned' ? 'PLANNED EXPEDITION' : 'ACTIVE EXPEDITION'}
              </div>
              {expedition.privacy !== 'public' && (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${
                  expedition.privacy === 'off-grid' ? 'bg-[#6b5c4e] text-white' : 'bg-[#202020] text-white border border-[#616161]'
                }`}>
                  {expedition.privacy === 'off-grid' ? <EyeOff className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {expedition.privacy === 'off-grid' ? 'OFF-GRID' : 'PRIVATE'}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-stretch gap-1.5 md:gap-2 flex-nowrap">
              {/* Edit Blueprint button — owner only */}
              {isOwner && apiExpedition?.isBlueprint && (
                <Link
                  href={`/expedition-builder/${expedition.id}`}
                  className="px-2 py-1.5 md:px-3 md:py-2 bg-[#598636] text-white hover:bg-[#476b2b] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#598636] text-xs md:text-sm font-bold font-mono whitespace-nowrap flex items-center gap-1.5 md:gap-2 min-h-[36px] md:min-h-[44px]"
                >
                  EDIT BLUEPRINT
                </Link>
              )}
              {/* Sponsor button */}
              {!isOwner && showSponsorshipSection && expedition.status !== 'completed' && expedition.status !== 'cancelled' && (
                <Link
                  href={isAuthenticated ? `/sponsor/${expedition.id}` : `/auth?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
                  className="px-2 py-1.5 md:px-3 md:py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs md:text-sm font-bold font-mono whitespace-nowrap flex items-center gap-1.5 md:gap-2 min-h-[36px] md:min-h-[44px]"
                >
                  SPONSOR
                </Link>
              )}
              {/* Launch button for blueprints — non-owners only */}
              {!isOwner && apiExpedition?.isBlueprint && onAdopt && (
                <button
                  onClick={onAdopt}
                  className="px-2 py-1.5 md:px-3 md:py-2 border-2 border-[#ac6d46] bg-[#ac6d46] text-white hover:bg-[#8a5738] hover:border-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs md:text-sm font-bold font-mono whitespace-nowrap flex items-center gap-1.5 md:gap-2 min-h-[36px] md:min-h-[44px]"
                >
                  LAUNCH EXPEDITION
                </button>
              )}
              {/* Bookmark button - Hidden when not authenticated */}
              {isAuthenticated && (
                <button
                  onClick={onBookmark}
                  disabled={bookmarkLoading}
                  className={`px-2 py-1.5 md:px-3 md:py-2 border-2 transition-all text-xs md:text-sm font-bold font-mono whitespace-nowrap flex items-center gap-1.5 md:gap-2 min-h-[36px] md:min-h-[44px] ${
                    isBookmarked
                      ? 'border-[#4676ac] bg-[#4676ac] text-white hover:bg-[#365a87]'
                      : 'border-white/30 text-white hover:bg-white/10'
                  }`}
                >
                  {bookmarkLoading && <Loader2 size={16} strokeWidth={2} className="animate-spin" />}
                  {isBookmarked ? 'BOOKMARKED' : 'BOOKMARK'}
                </button>
              )}
              {/* Share button - Always visible (public action) */}
              <ShareButton
                className="px-2 py-1.5 md:px-3 md:py-2 border-2 border-white/30 text-white hover:bg-white/10 transition-all text-xs md:text-sm font-bold font-mono whitespace-nowrap flex items-center gap-1.5 md:gap-2 min-h-[36px] md:min-h-[44px]"
                dropdownDirection="up"
              />
              {/* Embed button - Explorer Pro owners only */}
              {isOwner && isPro && (
                <button
                  onClick={onCopyEmbed}
                  className="px-2 py-1.5 md:px-3 md:py-2 border-2 border-white/30 text-white hover:bg-white/10 transition-all text-xs md:text-sm font-bold font-mono whitespace-nowrap flex items-center min-h-[36px] md:min-h-[44px]"
                >
                  {embedCopied ? 'COPIED!' : 'EMBED'}
                </button>
              )}
              {/* Report button - non-owners only */}
              {!isOwner && onReport && (
                <button
                  onClick={onReport}
                  className="p-2 text-white/40 hover:text-[#994040] transition-colors"
                  title="Report this expedition"
                >
                  <ShieldAlert size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
