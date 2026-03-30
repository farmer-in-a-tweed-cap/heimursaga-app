'use client';

import { useState, useRef, useEffect } from 'react';

interface ShareButtonProps {
  className?: string;
  label?: string;
  onShare?: () => void;
  dropdownDirection?: 'down' | 'up';
}

export function ShareButton({ className, label = 'SHARE', onShare, dropdownDirection = 'down' }: ShareButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const url = typeof window !== 'undefined'
    ? window.location.origin + window.location.pathname
    : '';

  // Use native share on mobile (touch devices), dropdown on desktop
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const handleClick = async () => {
    // Mobile: always use native share sheet, never show dropdown
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        onShare?.();
      } catch {
        // User cancelled — do nothing
      }
      return;
    }
    // Desktop: toggle dropdown
    setMenuOpen(!menuOpen);
    onShare?.();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setMenuOpen(false);
  };

  const menuButtonClass = 'w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#616161] border border-transparent hover:border-[#202020] dark:hover:border-[#616161] dark:text-[#e5e5e5] flex items-center gap-2';

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={handleClick} className={className}>
        {label}
      </button>

      {menuOpen && (
        <div className={`absolute left-0 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-lg z-50 min-w-[200px] max-w-[calc(100vw-2rem)] ${dropdownDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <div className="border-b-2 border-[#202020] dark:border-[#616161] p-2 bg-[#616161] text-white">
            <div className="text-xs font-bold font-mono">SHARE OPTIONS:</div>
          </div>
          <div className="p-2 space-y-1">
            <button onClick={copyLink} className={menuButtonClass}>
              COPY LINK
            </button>
            <button
              onClick={() => {
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank');
                setMenuOpen(false);
              }}
              className={menuButtonClass}
            >
              SHARE ON X/TWITTER
            </button>
            <button
              onClick={() => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                setMenuOpen(false);
              }}
              className={menuButtonClass}
            >
              SHARE ON FACEBOOK
            </button>
            <button
              onClick={() => {
                window.open(`mailto:?subject=Check this out&body=${encodeURIComponent(url)}`, '_blank');
                setMenuOpen(false);
              }}
              className={menuButtonClass}
            >
              SHARE VIA EMAIL
            </button>
            <button
              onClick={() => setMenuOpen(false)}
              className={`${menuButtonClass} !text-[#616161] dark:!text-[#b5bcc4]`}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
