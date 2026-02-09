import { MapPin, FileText, Eye, User, Calendar, Bookmark } from "lucide-react";
import { formatDateWithOptionalTime } from "@/app/utils/dateFormat";

interface EntryCardLandscapeProps {
  id: string;
  title: string;
  explorerUsername: string;
  expeditionName: string;
  location: string;
  date: string;
  excerpt: string;
  type: string;
  isCurrent?: boolean;
  onClick?: () => void;
  onUnbookmark?: () => void;
}

export function EntryCardLandscape({
  title,
  explorerUsername,
  expeditionName,
  location,
  date,
  excerpt,
  type,
  isCurrent = false,
  onClick,
  onUnbookmark,
}: EntryCardLandscapeProps) {
  return (
    <div
      onClick={onClick}
      className={`border-2 bg-white dark:bg-[#202020] cursor-pointer hover:border-[#4676ac] transition-all active:scale-[0.99] ${isCurrent ? 'border-[#ac6d46] ring-2 ring-[#ac6d46]/30' : 'border-[#202020] dark:border-[#616161]'}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between border-b-2 px-3 py-1.5 ${isCurrent ? 'bg-[#ac6d46] border-[#ac6d46]' : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] border-[#202020] dark:border-[#616161]'}`}>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 ${isCurrent ? 'bg-white' : 'bg-[#4676ac]'}`} />
          <div className="flex items-baseline gap-2">
            <span className={`text-xs font-mono font-semibold tracking-wide ${isCurrent ? 'text-white' : 'text-[#202020] dark:text-[#e5e5e5]'}`}>
              {isCurrent ? 'CURRENT LOCATION' : 'ENTRY'}
            </span>
            <span className={`text-xs font-mono ${isCurrent ? 'text-white/70' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
              {type}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-mono ${isCurrent ? 'text-white/80' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
          <Calendar className="h-3 w-3" />
          <span>{formatDateWithOptionalTime(date) || date}</span>
        </div>
      </div>

      <div className="flex">
        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Title & Attribution */}
          <div className="border-b-2 border-[#202020] dark:border-[#616161] px-3 py-3 bg-white dark:bg-[#202020]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm dark:text-[#e5e5e5] mb-2 line-clamp-2">{title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                    <span className="text-[#ac6d46]">{explorerUsername}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
                    <span className="text-[#4676ac]">{expeditionName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
                    <MapPin className="w-3 h-3" />
                    <span>{location}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex-shrink-0 px-3 py-1.5 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center gap-1.5"
                >
                  <Eye className="w-3 h-3" />
                  READ
                </button>
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

          {/* Excerpt */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-3 py-2 flex-grow">
            <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed line-clamp-2">
              {excerpt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}