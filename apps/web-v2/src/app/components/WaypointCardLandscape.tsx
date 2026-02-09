import { MapPin } from "lucide-react";
import { formatDate } from "@/app/utils/dateFormat";

interface WaypointCardLandscapeProps {
  id: string;
  title: string;
  explorerUsername: string;
  expeditionName: string;
  location: string;
  date: string;
  description?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  views: number;
  markerNumber?: number;
  isStart?: boolean;
  isEnd?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
}

export function WaypointCardLandscape({
  title,
  location,
  date,
  description,
  latitude,
  longitude,
  elevation,
  markerNumber,
  isStart = false,
  isEnd = false,
  isCurrent = false,
  onClick,
}: WaypointCardLandscapeProps) {
  // Determine marker color based on position
  const getMarkerColor = () => {
    if (isStart) return 'bg-[#ac6d46]'; // copper for start
    if (isEnd) return 'bg-[#4676ac]'; // blue for finish
    return 'bg-[#b5bcc4]'; // gray for intermediary
  };

  return (
    <div
      onClick={onClick}
      className={`border-2 bg-white dark:bg-[#202020] cursor-pointer hover:border-[#ac6d46] transition-all active:scale-[0.98] ${isCurrent ? 'border-[#ac6d46] ring-2 ring-[#ac6d46]/30' : 'border-[#202020] dark:border-[#616161]'}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between border-b-2 px-3 py-1.5 ${isCurrent ? 'bg-[#ac6d46] border-[#ac6d46]' : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] border-[#202020] dark:border-[#616161]'}`}>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 ${isCurrent ? 'bg-white' : getMarkerColor()}`} />
          <span className={`text-xs font-mono font-semibold tracking-wide ${isCurrent ? 'text-white' : 'text-[#202020] dark:text-[#e5e5e5]'}`}>
            {isCurrent ? 'CURRENT LOCATION' : 'WAYPOINT'}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-mono ${isCurrent ? 'text-white/80' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
          <span>{formatDate(date) || date}</span>
        </div>
      </div>

      <div className="flex">
        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Title & Attribution */}
          <div className="border-b-2 border-[#202020] dark:border-[#616161] px-3 py-2.5 bg-white dark:bg-[#202020]">
            <div className="flex items-center gap-3">
              {markerNumber !== undefined && (
                <div className={`${getMarkerColor()} w-8 h-8 rounded-full border-2 border-[#202020] dark:border-[#616161] flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold text-sm">{markerNumber}</span>
                </div>
              )}
              <h3 className="font-bold text-sm dark:text-[#e5e5e5]">{title}</h3>
            </div>
          </div>

          {/* Description */}
          {description && (
            <div className="border-b-2 border-[#202020] dark:border-[#616161] px-3 py-2.5 bg-white dark:bg-[#202020]">
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">{description}</p>
            </div>
          )}

          {/* Location Data */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-3 py-2.5">
            {location && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-2">
                <MapPin className="w-3 h-3" />
                <span className="dark:text-[#e5e5e5]">{location}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Coordinates:</span>
                <div className="text-xs dark:text-[#e5e5e5] mt-0.5">
                  {latitude.toFixed(6)}°, {longitude.toFixed(6)}°
                </div>
              </div>
              {elevation !== undefined && (
                <div>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Elevation:</span>
                  <div className="text-xs dark:text-[#e5e5e5] mt-0.5">
                    {elevation.toLocaleString()}m
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}