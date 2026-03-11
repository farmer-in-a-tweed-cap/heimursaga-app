import type { Ref } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Maximize2, Loader2, Lock, EyeOff, XCircle } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
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
  shareCopied: boolean;
  apiExpedition: Expedition | null;
  totalDuration: number | null;
  formatDate: (date: string | undefined) => string;
  formatCoords: (lat: number, lng: number) => string;
  onOpenMapModal: () => void;
  onFollow: (explorerId: string) => void;
  onBookmark: () => void;
  onShare: () => void;
  onCurrentLocationClick: (coords: { lat: number; lng: number }) => void;
  explorerProfile: ExplorerProfile | null;
}

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
  shareCopied,
  apiExpedition,
  totalDuration,
  formatDate,
  formatCoords,
  onOpenMapModal,
  onFollow,
  onBookmark,
  onShare,
  onCurrentLocationClick,
  explorerProfile,
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
      {!hasMapData && (
        <ImageWithFallback
          src={expedition.imageUrl}
          alt={expedition.title}
          className="absolute inset-0 h-full w-full object-cover z-0"
        />
      )}

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#202020]/70 via-[#202020]/60 to-[#202020]/90 pointer-events-none z-[1]" />

      {/* Expedition Status Banner - Top Border */}
      <div className={`absolute top-0 left-0 right-0 py-2 px-6 ${
        expedition.status === 'active'
          ? 'bg-[#ac6d46]'
          : expedition.status === 'planned'
          ? 'bg-[#4676ac]'
          : 'bg-[#616161]'
      } z-10 flex items-center justify-between pointer-events-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="text-white font-bold text-sm tracking-wide">
          {expedition.status === 'cancelled' ? 'CANCELLED EXPEDITION' : expedition.status === 'active' ? 'ACTIVE EXPEDITION' : expedition.status === 'planned' ? 'PLANNED EXPEDITION' : 'COMPLETED EXPEDITION'}
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
              <h1 className="text-2xl md:text-4xl font-serif font-medium" style={{ lineHeight: 1.15 }}>{expedition.title}</h1>
              {(expedition.category || expedition.region) && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {expedition.category && (
                    <span className="px-3 py-1 bg-[#4676ac] text-white text-xs font-semibold whitespace-nowrap rounded-full">
                      {expedition.category.toUpperCase()}
                    </span>
                  )}
                  {expedition.region && (
                    <span className="px-3 py-1 bg-[#616161] text-white text-xs font-semibold whitespace-nowrap rounded-full">
                      {expedition.region.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-[#b5bcc4] mb-3 font-mono">
              <span>Day {expedition.daysActive} of {totalDuration || '?'}</span>
              <span>&bull;</span>
              <span>{formatDate(expedition.startDate)} to {formatDate(expedition.estimatedEndDate)}</span>
            </div>

            <p className="text-sm font-serif text-white/90 max-w-4xl line-clamp-3 md:line-clamp-none" style={{ lineHeight: 1.75 }}>{expedition.description}</p>
          </div>

          {/* Explorer Info Card - hidden on mobile to prevent overlap */}
          <div className="hidden md:block text-xs font-mono bg-[#202020]/80 border-2 border-[#ac6d46] p-4 min-w-[280px] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-[#b5bcc4] mb-3 font-bold border-b-2 border-[#616161] pb-2">EXPLORER INFORMATION</div>

            <div className="flex items-center gap-3 mb-4">
              <Link href={`/journal/${expedition.explorerId}`} className="flex-shrink-0">
                <div className={`w-16 h-16 border-2 ${expedition.explorerIsPro ? 'border-[#ac6d46]' : 'border-[#616161]'} overflow-hidden bg-[#202020] hover:border-[#4676ac] transition-all`}>
                  <Image
                    src={expedition.explorerPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${expedition.explorerId}`}
                    alt={expedition.explorerName}
                    className="w-full h-full object-cover"
                    width={64}
                    height={64}
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
                <span className="text-[#ac6d46] font-bold">{expedition.explorerIsPro ? 'EXPLORER PRO' : 'EXPLORER'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#b5bcc4]">Total Expeditions:</span>
                <span className="text-white font-bold">{explorerProfile?.expeditionsCount ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#b5bcc4]">Total Entries:</span>
                <span className="text-white font-bold">{explorerProfile?.entriesCount ?? '—'}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Link
                href={`/journal/${expedition.explorerId}`}
                className="block w-full py-2 bg-[#4676ac] text-white text-center hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] font-bold"
              >
                VIEW JOURNAL
              </Link>
              {!isOwner && (
                <button
                  onClick={() => onFollow(expedition.explorerId)}
                  disabled={followLoading}
                  className={`w-full py-1.5 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-xs font-bold ${
                    isFollowingExplorer
                      ? 'border-2 border-[#616161] text-white hover:bg-[#616161]/30 focus-visible:ring-[#616161]'
                      : 'bg-[#ac6d46] text-white hover:bg-[#8a5738] focus-visible:ring-[#ac6d46]'
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
          {/* Current Location Bar - showing for all statuses temporarily */}
          {currentLocationData?.location && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentLocationData.coords) {
                  onCurrentLocationClick(currentLocationData.coords);
                }
              }}
              className="w-full bg-[#ac6d46] px-6 py-3 flex items-center justify-center gap-4 hover:bg-[#8a5738] transition-all cursor-pointer pointer-events-auto"
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

          {/* Action Bar - Always visible */}
          <div className="bg-[#202020]/90 px-6 py-3 border-t-2 border-[#616161] pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-6">
            {/* Expedition Status */}
            <div className="flex items-center gap-3">
              <div className="font-mono text-sm text-[#b5bcc4]">
                {expedition.status === 'cancelled' ? 'CANCELLED EXPEDITION' : expedition.status === 'completed' ? 'COMPLETED EXPEDITION' : expedition.status === 'planned' ? 'PLANNED EXPEDITION' : 'ACTIVE EXPEDITION'}
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
            <div className="flex items-center gap-2">
              {/* Sponsor button */}
              {!isOwner && showSponsorshipSection && expedition.status !== 'completed' && expedition.status !== 'cancelled' && (
                <Link
                  href={isAuthenticated ? `/sponsor/${expedition.id}` : `/login?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
                  className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold whitespace-nowrap flex items-center gap-2"
                >
                  SPONSOR
                </Link>
              )}
              {/* Follow button moved to Explorer Information card */}
              {/* Bookmark button - Hidden when not authenticated */}
              {isAuthenticated && (
                <button
                  onClick={onBookmark}
                  disabled={bookmarkLoading}
                  className={`px-4 py-2 border-2 transition-all text-xs font-bold whitespace-nowrap flex items-center gap-2 ${
                    isBookmarked
                      ? 'border-[#ac6d46] bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                      : 'border-white/30 text-white hover:bg-white/10'
                  }`}
                >
                  {bookmarkLoading && <Loader2 size={16} strokeWidth={2} className="animate-spin" />}
                  {isBookmarked ? 'BOOKMARKED' : 'BOOKMARK'}
                </button>
              )}
              {/* Share button - Always visible (public action) */}
              <button
                onClick={onShare}
                className="px-4 py-2 border-2 border-white/30 text-white hover:bg-white/10 transition-all text-xs font-bold whitespace-nowrap flex items-center gap-2"
              >
                {shareCopied ? 'COPIED' : 'SHARE'}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
