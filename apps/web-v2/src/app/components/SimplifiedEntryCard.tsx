import Link from 'next/link';
import { MapPin, FileText } from 'lucide-react';
import { formatDateWithOptionalTime } from '@/app/utils/dateFormat';

interface SimplifiedEntryCardProps {
  id: string;
  title: string;
  date: string;
  location: string;
  coords: { lat: number; lng: number };
  excerpt: string;
  type: string;
  mediaCount: number;
  views: number;
  visibility: string;
  onMapClick?: () => void;
}

export function SimplifiedEntryCard({
  id,
  title,
  date,
  location,
  coords,
  excerpt,
  type,
  mediaCount,
  views,
  visibility,
  onMapClick,
}: SimplifiedEntryCardProps) {
  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col md:flex-row hover:border-[#ac6d46] transition-all active:scale-[0.99]">
      {/* Left Section: Type, Date, Visibility Badges */}
      <div className="flex items-center gap-2 border-b md:border-b-0 md:border-r border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-3">
        <div className="flex flex-col gap-2">
          <span className="text-xs bg-[#616161] dark:bg-[#202020] text-white px-2 py-1 font-mono font-semibold whitespace-nowrap">
            {type.toUpperCase()}
          </span>
          <span className="text-xs text-[#202020] dark:text-[#e5e5e5] font-mono whitespace-nowrap">
            {formatDateWithOptionalTime(date) || date}
          </span>
          <span className="text-xs bg-[#4676ac] text-white px-2 py-1 font-mono font-semibold whitespace-nowrap">
            {visibility.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Right Section: Content */}
      <div className="flex-1 flex flex-col">
        {/* Title + Location */}
        <div className="border-b border-[#202020] dark:border-[#616161] px-4 py-3">
          <h3 className="font-bold leading-tight mb-2 dark:text-[#e5e5e5]">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {location} • {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
            </span>
          </div>
        </div>

        {/* Excerpt */}
        <div className="px-4 py-3 flex-1 border-b border-[#202020] dark:border-[#616161]">
          <p className="text-sm dark:text-[#e5e5e5] leading-relaxed">{excerpt}</p>
        </div>

        {/* Stats + Actions Combined */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] gap-3">
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-[#616161] dark:text-[#b5bcc4]">{views} views</span>
            <span className="text-[#616161] dark:text-[#b5bcc4]">{mediaCount} media</span>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/entry/${id}`}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] text-xs font-bold whitespace-nowrap"
            >
              <FileText className="h-4 w-4" strokeWidth={2} />
              <span>VIEW ENTRY</span>
            </Link>
            <button
              onClick={onMapClick}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] text-xs font-bold whitespace-nowrap"
            >
              <MapPin className="h-4 w-4" strokeWidth={2} />
              <span>MAP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
