'use client';

import { X, Maximize2, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { ClusterTimelinePopup } from '@/app/components/ClusterTimelinePopup';
import type { DebriefStop, JournalEntryType, TransformedExpedition, CurrentLocationData } from '@/app/components/expedition-detail/types';
import type { EntryCluster, PopupPosition, ClusteredMarkersResult } from '@/app/utils/mapClustering';
import { ROUTE_MODE_STYLES } from '@/app/utils/mapRouteDrawing';
import { formatShortDate } from '@/app/utils/dateFormat';
import type { RefObject } from 'react';

interface MapModalProps {
  isOpen: boolean;
  expedition: TransformedExpedition;
  routeMode?: string;
  routeLegModes?: string[];
  mapContainerRef: RefObject<HTMLDivElement | null>;
  isDebriefMode: boolean;
  debriefIndex: number;
  debriefDistance: number;
  debriefRoute: DebriefStop[];
  canDebrief: boolean;
  clickedEntry: JournalEntryType | null;
  clickedCluster: EntryCluster<JournalEntryType> | null;
  sourceCluster: EntryCluster<JournalEntryType> | null;
  popupPosition: PopupPosition;
  entryBookmarked: Set<string>;
  entryBookmarkLoading: string | null;
  currentLocationData: CurrentLocationData | null;
  totalRouteDistance: number;
  formatDistance: (meters: number, decimals?: number) => string;
  formatDate: (date: string) => string;
  formatCoords: (lat: number, lng: number) => string;
  onClose: () => void;
  onEnterDebrief: () => void;
  onExitDebrief: () => void;
  onFitBounds: () => void;
  onFlyToDebriefStop: (index: number) => void;
  onClickedEntryChange: (entry: JournalEntryType | null) => void;
  onClickedClusterChange: (cluster: EntryCluster<JournalEntryType> | null) => void;
  onSourceClusterChange: (cluster: EntryCluster<JournalEntryType> | null) => void;
  onBookmarkEntry: (entryId: string) => void;
  clusteredRef: RefObject<ClusteredMarkersResult | null>;
}

export function MapModal({
  isOpen,
  expedition,
  routeMode,
  routeLegModes,
  mapContainerRef,
  isDebriefMode,
  debriefIndex,
  debriefDistance,
  debriefRoute,
  canDebrief,
  clickedEntry,
  clickedCluster,
  sourceCluster,
  popupPosition,
  entryBookmarked,
  entryBookmarkLoading,
  currentLocationData,
  totalRouteDistance,
  formatDistance,
  formatDate,
  formatCoords,
  onClose,
  onEnterDebrief,
  onExitDebrief,
  onFitBounds,
  onFlyToDebriefStop,
  onClickedEntryChange,
  onClickedClusterChange,
  onSourceClusterChange,
  onBookmarkEntry,
  clusteredRef,
}: MapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#202020]">
      {/* Header - explicit height */}
      <div className="absolute top-0 left-0 right-0 h-14 z-10 bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 flex items-center border-b-2 border-[#202020] dark:border-[#616161]">
        {/* Title - centered */}
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
          <h2 className="text-sm font-bold truncate max-w-[60%] text-center">{expedition.title}</h2>
        </div>
        {/* Debrief stop counter - left side (debrief only) */}
        {isDebriefMode && (
          <div className="text-xs font-mono bg-white/10 px-3 py-1 z-10">
            {debriefIndex + 1} / {debriefRoute.length}
          </div>
        )}
        {/* Buttons - right side */}
        <div className="ml-auto flex items-center gap-2 z-10">
          {isDebriefMode ? (
            <button
              onClick={onExitDebrief}
              className="px-4 py-2 bg-[#202020] hover:bg-[#333] text-white text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-2"
            >
              EXIT DEBRIEF
            </button>
          ) : (
            <>
              {canDebrief && (
                <button
                  onClick={onEnterDebrief}
                  className="px-3 py-1.5 bg-[#ac6d46] hover:bg-[#8a5738] text-white text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  DEBRIEF MODE
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#202020] hover:bg-[#333] text-white text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-2"
              >
                CLOSE
              </button>
            </>
          )}
        </div>
      </div>

      {/* Map + all overlays - explicit positioning below h-14 header */}
      <div className="absolute top-14 left-0 right-0 bottom-0 bg-[#e8e8e8] overflow-hidden">
        <div ref={mapContainerRef as React.RefObject<HTMLDivElement>} style={{ width: '100%', height: '100%' }} />

        {/* FIT button (bottom-right) */}
        {!isDebriefMode && (
          <button
            onClick={onFitBounds}
            className="absolute bottom-4 right-4 z-10 px-3 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center gap-1.5 border-2 border-[#202020]"
            title="Fit all markers in view"
          >
            <Maximize2 size={14} />
            <span className="text-xs font-bold">FIT</span>
          </button>
        )}

        {/* Map Legend (bottom-left) */}
        {!isDebriefMode && (
          <div className="absolute bottom-4 left-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 text-xs z-10">
            <div className="font-bold mb-2 dark:text-[#e5e5e5]">MAP LEGEND:</div>
            <div className="space-y-2.5 dark:text-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-[18px] h-[18px] bg-[#ac6d46] border-2 border-white rounded-full" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}></div>
                </div>
                <span>Journal Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-[22px] h-[22px] bg-[#ac6d46] border-2 border-white rounded-full" style={{ boxShadow: '0 0 0 3px #ac6d46, 0 2px 6px rgba(0,0,0,0.4)' }}></div>
                </div>
                <span>Milestone Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 bg-[#ac6d46] border-2 border-white rotate-45 flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    <span className="text-white text-[8px] font-bold -rotate-45">S</span>
                  </div>
                </div>
                <span>Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 bg-[#4676ac] border-2 border-white rotate-45 flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    <span className="text-white text-[8px] font-bold -rotate-45">E</span>
                  </div>
                </div>
                <span>End</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 bg-[#ac6d46] border-2 border-[#4676ac] rotate-45 flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    <span className="text-white text-[8px] font-bold -rotate-45">S</span>
                  </div>
                </div>
                <span>Round Trip Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-3.5 h-3.5 bg-[#616161] border-2 border-white rotate-45" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}></div>
                </div>
                <span>Waypoint</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-3.5 h-3.5 bg-[#616161] border-2 border-white rotate-45 animate-[legend-pulse_2s_ease-out_infinite]"></div>
                </div>
                <span>Current Location</span>
              </div>
              <div className="flex items-center gap-2 mt-1 pt-1.5 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-6 h-0.5 bg-[#ac6d46]"></div>
                </div>
                <span>Completed Route</span>
              </div>
              {(() => {
                const modes = routeLegModes && routeLegModes.length > 0
                  ? [...new Set(routeLegModes)]
                  : routeMode && routeMode !== 'straight' && routeMode !== 'mixed'
                    ? [routeMode]
                    : null;

                if (modes) {
                  return modes.map(mode => {
                    const style = ROUTE_MODE_STYLES[mode] || ROUTE_MODE_STYLES.straight;
                    return (
                      <div key={mode} className="flex items-center gap-2">
                        <div className="w-6 flex items-center justify-center shrink-0">
                          <svg width="24" height="4">
                            <line x1="0" y1="2" x2="24" y2="2" stroke={style.color} strokeWidth={2}
                              strokeDasharray={style.dash ? style.dash.join(' ') : undefined} />
                          </svg>
                        </div>
                        <span style={{ color: style.color }}>{style.label}</span>
                      </div>
                    );
                  });
                }

                return (
                  <div className="flex items-center gap-2">
                    <div className="w-6 flex items-center justify-center shrink-0">
                      <div className="w-6 h-0.5 bg-[#202020] dark:bg-[#4676ac]"></div>
                    </div>
                    <span>Planned Route</span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Map Info (top-right) */}
        {!isDebriefMode && (
          <div className="absolute top-4 right-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 text-xs font-mono z-10">
            <div className="text-[#616161] dark:text-[#b5bcc4]">Current Position:</div>
            <div className="font-bold dark:text-[#e5e5e5]">
              {currentLocationData?.coords
                ? formatCoords(currentLocationData.coords.lat, currentLocationData.coords.lng)
                : 'No location set'}
            </div>
            <div className="text-[#616161] dark:text-[#b5bcc4] mt-2">Total Distance:</div>
            <div className="font-bold dark:text-[#e5e5e5]">~{formatDistance(totalRouteDistance, 0)}</div>
          </div>
        )}

        {/* Entry Popup */}
        {!isDebriefMode && clickedEntry && (
          <div
            className={`absolute w-72 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 bottom-4 ${
              popupPosition === 'bottom-left' ? 'left-4' : 'right-4'
            }`}
          >
            <div className="p-3 text-xs font-mono">
              {/* Back to cluster */}
              {sourceCluster && (
                <button
                  onClick={() => {
                    onClickedEntryChange(null);
                    onClickedClusterChange(sourceCluster);
                    onSourceClusterChange(null);
                    clusteredRef.current?.removeAllHighlights();
                  }}
                  className="flex items-center gap-1 text-[10px] text-[#ac6d46] hover:underline mb-2"
                >
                  <ChevronLeft className="w-3 h-3" />
                  BACK TO {sourceCluster.entries.length} ENTRIES
                </button>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-bold text-base dark:text-[#e5e5e5] truncate">{clickedEntry.title}</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                    {clickedEntry.location && <span>{clickedEntry.location}</span>}
                    {clickedEntry.location && clickedEntry.date && <span> • </span>}
                    {clickedEntry.date && <span>{formatShortDate(clickedEntry.date)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClickedEntryChange(null);
                    onSourceClusterChange(null);
                    clusteredRef.current?.removeAllHighlights();
                  }}
                  className="p-0.5 hover:bg-[#202020] hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded transition-all active:scale-[0.95] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-[#616161] flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-[#616161] dark:text-[#b5bcc4]" />
                </button>
              </div>

              {/* Excerpt */}
              {clickedEntry.excerpt && (
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-3 line-clamp-2">
                  {clickedEntry.excerpt}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`/entry/${clickedEntry.id}`, '_blank')}
                  className="flex-1 bg-[#ac6d46] text-white py-1.5 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold text-center"
                >
                  VIEW ENTRY
                </button>
                <button
                  onClick={() => onBookmarkEntry(clickedEntry.id)}
                  disabled={entryBookmarkLoading === clickedEntry.id}
                  className={`py-1.5 px-2 transition-all active:scale-95 flex items-center justify-center ${
                    entryBookmarked.has(clickedEntry.id)
                      ? 'bg-[#4676ac] text-white hover:bg-[#365a87]'
                      : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a]'
                  }`}
                  title={entryBookmarked.has(clickedEntry.id) ? 'Bookmarked' : 'Bookmark'}
                >
                  {entryBookmarkLoading === clickedEntry.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : entryBookmarked.has(clickedEntry.id) ? (
                    <BookmarkCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cluster Timeline Popup */}
        {!isDebriefMode && clickedCluster && (
          <ClusterTimelinePopup
            cluster={clickedCluster}
            position={popupPosition}
            className="w-72 bottom-4"
            onClose={() => {
              onClickedClusterChange(null);
              clusteredRef.current?.removeAllHighlights();
            }}
            onEntrySelect={(entry) => {
              onSourceClusterChange(clickedCluster);
              onClickedClusterChange(null);
              onClickedEntryChange(entry);
            }}
          />
        )}

        {/* Debrief Info Popup */}
        {isDebriefMode && debriefRoute[debriefIndex] && (() => {
          const stop = debriefRoute[debriefIndex];
          return (
            <div className="absolute top-4 right-4 w-80 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20">
              {/* Header */}
              <div className={`px-3 py-2 text-xs font-bold font-mono flex items-center justify-between ${
                stop.type === 'waypoint' ? 'bg-[#616161] text-white' : 'bg-[#ac6d46] text-white'
              }`}>
                <span>{stop.type === 'waypoint' ? 'WAYPOINT' : 'JOURNAL ENTRY'}</span>
                <span className="text-white/70">STOP {debriefIndex + 1} OF {debriefRoute.length}</span>
              </div>

              <div className="p-3 text-xs font-mono">
                {/* Title */}
                <div className="font-serif font-bold text-base dark:text-[#e5e5e5] mb-1">{stop.title}</div>

                {/* Location & Date */}
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-3">
                  {stop.location && <span>{stop.location}</span>}
                  {stop.location && stop.date && <span> &bull; </span>}
                  {stop.date && <span>{formatDate(stop.date)}</span>}
                </div>

                {/* Waypoint-specific fields */}
                {stop.type === 'waypoint' && (
                  <>
                    {stop.description && (
                      <div className="text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-2 line-clamp-3">
                        {stop.description}
                      </div>
                    )}
                    {stop.status && (
                      <div className="mb-2">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${
                          stop.status === 'completed' ? 'bg-[#ac6d46] text-white' :
                          stop.status === 'current' ? 'bg-[#4676ac] text-white' :
                          'bg-[#b5bcc4] text-[#202020]'
                        }`}>
                          {stop.status.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {stop.notes && (
                      <div className="text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-2 italic line-clamp-2">
                        {stop.notes}
                      </div>
                    )}
                  </>
                )}

                {/* Entry-specific fields */}
                {stop.type === 'entry' && (
                  <>
                    {stop.excerpt && (
                      <div className="text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-3 line-clamp-3">
                        {stop.excerpt}
                      </div>
                    )}
                    <button
                      onClick={() => window.open(`/entry/${stop.id}`, '_blank')}
                      className="w-full bg-[#ac6d46] text-white py-1.5 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] text-xs font-bold text-center mb-2"
                    >
                      VIEW FULL ENTRY
                    </button>
                  </>
                )}

                {/* Coordinates */}
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2 text-[10px] text-[#b5bcc4] dark:text-[#616161]">
                  {formatCoords(stop.coords.lat, stop.coords.lng)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Debrief Navigation Controls */}
        {isDebriefMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
            <button
              onClick={() => debriefIndex > 0 && onFlyToDebriefStop(debriefIndex - 1)}
              disabled={debriefIndex === 0}
              className={`w-12 h-12 flex items-center justify-center border-2 transition-all active:scale-[0.95] ${
                debriefIndex === 0
                  ? 'bg-[#b5bcc4] dark:bg-[#3a3a3a] border-[#b5bcc4] dark:border-[#3a3a3a] text-white/50 cursor-not-allowed'
                  : 'bg-white dark:bg-[#202020] border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a]'
              }`}
              aria-label="Previous stop"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] px-4 h-12 flex items-center text-sm font-bold font-mono dark:text-[#e5e5e5]">
              {debriefIndex + 1} / {debriefRoute.length}
            </div>
            <button
              onClick={() => debriefIndex < debriefRoute.length - 1 && onFlyToDebriefStop(debriefIndex + 1)}
              disabled={debriefIndex === debriefRoute.length - 1}
              className={`w-12 h-12 flex items-center justify-center border-2 transition-all active:scale-[0.95] ${
                debriefIndex === debriefRoute.length - 1
                  ? 'bg-[#b5bcc4] dark:bg-[#3a3a3a] border-[#b5bcc4] dark:border-[#3a3a3a] text-white/50 cursor-not-allowed'
                  : 'bg-white dark:bg-[#202020] border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a]'
              }`}
              aria-label="Next stop"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Debrief Distance Counter */}
        {isDebriefMode && (
          <div className="absolute bottom-6 right-4 z-20">
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] px-4 py-2">
              <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] font-mono uppercase tracking-wider mb-0.5">
                Distance Traveled
              </div>
              <div className="text-lg font-bold font-mono dark:text-[#e5e5e5] tabular-nums">
                {formatDistance(debriefDistance, 1)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
