'use client';

import Image from 'next/image';

interface FollowedExplorerStripProps {
  explorers: Array<{
    username: string;
    name?: string;
    picture?: string;
    isPro?: boolean;
    status: 'exploring' | 'planning' | 'resting';
    lastEntryDate?: string;
  }>;
  onViewExplorer: (username: string) => void;
}

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'No entries';
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

const statusColors: Record<string, string> = {
  exploring: 'bg-[#ac6d46]',
  planning: 'bg-[#4676ac]',
  resting: 'bg-[#616161]',
};

const statusLabels: Record<string, string> = {
  exploring: 'Exploring',
  planning: 'Planning',
  resting: 'Resting',
};

export function FollowedExplorerStrip({ explorers, onViewExplorer }: FollowedExplorerStripProps) {
  if (explorers.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
      <div className="flex items-center justify-between mb-3 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">FOLLOWED EXPLORERS</h3>
        <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
          {explorers.length} explorer{explorers.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div
        className="flex flex-nowrap gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {explorers.map((explorer) => (
          <button
            key={explorer.username}
            onClick={() => onViewExplorer(explorer.username)}
            className="flex-shrink-0 w-[180px] flex items-stretch gap-2.5 p-2.5 border-2 border-[#e5e5e5] dark:border-[#3a3a3a] hover:border-[#4676ac] dark:hover:border-[#4676ac] transition-all active:scale-[0.98] text-left"
          >
            {/* Avatar */}
            <div className={`relative flex-shrink-0 w-10 overflow-hidden border-2 ${explorer.isPro ? 'border-[#ac6d46]' : 'border-[#616161] dark:border-[#3a3a3a]'}`}>
              {explorer.picture ? (
                <Image
                  src={explorer.picture}
                  alt={explorer.name || explorer.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#b5bcc4] dark:bg-[#3a3a3a] flex items-center justify-center text-xs font-bold text-white">
                  {explorer.username.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Status dot */}
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#202020] ${statusColors[explorer.status]}`}
                title={statusLabels[explorer.status]}
              />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-[#202020] dark:text-[#e5e5e5] truncate">
                {explorer.username}
              </div>
              {explorer.name && (
                <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] truncate">
                  {explorer.name}
                </div>
              )}
              <div className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4]">
                {getRelativeTime(explorer.lastEntryDate)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
