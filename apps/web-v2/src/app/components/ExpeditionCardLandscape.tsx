import { MapPin, FileText, Clock, User, TrendingUp, Bookmark } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

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

interface ExpeditionCardLandscapeProps {
  id: string;
  title: string;
  explorerUsername: string;
  imageUrl: string;
  location?: string; // Deprecated
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  waypoints?: Waypoint[];
  journalEntriesData?: JournalEntry[];
  status: "active" | "completed" | "planned" | "paused";
  daysElapsed: number;
  journalEntries: number;
  fundingPercentage: number;
  backers: number;
  /** Whether sponsorships are enabled for this expedition */
  sponsorshipsEnabled?: boolean;
  /** Whether the expedition creator has an Explorer Pro account */
  explorerIsPro?: boolean;
  onClick?: () => void;
  onUnbookmark?: () => void;
}

export function ExpeditionCardLandscape({
  title,
  explorerUsername,
  imageUrl,
  location,
  currentLocationSource,
  currentLocationId,
  waypoints = [],
  journalEntriesData = [],
  status,
  daysElapsed,
  journalEntries,
  fundingPercentage,
  backers,
  sponsorshipsEnabled = false,
  explorerIsPro = false,
  onClick,
  onUnbookmark,
}: ExpeditionCardLandscapeProps) {
  // Only show sponsorship stats if explorer is Pro and sponsorships are enabled
  const showSponsorshipStats = explorerIsPro && sponsorshipsEnabled;
  // Helper to get current location from waypoints/entries
  const getCurrentLocation = () => {
    if (currentLocationSource && currentLocationId) {
      if (currentLocationSource === 'waypoint') {
        const waypoint = waypoints.find(w => w.id === currentLocationId);
        if (waypoint) return waypoint.location;
      } else {
        const entry = journalEntriesData.find(e => e.id === currentLocationId);
        if (entry) return entry.location;
      }
    }
    return location || 'Location not set';
  };

  const currentLocation = getCurrentLocation();
  const statusColors = {
    active: "bg-[#ac6d46]",
    completed: "bg-[#616161]",
    planned: "bg-[#4676ac]",
    paused: "bg-[#b5bcc4]",
  };

  const statusLabels = {
    active: "ACTIVE EXPEDITION",
    completed: "COMPLETED EXPEDITION",
    planned: "PLANNED EXPEDITION",
    paused: "PAUSED EXPEDITION",
  };

  return (
    <div 
      onClick={onClick}
      className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] cursor-pointer hover:border-[#ac6d46] transition-all active:scale-[0.99]"
    >
      {/* Full-width header banner */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 ${statusColors[status]}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {statusLabels[status]}
          </span>
        </div>
      </div>

      <div className="flex">
        {/* Image */}
        <div className="w-40 h-28 flex-shrink-0 border-r-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] overflow-hidden">
          <ImageWithFallback
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            style={{ objectFit: 'cover' }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Info */}
          <div className="px-3 py-2 flex-1 border-b-2 border-[#202020] dark:border-[#616161]">
            <h3 className="font-bold text-sm dark:text-[#e5e5e5] mb-2 line-clamp-2">{title}</h3>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                <span className="truncate text-[#ac6d46]">{explorerUsername}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{currentLocation}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 font-mono text-xs">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                  <span className="dark:text-[#e5e5e5] font-bold">{daysElapsed}</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">days</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                  <span className="dark:text-[#e5e5e5] font-bold">{journalEntries}</span>
                </div>
                {showSponsorshipStats && (
                  <>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                      <span className="text-[#ac6d46] font-bold">{fundingPercentage}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                      <span className="dark:text-[#e5e5e5] font-bold">{backers}</span>
                    </div>
                  </>
                )}
              </div>
              {onUnbookmark && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnbookmark();
                  }}
                  className="flex-shrink-0 px-3 py-1.5 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center gap-1.5"
                  title="Remove bookmark"
                >
                  <Bookmark className="w-3 h-3" fill="currentColor" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}