'use client';

import { MapPin, Bookmark, Clock, Loader2, EyeOff, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { RadialProgress } from "@/app/components/ui/radial-progress";
import { Progress } from "@/app/components/ui/progress";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { useAuth } from "@/app/context/AuthContext";
import { useDistanceUnit } from "@/app/context/DistanceUnitContext";
import { formatDate } from "@/app/utils/dateFormat";

interface Waypoint {
  id: string;
  title: string;
  location: string;
  coords: { lat: number; lng: number };
  date: string;
  status: 'completed' | 'current' | 'planned';
  notes?: string;
}

interface JournalEntry {
  id: string;
  title: string;
  date: string;
  location: string;
  coords: { lat: number; lng: number };
  type: 'standard' | 'photo' | 'video' | 'data' | 'waypoint';
}

interface ExpeditionCardProps {
  id: string;
  title: string;
  explorer: string;
  description: string;
  imageUrl: string;
  location?: string; // Deprecated - use currentLocationSource/Id
  coordinates?: string; // Deprecated - use currentLocationSource/Id
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  waypoints?: Waypoint[];
  journalEntriesArray?: JournalEntry[];
  startDate: string;
  endDate: string | null;
  journalEntries: number;
  lastUpdate: string;
  fundingGoal: number;
  fundingCurrent: number;
  fundingPercentage: number;
  backers: number;
  distance?: number;
  waypointsCount?: number;
  status: "active" | "completed" | "planned" | "cancelled";
  region?: string;
  terrain: string;
  averageSpeed: number;
  visibility?: 'public' | 'off-grid' | 'private';
  sponsorshipsEnabled?: boolean;
  /** Whether the expedition creator has an Explorer Pro account (required for sponsorships) */
  explorerIsPro?: boolean;
  /** Whether the explorer's Stripe Connect account is verified and ready to receive payments */
  stripeConnected?: boolean;
  isBookmarked?: boolean;
  isBookmarkLoading?: boolean;
  onViewJournal?: () => void;
  onSupport?: () => void;
  onBookmark?: () => void;
  onViewExplorer?: () => void;
}

export function ExpeditionCard({
  title,
  explorer,
  description,
  imageUrl,
  location,
  coordinates,
  currentLocationSource,
  currentLocationId,
  waypoints = [],
  journalEntriesArray = [],
  startDate,
  endDate,
  journalEntries,
  lastUpdate,
  fundingGoal,
  fundingCurrent,
  fundingPercentage,
  backers,
  distance,
  waypointsCount = 0,
  status,
  region,
  visibility,
  sponsorshipsEnabled = true,
  explorerIsPro = false,
  stripeConnected = false,
  isBookmarked = false,
  isBookmarkLoading = false,
  onViewJournal,
  onSupport,
  onBookmark,
  onViewExplorer,
}: ExpeditionCardProps) {
  const { isAuthenticated, user } = useAuth();
  const { unit: distanceUnit, distanceLabel } = useDistanceUnit();
  const router = useRouter();

  // Sponsorship UI only shows if explorer is Pro AND sponsorships are enabled AND Stripe Connect is verified
  const showSponsorshipSection = explorerIsPro && sponsorshipsEnabled && stripeConnected;

  // Helper to get current location from waypoints/entries
  const getCurrentLocation = () => {
    if (currentLocationSource && currentLocationId) {
      if (currentLocationSource === 'waypoint') {
        const waypoint = waypoints.find(w => w.id === currentLocationId);
        if (waypoint) {
          return {
            location: waypoint.location,
            coordinates: `${waypoint.coords.lat.toFixed(4)}°N, ${waypoint.coords.lng.toFixed(4)}°E`,
          };
        }
      } else {
        const entry = journalEntriesArray.find(e => e.id === currentLocationId);
        if (entry) {
          return {
            location: entry.location,
            coordinates: `${entry.coords.lat.toFixed(4)}°N, ${entry.coords.lng.toFixed(4)}°E`,
          };
        }
      }
    }
    
    // Fallback to legacy props
    return {
      location: location || region || 'Location not set',
      coordinates: coordinates || '',
    };
  };

  const currentLocation = getCurrentLocation();
  const statusColors: Record<string, string> = {
    active: "bg-[#ac6d46]",
    completed: "bg-[#616161]",
    planned: "bg-[#4676ac]",
    cancelled: "bg-[#994040]",
  };

  const statusLabels: Record<string, string> = {
    active: "ACTIVE EXPEDITION",
    completed: "COMPLETED EXPEDITION",
    planned: "PLANNED EXPEDITION",
    cancelled: "CANCELLED EXPEDITION",
  };

  // Status-aware date stats
  const now = Date.now();
  const startMs = startDate ? new Date(startDate).getTime() : null;
  const endMs = endDate ? new Date(endDate).getTime() : null;
  const totalPlannedDays = startMs && endMs ? Math.max(1, Math.ceil((endMs - startMs) / 86400000)) : null;

  const dateStats = (() => {
    if (status === 'completed') {
      return {
        gridLabel: 'Duration:',
        gridValue: totalPlannedDays ? `${totalPlannedDays}d` : 'N/A',
        row2Left: { label: 'Duration:', value: totalPlannedDays ? `${totalPlannedDays}d` : 'N/A' },
        row2Right: null,
        progress: 100,
      };
    }
    if (status === 'active') {
      const daysActive = startMs ? Math.max(1, Math.ceil((now - startMs) / 86400000)) : 0;
      const remaining = endMs ? Math.max(0, Math.ceil((endMs - now) / 86400000)) : null;
      const total = totalPlannedDays ?? (remaining != null ? daysActive + remaining : null);
      const pct = total && total > 0 ? Math.min((daysActive / total) * 100, 100) : 0;
      return {
        gridLabel: 'Days Active:',
        gridValue: String(daysActive),
        row2Left: { label: 'Remaining:', value: remaining != null ? `${remaining}d` : '∞' },
        row2Right: { label: 'Total:', value: total ? `${total}d` : 'N/A' },
        progress: pct,
      };
    }
    // planned (or cancelled)
    const startsIn = startMs ? Math.max(0, Math.ceil((startMs - now) / 86400000)) : null;
    return {
      gridLabel: 'Starts In:',
      gridValue: startsIn != null ? `${startsIn}d` : 'TBD',
      row2Left: { label: 'Starts In:', value: startsIn != null ? `${startsIn}d` : 'TBD' },
      row2Right: { label: 'Duration:', value: totalPlannedDays ? `${totalPlannedDays}d` : 'TBD' },
      progress: 0,
    };
  })();

  const isFullyFunded = fundingPercentage >= 100;

  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col overflow-hidden h-full w-full max-w-lg">
      {/* Header: Status Bar */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 ${statusColors[status]}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {statusLabels[status]}
          </span>
          {visibility && visibility !== 'public' && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${
              visibility === 'off-grid' ? 'bg-[#6b5c4e] text-white' : 'bg-[#202020] text-white'
            }`}>
              {visibility === 'off-grid' ? <EyeOff className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {visibility === 'off-grid' ? 'OFF-GRID' : 'PRIVATE'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          <Clock className="h-3.5 w-3.5" />
          <span>{lastUpdate}</span>
        </div>
      </div>

      {/* Section: Hero Image */}
      <div className="relative h-56 overflow-hidden border-b-2 border-[#202020] dark:border-[#616161]">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-[#202020]/90 px-4 py-2.5 text-white">
          <div className="flex items-center gap-2 text-xs font-mono">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <div className="flex-1 truncate">
              <span>{currentLocation.location}</span>
              {currentLocation.coordinates && (
                <>
                  <span className="text-[#b5bcc4] mx-2">•</span>
                  <span className="text-[#b5bcc4]">{currentLocation.coordinates}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Title & Explorer */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-4 py-4 bg-white dark:bg-[#202020]">
        <h3 className="font-serif font-bold text-lg leading-tight dark:text-[#e5e5e5] mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm font-mono mb-3">
          <span className="text-[#616161] dark:text-[#b5bcc4]">Explorer: </span>
          <button
            onClick={onViewExplorer}
            className="text-[#ac6d46] hover:text-[#4676ac] dark:text-[#ac6d46] dark:hover:text-[#4676ac] transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            {explorer}
          </button>
        </p>
        <p className="text-sm font-serif text-[#202020] dark:text-[#e5e5e5] line-clamp-3" style={{ lineHeight: 1.75 }}>{description}</p>
      </div>

      {/* Section: Key Stats Grid */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs">
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">{dateStats.gridLabel}</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{dateStats.gridValue}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Distance ({distanceLabel}):</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{Math.round(distanceUnit === 'mi' ? (distance || 0) * 0.621371 : (distance || 0)).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Journal Entries:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{journalEntries || 0}</div>
          </div>
          {showSponsorshipSection && (
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Sponsors:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{backers || 0}</div>
          </div>
          )}
        </div>
      </div>

      {/* Section: Timeline — Start → [bar] → End */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-4 py-3">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="shrink-0 font-mono text-xs font-bold dark:text-[#e5e5e5]">
            {startDate ? (formatDate(startDate) || startDate) : 'TBD'}
          </div>
          <div className="flex-1">
            <Progress value={dateStats.progress} indicatorColor="bg-[#4676ac]" className="h-2 w-full" />
          </div>
          <div className="shrink-0 font-mono text-xs font-bold dark:text-[#e5e5e5]">
            {endDate ? (formatDate(endDate) || endDate) : 'Ongoing'}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 font-mono text-[10px] text-[#616161] dark:text-[#b5bcc4]">
          {dateStats.row2Left && (
            <span>{dateStats.row2Left.label} <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{dateStats.row2Left.value}</span></span>
          )}
          <span className="text-xs font-bold text-[#4676ac]">{Math.round(dateStats.progress)}%</span>
          {dateStats.row2Right && (
            <span>{dateStats.row2Right.label} <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{dateStats.row2Right.value}</span></span>
          )}
        </div>
      </div>

      {/* Section: Funding — Raised → [ring] → Goal */}
      {showSponsorshipSection ? (
        <div className={`px-4 py-3 flex-1 flex flex-col items-center justify-center ${
          isFullyFunded
            ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]'
            : 'bg-white dark:bg-[#202020]'
        }`}>
          <div className="flex items-center gap-3 mb-1 w-full">
            <div className="flex-1 font-mono text-center">
              <div className={`text-base font-bold ${
                isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'
              }`}>
                ${(fundingCurrent || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-0.5">Raised</div>
            </div>
            <div className="shrink-0">
              <RadialProgress
                value={Math.min(fundingPercentage || 0, 100)}
                size={56}
                strokeWidth={8}
                color={isFullyFunded ? '#616161' : '#ac6d46'}
                centerContent={
                  <div className={`text-xs font-bold font-mono ${
                    isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#ac6d46]'
                  }`}>
                    {(fundingPercentage || 0).toFixed(0)}%
                  </div>
                }
              />
            </div>
            <div className="flex-1 font-mono text-center">
              <div className={`text-base font-bold ${
                isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'
              }`}>
                {fundingGoal ? `$${fundingGoal.toLocaleString()}` : 'None'}
              </div>
              <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-0.5">Goal</div>
            </div>
          </div>
          <span className={`text-[10px] font-mono font-semibold tracking-wider ${
            isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#616161] dark:text-[#b5bcc4]'
          }`}>
            {isFullyFunded ? 'FUNDING COMPLETE' : 'FUNDED'}
          </span>
        </div>
      ) : (
        <div className="px-4 py-3 flex-1 flex items-center bg-white dark:bg-[#202020]">
          <div className="font-mono text-xs text-[#616161] dark:text-[#b5bcc4]">
            Self-funded expedition. Explorer is not accepting sponsorships for this journey.
          </div>
        </div>
      )}

      {/* Section: Actions */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onViewJournal}
            className="flex-1 px-4 py-2 text-xs font-bold bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap"
          >
            VIEW EXPEDITION
          </button>
          {/* Sponsor button - Visible when sponsorships available, not completed, and not own expedition */}
          {showSponsorshipSection && status !== 'completed' && user?.username !== explorer && (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
                } else {
                  onSupport?.();
                }
              }}
              className="flex-1 px-4 py-2 text-xs font-bold transition-all whitespace-nowrap active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]"
            >
              SPONSOR
            </button>
          )}
          {/* Bookmark button - Hidden when not authenticated */}
          {isAuthenticated && (
            <button
              onClick={onBookmark}
              disabled={isBookmarkLoading}
              className={`px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                isBookmarked
                  ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                  : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
              }`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              {isBookmarkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}