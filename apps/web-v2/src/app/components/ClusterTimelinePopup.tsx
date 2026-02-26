'use client';

import { X, ChevronRight } from 'lucide-react';
import type { ClusterableEntry, EntryCluster, PopupPosition } from '@/app/utils/mapClustering';
import { formatShortDate } from '@/app/utils/dateFormat';

interface ClusterTimelinePopupProps<T extends ClusterableEntry> {
  cluster: EntryCluster<T>;
  position: PopupPosition;
  onClose: () => void;
  onEntrySelect: (entry: T) => void;
  renderEntryMeta?: (entry: T) => React.ReactNode;
  className?: string;
}

export function ClusterTimelinePopup<T extends ClusterableEntry>({
  cluster,
  position,
  onClose,
  onEntrySelect,
  renderEntryMeta,
  className = 'w-72',
}: ClusterTimelinePopupProps<T>) {
  const count = cluster.entries.length;

  return (
    <div
      className={`absolute bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 ${className} ${
        position === 'bottom-left' ? 'left-4' : 'right-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-[#202020] dark:border-[#616161] bg-[#8a5738] text-white">
        <span className="text-xs font-bold font-mono">
          {count} {count === 1 ? 'ENTRY' : 'ENTRIES'} AT THIS LOCATION
        </span>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-white hover:bg-opacity-20 rounded transition-all active:scale-[0.95] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-white flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timeline */}
      <div className="max-h-[240px] overflow-y-auto">
        <div className="p-3">
          {cluster.entries.map((entry, idx) => (
            <button
              key={entry.id}
              onClick={() => onEntrySelect(entry)}
              className="w-full flex items-start gap-3 text-left group hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] -mx-2 px-2 py-1.5 rounded transition-colors"
            >
              {/* Timeline rail */}
              <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                {entry.timelinePosition ? (
                  <div className="w-[16px] h-[16px] rounded-full bg-[#ac6d46] flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                    {entry.timelinePosition}
                  </div>
                ) : (
                  <div className="w-[6px] h-[6px] rounded-full bg-[#ac6d46] flex-shrink-0" />
                )}
                {idx < count - 1 && (
                  <div className="w-px flex-1 min-h-[20px] bg-[#ac6d46] opacity-30 mt-0.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] font-mono">
                  {formatShortDate(entry.date)}
                </div>
                <div className="text-xs font-bold dark:text-[#e5e5e5] truncate">
                  {entry.title}
                </div>
                {renderEntryMeta && (
                  <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] truncate">
                    {renderEntryMeta(entry)}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className="w-3.5 h-3.5 text-[#b5bcc4] dark:text-[#616161] group-hover:text-[#ac6d46] flex-shrink-0 mt-1.5 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
