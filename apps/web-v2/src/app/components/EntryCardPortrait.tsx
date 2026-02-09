import { MapPin, FileText, User, Calendar } from "lucide-react";
import { formatDateWithOptionalTime } from "@/app/utils/dateFormat";

interface EntryCardPortraitProps {
  id: string;
  title: string;
  explorerUsername: string;
  expeditionName: string;
  location: string;
  date: string;
  excerpt: string;
  views: number;
  wordCount: number;
  mediaCount: number;
  type: string;
  onClick?: () => void;
}

export function EntryCardPortrait({
  title,
  explorerUsername,
  expeditionName,
  location,
  date,
  excerpt,
  views,
  wordCount,
  mediaCount,
  type,
  onClick,
}: EntryCardPortraitProps) {
  return (
    <div 
      onClick={onClick}
      className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] cursor-pointer hover:border-[#4676ac] transition-all active:scale-[0.98] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-[#4676ac]" />
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
              ENTRY
            </span>
            <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] truncate max-w-[100px]">
              {type}
            </span>
          </div>
        </div>
      </div>

      {/* Title & Attribution */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-3 py-3 bg-white dark:bg-[#202020]">
        <h3 className="font-bold text-sm dark:text-[#e5e5e5] mb-2 line-clamp-2 min-h-[2.5rem]">{title}</h3>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
            <span className="truncate text-[#ac6d46]">{explorerUsername}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4]" />
            <span className="truncate text-[#4676ac]">{expeditionName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <Calendar className="w-3 h-3" />
            <span>{formatDateWithOptionalTime(date) || date}</span>
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] px-3 py-3 flex-grow">
        <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed line-clamp-3">
          {excerpt}
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-[#202020] px-3 py-3">
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <div className="text-center">
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Views</div>
            <div className="font-bold text-xs text-[#4676ac]">{views.toLocaleString()}</div>
          </div>
          <div className="text-center border-l border-r border-[#202020] dark:border-[#616161]">
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Words</div>
            <div className="font-bold text-xs dark:text-[#e5e5e5]">{wordCount.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Media</div>
            <div className="font-bold text-xs dark:text-[#e5e5e5]">{mediaCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}