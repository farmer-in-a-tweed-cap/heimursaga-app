'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Award, Copy, Share2, Check, X, Download, Loader2 } from 'lucide-react';
import { CountryFlag } from '@/app/components/CountryFlag';
import { ContinentIcon } from '@/app/components/ContinentIcon';

type AchievementType = 'passport_country' | 'passport_continent' | 'passport_stamp';

interface ShareAchievementModalProps {
  open: boolean;
  onClose: () => void;
  type: AchievementType;
  achievementName: string;
  username: string;
  /** Date of first entry or achievement earned */
  date?: string;
  /** Description of the achievement (for stamps) or context */
  description?: string;
  countryCode?: string;
  continentCode?: string;
  /** Path to stamp SVG image */
  stampImage?: string;
}

export function ShareAchievementModal({
  open,
  onClose,
  type,
  achievementName,
  username,
  date,
  description,
  countryCode,
  continentCode,
  stampImage,
}: ShareAchievementModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getVisual = () => {
    switch (type) {
      case 'passport_country':
        return countryCode ? (
          <CountryFlag code={countryCode} className="w-16 h-auto" title={achievementName} />
        ) : (
          <div className="w-16 h-10 bg-[#3a3a3a] flex items-center justify-center text-[#616161] text-xs font-mono">
            {achievementName.slice(0, 2).toUpperCase()}
          </div>
        );
      case 'passport_continent':
        return continentCode ? (
          <ContinentIcon code={continentCode} className="w-20 h-auto opacity-90" title={achievementName} />
        ) : (
          <div className="w-16 h-16 bg-[#3a3a3a] rounded-full flex items-center justify-center text-[#616161] text-xs font-mono">
            {achievementName.slice(0, 2).toUpperCase()}
          </div>
        );
      case 'passport_stamp':
        return stampImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={stampImage} alt={achievementName} className="w-20 h-20 object-contain" />
        ) : (
          <Award className="w-16 h-16 text-[#ac6d46]" />
        );
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'passport_country':
        return 'NEW COUNTRY VISITED';
      case 'passport_continent':
        return 'NEW CONTINENT EXPLORED';
      case 'passport_stamp':
        return 'ACHIEVEMENT UNLOCKED';
    }
  };

  const getSubtitle = () => {
    switch (type) {
      case 'passport_country':
        return 'Added to passport';
      case 'passport_continent':
        return 'Continent explored';
      case 'passport_stamp':
        return 'Stamp earned';
    }
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/journal/${username}`
    : `https://heimursaga.com/journal/${username}`;

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#202020',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
      });

      const link = document.createElement('a');
      link.download = `heimursaga-${type}-${achievementName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;

    // Try to share the image if possible, otherwise share the link
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#202020',
          scale: 2,
          useCORS: true,
          allowTaint: true,
        });

        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `heimursaga-achievement.png`, { type: 'image/png' });

            // Check if sharing files is supported
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `${username} - ${getTitle()}`,
                text: `${username} just ${type === 'passport_country' ? 'visited' : type === 'passport_continent' ? 'explored' : 'earned'} ${achievementName} on Heimursaga!`,
              });
              return;
            }
          }

          // Fallback to sharing URL
          await navigator.share({
            title: `${username} - ${getTitle()}`,
            text: `${username} just ${type === 'passport_country' ? 'visited' : type === 'passport_continent' ? 'explored' : 'earned'} ${achievementName} on Heimursaga!`,
            url: shareUrl,
          });
        }, 'image/png');
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-0 gap-0">
        {/* Header */}
        <div className="bg-[#202020] px-6 py-4 border-b-[3px] border-[#ac6d46] flex items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold tracking-wide">
              SHARE ACHIEVEMENT
            </DialogTitle>
          </DialogHeader>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3a3a3a] rounded transition-colors"
          >
            <X className="w-5 h-5 text-[#b5bcc4]" />
          </button>
        </div>

        {/* Achievement Card Preview */}
        <div className="p-6">
          <div
            ref={cardRef}
            className="bg-gradient-to-br from-[#202020] to-[#2a2a2a] border-2 border-[#ac6d46] p-6 relative overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(172, 109, 70, 0.3) 10px,
                  rgba(172, 109, 70, 0.3) 11px
                )`
              }} />
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Type Label */}
              <div className="text-center mb-4">
                <div className="text-xs font-mono text-[#ac6d46] tracking-wide mb-1">
                  {getTitle()}
                </div>
                <div className="text-xs font-mono text-[#616161]">
                  {getSubtitle()}
                </div>
              </div>

              {/* Visual - Flag, Continent, or Stamp */}
              <div className="flex justify-center mb-4">
                <div className={`${type === 'passport_country' ? 'border-2 border-[#3a3a3a] shadow-lg' : ''}`}>
                  {getVisual()}
                </div>
              </div>

              {/* Achievement Name */}
              <div className="text-center mb-2">
                <h3 className="text-2xl font-bold text-white tracking-wide">
                  {achievementName}
                </h3>
              </div>

              {/* Date or Description */}
              {(date || description) && (
                <div className="text-center mb-4">
                  {type === 'passport_stamp' && description ? (
                    <p className="text-xs text-[#b5bcc4] leading-relaxed max-w-[280px] mx-auto">
                      {description}
                    </p>
                  ) : date ? (
                    <p className="text-xs font-mono text-[#616161]">
                      First entry: {date}
                    </p>
                  ) : null}
                </div>
              )}

              {/* User */}
              <div className="flex items-center justify-center border-t border-[#3a3a3a] pt-4">
                <span className="text-sm font-mono text-[#e5e5e5]">
                  {username}
                </span>
              </div>

              {/* Earned date for stamps */}
              {type === 'passport_stamp' && date && (
                <div className="text-center mt-2">
                  <span className="text-xs font-mono text-[#616161]">
                    Earned {date}
                  </span>
                </div>
              )}

              {/* Branding */}
              <div className="mt-4 pt-3 border-t border-[#3a3a3a] flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-lg-light.svg"
                  alt="Heimursaga"
                  className="h-12 w-auto"
                />
                <span className="text-xs font-mono text-[#616161] tracking-wide">
                  EXPLORE · DISCOVER · SHARE · SPONSOR · INSPIRE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="px-6 pb-6 space-y-3">
          {/* Download Image - Primary */}
          <button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="w-full px-4 py-3 bg-[#ac6d46] text-white text-sm font-bold tracking-wide hover:bg-[#9a6240] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait disabled:active:scale-100"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                GENERATING...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                DOWNLOAD IMAGE
              </>
            )}
          </button>

          {/* Native Share (if available) - shares the image */}
          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full px-4 py-3 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] text-sm font-bold tracking-wide hover:border-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              SHARE IMAGE...
            </button>
          )}

          {/* Copy Link - Secondary */}
          <button
            onClick={handleCopyLink}
            className="w-full px-4 py-3 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] text-sm font-bold tracking-wide hover:border-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                COPIED LINK
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                COPY JOURNAL LINK
              </>
            )}
          </button>

          {/* Info text */}
          <p className="text-center text-xs text-[#616161] dark:text-[#b5bcc4]">
            Download or share the card image with friends
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
