'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { ShareButton } from '@/app/components/ShareButton';

interface InteractionButtonsProps {
  type: 'entry' | 'expedition' | 'journal';
  itemId: string;
  expeditionId?: string;
  expeditionStatus?: string;
  sponsorshipsEnabled?: boolean;
  explorerIsPro?: boolean;
  stripeConnected?: boolean;
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
  stripeConnected = false,
  initialBookmarks: _initialBookmarks = 0,
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

  // Sync local bookmark state when the prop changes (e.g., after API refetch)
  useEffect(() => { setBookmarked(isBookmarked); }, [isBookmarked]);

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'px-2 py-1.5 text-xs min-h-[44px] min-w-[44px]',
      icon: 14,
      gap: 'gap-1',
    },
    md: {
      button: 'px-3 py-2 text-sm min-h-[44px] min-w-[44px]',
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
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    onSponsor?.();
  };

  const showSponsorButton = sponsorshipsEnabled && expeditionStatus !== 'completed' && expeditionStatus !== 'cancelled';

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
              : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-[#202020] dark:border-[#616161] hover:border-[#4a4a4a] hover:bg-[#616161] hover:text-white focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161]'
          }`}
        >
          {isBookmarkLoading ? (
            <Loader2 size={config.icon} className="animate-spin" />
          ) : null}
          {showLabels && <span>{bookmarked ? 'BOOKMARKED' : 'BOOKMARK'}</span>}
        </button>
      )}

      {/* Sponsor Button (Entries Only, when expeditionId is provided) */}
      {type === 'entry' && expeditionId && onSponsor && showSponsorButton && (
        <button
          onClick={handleSponsor}
          className={`${config.button} border-2 font-bold font-mono transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] ${config.gap} flex items-center bg-[#ac6d46] text-white border-[#ac6d46] hover:bg-[#8a5738] hover:border-[#8a5738]`}
        >
          {showLabels && <span>SPONSOR EXPEDITION</span>}
        </button>
      )}

      {/* Share Button (Entries Only) - Always visible (public action) */}
      {type === 'entry' && (
        <ShareButton
          className={`${config.button} border-2 font-bold font-mono transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] ${config.gap} flex items-center bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-[#202020] dark:border-[#616161] hover:border-[#0a0a0a] hover:bg-[#0a0a0a] dark:hover:border-[#4a4a4a] dark:hover:bg-[#4a4a4a] hover:text-white`}
          onShare={onShare}
        />
      )}

      {/* Sponsor Button (Expeditions Only) */}
      {type === 'expedition' && showSponsorButton && onSponsor && (
        <button
          onClick={handleSponsor}
          className={`${config.button} border-2 font-bold font-mono transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] ${config.gap} flex items-center bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-[#202020] dark:border-[#616161] hover:border-[#0a0a0a] hover:bg-[#0a0a0a] dark:hover:border-[#4a4a4a] dark:hover:bg-[#4a4a4a] hover:text-white`}
        >
          {showLabels && <span>SPONSOR EXPEDITION</span>}
        </button>
      )}
    </div>
  );
}