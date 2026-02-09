import { MapPin, User } from "lucide-react";
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

interface ExpeditionCardPortraitProps {
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
  onClick?: () => void;
}

export function ExpeditionCardPortrait({
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
  onClick,
}: ExpeditionCardPortraitProps) {
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
      className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] cursor-pointer hover:border-[#ac6d46] transition-all active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 ${statusColors[status]}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Image */}
      <div className="relative h-32 overflow-hidden bg-[#b5bcc4] border-b-2 border-[#202020] dark:border-[#616161]">
        <ImageWithFallback
          src={imageUrl}
          alt={title}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-3 py-3 bg-white dark:bg-[#202020]">
        <h3 className="font-bold text-sm dark:text-[#e5e5e5] mb-2 line-clamp-2 min-h-[2.5rem]">{title}</h3>
        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <User className="w-3 h-3" />
            <span className="truncate text-[#ac6d46]">{explorerUsername}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{currentLocation}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-3 py-3">
        <div className="grid grid-cols-2 gap-2 font-mono text-xs">
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Days Elapsed</div>
            <div className="font-bold text-xs dark:text-[#e5e5e5]">{daysElapsed}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Entries</div>
            <div className="font-bold text-xs dark:text-[#e5e5e5]">{journalEntries}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Funding</div>
            <div className="font-bold text-xs text-[#ac6d46]">{fundingPercentage}%</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Backers</div>
            <div className="font-bold text-xs dark:text-[#e5e5e5]">{backers}</div>
          </div>
        </div>
      </div>
    </div>
  );
}