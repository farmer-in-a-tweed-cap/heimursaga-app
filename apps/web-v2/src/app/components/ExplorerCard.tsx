'use client';

import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { MapPin, Calendar, UserPlus, UserCheck, BookOpen, Bookmark, Loader2 } from "lucide-react";
import { ExplorerStatusBadge, ExplorerStatus } from "@/app/components/ExplorerStatusBadge";
import { useAuth } from "@/app/context/AuthContext";

interface ExplorerCardProps {
  id: string;
  username: string;
  journalName: string;
  imageUrl: string;
  location: string;
  accountType: "explorer" | "explorer-pro";
  joined: string;
  activeExpeditions: number;
  totalEntries: number;
  totalSponsored: number;
  followers: number;
  totalViews: number;
  tagline: string;
  explorerStatus?: ExplorerStatus;
  currentExpeditionTitle?: string;
  daysActive?: number;
  isFollowing?: boolean;
  isBookmarked?: boolean;
  isFollowLoading?: boolean;
  isBookmarkLoading?: boolean;
  onViewProfile?: () => void;
  onViewJournal?: () => void;
  onSupport?: () => void;
  onFollow?: () => void;
  onBookmark?: () => void;
}

export function ExplorerCard({
  username,
  journalName,
  imageUrl,
  location,
  accountType,
  joined,
  activeExpeditions,
  totalEntries,
  followers,
  totalViews,
  tagline,
  explorerStatus,
  currentExpeditionTitle,
  daysActive,
  isFollowing,
  isBookmarked,
  isFollowLoading,
  isBookmarkLoading,
  onViewJournal,
  onFollow,
  onBookmark,
}: ExplorerCardProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col h-full w-full max-w-lg">
      {/* Header: Account Type Bar */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 ${accountType === 'explorer-pro' ? 'bg-[#ac6d46]' : 'bg-[#4676ac]'}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {accountType === 'explorer-pro' ? 'EXPLORER PRO' : 'EXPLORER'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          <Calendar className="h-3.5 w-3.5" />
          <span>{joined}</span>
        </div>
      </div>

      {/* Section: Avatar & Location */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-4 py-6">
        <div className="flex flex-col items-center">
          <div className={`w-32 h-32 border-4 ${accountType === 'explorer-pro' ? 'border-[#ac6d46]' : 'border-[#616161]'} overflow-hidden bg-[#b5bcc4] mb-4`}>
            <ImageWithFallback
              src={imageUrl}
              alt={username}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>

      {/* Section: Name & Journal */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-4 py-4 bg-white dark:bg-[#202020]">
        <div className="mb-2">
          {explorerStatus && (
            <div className="mb-2">
              <ExplorerStatusBadge
                status={explorerStatus}
                size="sm"
                currentExpeditionTitle={currentExpeditionTitle}
                daysActive={daysActive}
              />
            </div>
          )}
        </div>
        <h3 className="font-bold leading-tight dark:text-[#e5e5e5] mb-1">{username}</h3>
        <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono mb-2">
          {journalName}
        </p>
        <p className="text-xs text-[#202020] dark:text-[#b5bcc4] leading-relaxed">
          {tagline}
        </p>
      </div>

      {/* Section: Key Stats Grid */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-4 flex-grow">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs">
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Active Expeditions:</div>
            <div className="font-bold text-sm text-[#ac6d46]">{activeExpeditions}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Total Entries:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{totalEntries}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Followers:</div>
            <div className="font-bold text-sm dark:text-[#e5e5e5]">{followers.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Total Views:</div>
            <div className="font-bold text-sm text-[#4676ac]">{totalViews.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Section: Actions */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onViewJournal}
            className="flex-1 px-4 py-2 text-xs font-bold bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap"
          >
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>VIEW JOURNAL</span>
            </div>
          </button>
          {/* Follow button - Hidden when not authenticated */}
          {isAuthenticated && (
            <button
              onClick={onFollow}
              disabled={isFollowLoading}
              className={`flex-1 px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap disabled:opacity-50 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                isFollowing
                  ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                  : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isFollowLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                <span>{isFollowing ? 'FOLLOWING' : 'FOLLOW'}</span>
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