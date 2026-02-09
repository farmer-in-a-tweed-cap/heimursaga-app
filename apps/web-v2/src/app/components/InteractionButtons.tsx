'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Share2, Link as LinkIcon, Mail, X, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

interface InteractionButtonsProps {
  type: 'entry' | 'expedition' | 'journal';
  itemId: string;
  expeditionId?: string;
  expeditionStatus?: string;
  sponsorshipsEnabled?: boolean;
  explorerIsPro?: boolean;
  initialBookmarks?: number;
  isBookmarked?: boolean;
  isBookmarkLoading?: boolean;
  onBookmark?: () => void;
  onShare?: () => void;
  onSponsor?: () => void;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showCounts?: boolean;
}

export function InteractionButtons({
  type,
  expeditionId,
  expeditionStatus,
  sponsorshipsEnabled = true,
  explorerIsPro = false,
  initialBookmarks = 0,
  isBookmarked = false,
  isBookmarkLoading = false,
  onBookmark,
  onShare,
  onSponsor,
  size = 'md',
  layout = 'horizontal',
  showLabels = true,
}: InteractionButtonsProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 14,
      gap: 'gap-1',
    },
    md: {
      button: 'px-3 py-2 text-sm',
      icon: 16,
      gap: 'gap-2',
    },
    lg: {
      button: 'px-4 py-3 text-base',
      icon: 18,
      gap: 'gap-2',
    },
  };

  const config = sizeConfig[size];

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    onBookmark?.();
  };
  
  const handleSponsor = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    onSponsor?.();
  };

  const showSponsorButton = explorerIsPro && sponsorshipsEnabled && expeditionStatus !== 'completed';

  const handleShare = () => {
    setShareMenuOpen(!shareMenuOpen);
    onShare?.();
  };

  const copyLink = () => {
    const url = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(url);
    // You could add a toast notification here instead of alert
    setShareMenuOpen(false);
  };

  const containerClass = layout === 'horizontal' 
    ? `flex ${config.gap} items-center flex-wrap`
    : `flex flex-col ${config.gap}`;

  return (
    <div className={containerClass}>
      {/* Bookmark Button (All Types) - Hidden if not authenticated */}
      {isAuthenticated && (
        <button
          onClick={handleBookmark}
          disabled={isBookmarkLoading}
          className={`${config.button} border-2 font-bold font-mono transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:active:scale-100 ${config.gap} flex items-center ${
            bookmarked
              ? 'bg-[#4676ac] text-white border-[#4676ac] hover:bg-[#365a87] hover:border-[#365a87] focus-visible:ring-[#4676ac]'
              : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-[#202020] dark:border-[#616161] hover:border-[#8a5738] hover:bg-[#8a5738] hover:text-white focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161]'
          }`}
        >
          {isBookmarkLoading ? (
            <Loader2 size={config.icon} className="animate-spin" />
          ) : (
            <Bookmark
              size={config.icon}
              fill={bookmarked ? 'currentColor' : 'none'}
              strokeWidth={2}
            />
          )}
          {showLabels && <span>BOOKMARK</span>}
        </button>
      )}

      {/* Sponsor Button (Entries Only, when expeditionId is provided) */}
      {type === 'entry' && expeditionId && onSponsor && showSponsorButton && (
        <button
          onClick={handleSponsor}
          className={`${config.button} border-2 font-bold font-mono transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] ${config.gap} flex items-center bg-[#ac6d46] text-white border-[#ac6d46] hover:bg-[#8a5738] hover:border-[#8a5738]`}
        >
          <Users size={config.icon} strokeWidth={2} />
          {showLabels && <span>SPONSOR</span>}
        </button>
      )}

      {/* Share Button (Entries Only) - Always visible (public action) */}
      {type === 'entry' && (
        <div className="relative">
          <button
            onClick={handleShare}
            className={`${config.button} border-2 font-bold font-mono transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] ${config.gap} flex items-center bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-[#202020] dark:border-[#616161] hover:border-[#0a0a0a] hover:bg-[#0a0a0a] dark:hover:border-[#4a4a4a] dark:hover:bg-[#4a4a4a] hover:text-white`}
          >
            <Share2 size={config.icon} strokeWidth={2} />
            {showLabels && <span>SHARE</span>}
          </button>

          {/* Share Menu */}
          {shareMenuOpen && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-lg z-50 min-w-[200px]">
              <div className="border-b-2 border-[#202020] dark:border-[#616161] p-2 bg-[#616161] text-white">
                <div className="text-xs font-bold font-mono">SHARE OPTIONS:</div>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={copyLink}
                  className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#616161] border border-transparent hover:border-[#202020] dark:hover:border-[#616161] dark:text-[#e5e5e5] flex items-center gap-2"
                >
                  <LinkIcon size={14} /> COPY LINK
                </button>
                <button
                  onClick={() => {
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`, '_blank');
                    setShareMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#616161] border border-transparent hover:border-[#202020] dark:hover:border-[#616161] dark:text-[#e5e5e5] flex items-center gap-2"
                >
                  <X size={14} /> SHARE ON X/TWITTER
                </button>
                <button
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
                    setShareMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#616161] border border-transparent hover:border-[#202020] dark:hover:border-[#616161] dark:text-[#e5e5e5] flex items-center gap-2"
                >
                  <Share2 size={14} /> SHARE ON FACEBOOK
                </button>
                <button
                  onClick={() => {
                    window.open(`mailto:?subject=Check this out&body=${encodeURIComponent(window.location.href)}`, '_blank');
                    setShareMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#616161] border border-transparent hover:border-[#202020] dark:hover:border-[#616161] dark:text-[#e5e5e5] flex items-center gap-2"
                >
                  <Mail size={14} /> SHARE VIA EMAIL
                </button>
                <button
                  onClick={() => setShareMenuOpen(false)}
                  className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#616161] border border-transparent hover:border-[#202020] dark:hover:border-[#616161] text-[#616161] dark:text-[#b5bcc4] flex items-center gap-2"
                >
                  <X size={14} /> CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sponsor Button (Expeditions Only) */}
      {type === 'expedition' && showSponsorButton && onSponsor && (
        <button
          onClick={handleSponsor}
          className={`${config.button} border-2 font-bold font-mono transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] ${config.gap} flex items-center bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-[#202020] dark:border-[#616161] hover:border-[#0a0a0a] hover:bg-[#0a0a0a] dark:hover:border-[#4a4a4a] dark:hover:bg-[#4a4a4a] hover:text-white`}
        >
          <Users size={config.icon} strokeWidth={2} />
          {showLabels && <span>SPONSOR</span>}
        </button>
      )}
    </div>
  );
}