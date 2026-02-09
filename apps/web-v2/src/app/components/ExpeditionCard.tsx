'use client';

import { MapPin, FileText, DollarSign, Bookmark, Clock, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { RadialProgress } from "@/app/components/ui/radial-progress";
import { Progress } from "@/app/components/ui/progress";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { useAuth } from "@/app/context/AuthContext";
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
  type: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
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
  daysElapsed: number;
  daysRemaining: number | null;
  journalEntries: number;
  lastUpdate: string;
  fundingGoal: number;
  fundingCurrent: number;
  fundingPercentage: number;
  backers: number;
  distance: number;
  status: "active" | "completed" | "planned";
  terrain: string;
  averageSpeed: number;
  sponsorshipsEnabled?: boolean;
  /** Whether the expedition creator has an Explorer Pro account (required for sponsorships) */
  explorerIsPro?: boolean;
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
  daysElapsed,
  daysRemaining,
  journalEntries,
  lastUpdate,
  fundingGoal,
  fundingCurrent,
  fundingPercentage,
  backers,
  distance,
  status,
  sponsorshipsEnabled = true,
  explorerIsPro = false,
  isBookmarked = false,
  isBookmarkLoading = false,
  onViewJournal,
  onSupport,
  onBookmark,
  onViewExplorer,
}: ExpeditionCardProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Sponsorship UI only shows if explorer is Pro AND sponsorships are enabled for this expedition
  const showSponsorshipSection = explorerIsPro && sponsorshipsEnabled;

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
      location: location || 'Location not set',
      coordinates: coordinates || '',
    };
  };

  const currentLocation = getCurrentLocation();
  const statusColors = {
    active: "bg-[#ac6d46]",
    completed: "bg-[#616161]",
    planned: "bg-[#4676ac]",
  };

  const statusLabels = {
    active: "ACTIVE EXPEDITION",
    completed: "COMPLETED EXPEDITION",
    planned: "PLANNED EXPEDITION",
  };

  // Calculate timeline progress
  const totalDays = daysElapsed + (daysRemaining || 0);
  const timelinePercentage = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;

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
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          <Clock className="h-3.5 w-3.5" />
          <span>{lastUpdate}</span>
        </div>
      </div>

      {/* Section: Hero Image */}
      <div className="relative h-56 overflow-hidden bg-gray-200 border-b-2 border-[#202020] dark:border-[#616161]">
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
        <h3 className="font-bold leading-tight dark:text-[#e5e5e5] mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm font-mono mb-3">
          <span className="text-[#616161] dark:text-[#b5bcc4]">Explorer: </span>
          <button
            onClick={onViewExplorer}
            className="text-[#ac6d46] hover:text-[#4676ac] dark:text-[#ac6d46] dark:hover:text-[#4676ac] transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            {explorer}
          </button>
        </p>
        <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed line-clamp-3">{description}</p>
      </div>

      {/* Section: Key Stats Grid */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs">
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Days Elapsed:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{daysElapsed || 0}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Distance (km):</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{(distance || 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Journal Entries:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{journalEntries || 0}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Sponsors:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{backers || 0}</div>
          </div>
        </div>
      </div>

      {/* Section: Timeline Progress */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs">
            <div>
              <div className="text-[#616161] dark:text-[#b5bcc4]">Start:</div>
              <div className="font-bold text-sm dark:text-[#e5e5e5]">{formatDate(startDate) || startDate}</div>
            </div>
            <div>
              <div className="text-[#616161] dark:text-[#b5bcc4]">End:</div>
              <div className="font-bold text-sm dark:text-[#e5e5e5]">{endDate ? formatDate(endDate) || endDate : "Ongoing"}</div>
            </div>
            <div>
              <div className="text-[#616161] dark:text-[#b5bcc4]">Remaining:</div>
              <div className="font-bold text-sm dark:text-[#e5e5e5]">{daysRemaining !== null ? `${daysRemaining}d` : "∞"}</div>
            </div>
            <div>
              <div className="text-[#616161] dark:text-[#b5bcc4]">Total:</div>
              <div className="font-bold text-sm dark:text-[#e5e5e5]">{totalDays > 0 ? `${totalDays}d` : "N/A"}</div>
            </div>
          </div>
          <div>
            <RadialProgress 
              value={timelinePercentage} 
              size={85}
              strokeWidth={7}
              centerContent={
                <div className="text-center">
                  <div className="text-lg font-bold font-mono text-[#4676ac]">
                    {Math.round(timelinePercentage)}%
                  </div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                    Progress
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* Section: Funding Progress OR Expedition Details */}
      {showSponsorshipSection ? (
        <div className={`px-4 py-4 ${
          isFullyFunded 
            ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]' 
            : 'bg-white dark:bg-[#202020]'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${
                isFullyFunded 
                  ? 'text-[#616161] dark:text-[#b5bcc4]' 
                  : 'text-[#202020] dark:text-[#e5e5e5]'
              }`} />
              <span className={`text-xs font-semibold font-mono ${
                isFullyFunded 
                  ? 'text-[#616161] dark:text-[#b5bcc4]' 
                  : 'dark:text-[#e5e5e5]'
              }`}>
                {isFullyFunded ? 'FUNDING COMPLETE' : 'FUNDING'}
              </span>
            </div>
            <span className={`font-mono text-sm font-bold ${
              isFullyFunded 
                ? 'text-[#616161] dark:text-[#b5bcc4]' 
                : 'text-[#ac6d46]'
            }`}>
              {fundingPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={fundingPercentage} 
            className={`mb-3 h-2.5 ${isFullyFunded ? 'opacity-50' : ''}`}
          />
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="text-[#616161] dark:text-[#b5bcc4]">
              ${(fundingCurrent || 0).toLocaleString()} / ${(fundingGoal || 0).toLocaleString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 bg-white dark:bg-[#202020]">
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
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              <span>VIEW EXPEDITION</span>
            </div>
          </button>
          {/* Sponsor button - Visible when sponsorships available and not completed */}
          {showSponsorshipSection && status !== 'completed' && (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                } else {
                  onSupport?.();
                }
              }}
              className="flex-1 px-4 py-2 text-xs font-bold transition-all whitespace-nowrap active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]"
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">SPONSOR</span>
              </div>
            </button>
          )}
          {/* Bookmark button - Hidden when not authenticated */}
          {isAuthenticated && (
            <button
              onClick={onBookmark}
              disabled={isBookmarkLoading}
              className={`px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                isBookmarked
                  ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738] focus-visible:ring-[#ac6d46]'
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