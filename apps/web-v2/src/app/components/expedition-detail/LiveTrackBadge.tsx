'use client';

import { useMemo } from 'react';

import { formatDistanceToNow } from 'date-fns';

interface LiveTrackBadgeProps {
  lastPointAt: string | null;
  heartbeatAt: string | null;
  isActive: boolean;
  className?: string;
}

/**
 * Compact freshness badge for expedition surfaces. Reads "Live · 14 min ago"
 * while tracking is active, "Last tracked 2 hours ago" once stopped. The
 * freshness signal is `max(lastPointAt, heartbeatAt)` — heartbeats keep the
 * badge fresh when the explorer is stationary (no new GPS pings) per the
 * Phase 1 spec.
 */
export function LiveTrackBadge({
  lastPointAt,
  heartbeatAt,
  isActive,
  className,
}: LiveTrackBadgeProps) {
  const liveAt = useMemo(() => {
    const candidates: Date[] = [];
    if (lastPointAt) candidates.push(new Date(lastPointAt));
    if (heartbeatAt) candidates.push(new Date(heartbeatAt));
    if (candidates.length === 0) return null;
    return candidates.reduce((a, b) => (a > b ? a : b));
  }, [lastPointAt, heartbeatAt]);

  if (!liveAt) return null;

  const relative = formatDistanceToNow(liveAt, { addSuffix: false });

  return (
    <div
      className={
        'inline-flex items-center gap-2 text-xs ' + (className || '')
      }
    >
      <span
        className={
          'inline-flex h-2 w-2 rounded-full ' +
          (isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400')
        }
        aria-hidden="true"
      />
      <span className="font-mono uppercase tracking-wider">
        {isActive ? `Live · ${relative} ago` : `Last tracked ${relative} ago`}
      </span>
    </div>
  );
}
