'use client';

import { MapPin, FileText, User, Bookmark, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { formatDate } from "@/app/utils/dateFormat";

interface EntryCardProps {
  id: string;
  title: string;
  explorerUsername: string;
  expeditionName: string;
  location: string;
  date: string;
  excerpt: string;
  mediaCount: number;
  views: number;
  wordCount: number;
  type: string;
  coverImageUrl?: string;
  isBookmarked?: boolean;
  isBookmarkLoading?: boolean;
  onReadEntry?: () => void;
  onViewExpedition?: () => void;
  onBookmark?: () => void;
  onViewExplorer?: () => void;
}

export function EntryCard({
  title,
  explorerUsername,
  expeditionName,
  location,
  date,
  excerpt,
  wordCount,
  type,
  coverImageUrl,
  isBookmarked = false,
  isBookmarkLoading = false,
  onReadEntry,
  onViewExpedition,
  onBookmark,
  onViewExplorer,
}: EntryCardProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col overflow-hidden h-full w-full max-w-lg">
      {/* Header: Status Bar */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 bg-[#4676ac]" />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            JOURNAL ENTRY
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          <Calendar className="h-3.5 w-3.5" />
          <span className="whitespace-nowrap">{formatDate(date) || date}</span>
        </div>
      </div>

      {/* Section: Featured Excerpt - Quote Style */}
      <div className="relative border-b-2 border-[#202020] dark:border-[#616161] flex-grow">
        {/* Background image layer */}
        {coverImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImageUrl})` }}
          />
        )}
        {/* Overlay - solid when no image, semi-transparent when image exists */}
        <div className={`absolute inset-0 ${coverImageUrl ? 'bg-[#f8f7f5]/80 dark:bg-[#1a1a1a]/80' : 'bg-[#f8f7f5] dark:bg-[#1a1a1a]'}`} />

        {/* Content */}
        <div className="relative px-6 py-6">
          {/* Large decorative quote mark */}
          <div className="absolute top-3 left-4 text-6xl font-serif text-[#4676ac]/20 dark:text-[#4676ac]/30 leading-none select-none" aria-hidden="true">
            "
          </div>

          <div className="relative pt-6">
            <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed italic font-serif min-h-[4.5rem]">
              {excerpt.substring(0, 180)}{excerpt.length > 180 ? '...' : ''}
            </p>
          </div>

        </div>
      </div>

      {/* Section: Title */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-5 py-4 bg-white dark:bg-[#202020]">
        <h3 className="font-bold text-lg leading-tight dark:text-[#e5e5e5] line-clamp-2">{title}</h3>
      </div>

      {/* Section: Attribution */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-5 py-3 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 flex-shrink-0 text-[#616161] dark:text-[#b5bcc4]" />
            <span className="text-[#616161] dark:text-[#b5bcc4]">by</span>
            <button
              onClick={onViewExplorer}
              className="text-xs font-mono text-[#ac6d46] hover:text-[#4676ac] dark:text-[#ac6d46] dark:hover:text-[#4676ac] transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
            >
              {explorerUsername}
            </button>
          </div>
          {expeditionName && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-[#616161] dark:text-[#b5bcc4]" />
              <button
                onClick={onViewExpedition}
                className="text-xs font-mono text-[#4676ac] hover:text-[#ac6d46] dark:text-[#4676ac] dark:hover:text-[#ac6d46] transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#4676ac] truncate"
              >
                {expeditionName}
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Section: Meta Info */}
      <div className="bg-white dark:bg-[#202020] px-5 py-3">
        <div className="flex items-center justify-between text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          <span>{wordCount.toLocaleString()} words</span>
          <span className="uppercase tracking-wide">{type}</span>
        </div>
      </div>

      {/* Section: Actions */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onReadEntry}
            className="flex-1 px-4 py-2 text-xs font-bold bg-[#4676ac] text-white hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap"
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              <span>VIEW ENTRY</span>
            </div>
          </button>
          {/* Bookmark button - Hidden when not authenticated */}
          {isAuthenticated && (
            <button
              onClick={onBookmark}
              disabled={isBookmarkLoading}
              className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
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
