'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useTheme } from '@/app/context/ThemeContext';
import { X } from 'lucide-react';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const MAPBOX_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

interface Waypoint {
  id: string;
  coords: { lat: number; lng: number };
  status: 'completed' | 'current' | 'planned';
}

interface JournalEntry {
  id: string;
  title: string;
  coords: { lat: number; lng: number };
  location: string;
  date: string;
  excerpt: string;
  mediaCount: number;
  views: number;
  explorerName: string;
  expeditionName: string;
  expeditionStatus: 'active' | 'completed';
  expeditionDay?: number;
}

interface Expedition {
  id: string;
  title: string;
  color: string;
  status: 'active' | 'completed';
  waypoints: Waypoint[];
  entries: JournalEntry[];  // Changed from SimpleEntry[] to JournalEntry[]
}

interface ExplorerExpeditionsMapProps {
  expeditions: Expedition[];
  allEntries?: JournalEntry[]; // All entries across all expeditions
  explorerName?: string;
}

export function ExplorerExpeditionsMap({ expeditions, allEntries = [], explorerName = '' }: ExplorerExpeditionsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Default to 'all-entries' if there's no active expedition
  const hasActiveExpedition = expeditions.some(exp => exp.status === 'active');
  const [mapMode, setMapMode] = useState<'expedition' | 'all-entries'>(
    hasActiveExpedition ? 'expedition' : 'all-entries'
  );
  const [clickedEntry, setClickedEntry] = useState<JournalEntry | null>(null);
  const [popupPosition, setPopupPosition] = useState<'bottom-left' | 'bottom-right'>('bottom-left');
  const { theme } = useTheme();

  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Different bounds calculation based on mode
    let allCoords: [number, number][] = [];
    
    if (mapMode === 'expedition' && expeditions.length > 0) {
      allCoords = expeditions.flatMap(exp => 
        exp.waypoints.map(wp => [wp.coords.lng, wp.coords.lat] as [number, number])
      );
    } else if (mapMode === 'all-entries' && allEntries.length > 0) {
      allCoords = allEntries.map(entry => [entry.coords.lng, entry.coords.lat] as [number, number]);
    }
    
    if (allCoords.length === 0) return;

    const bounds = allCoords.reduce(
      (bounds, coord) => bounds.extend(coord),
      new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
    );

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
      bounds: bounds,
      fitBoundsOptions: { padding: 50 },
    });

    mapRef.current = map;

    // Add error handler - suppress style evaluation warnings
    map.on('error', (e) => {
      // Suppress Mapbox style expression evaluation warnings (non-critical)
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) {
        return; // These are harmless warnings from Mapbox's internal style
      }
      console.error('Mapbox error:', e);
    });

    // Add geocoder control first (so it appears above navigation control)
    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      placeholder: 'Search for a location',
      marker: false,
      bbox: bounds.toArray().flat() as [number, number, number, number],
    });
    map.addControl(geocoder as any, 'top-left');

    // Add navigation control (zoom buttons) below geocoder
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Track event listeners for cleanup
    const eventListeners: Array<{ element: HTMLElement; handler: () => void }> = [];

    // Wait for map to load
    map.on('load', () => {
      if (mapMode === 'expedition') {
        expeditions.forEach((expedition) => {
          const expeditionId = expedition.id;
          
          // Add route line for each expedition
          if (expedition.waypoints.length > 1) {
            // Planned route (all waypoints)
            map.addSource(`route-${expeditionId}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: expedition.waypoints.map(wp => [wp.coords.lng, wp.coords.lat]),
                },
              },
            });

            map.addLayer({
              id: `route-${expeditionId}`,
              type: 'line',
              source: `route-${expeditionId}`,
              paint: {
                'line-color': expedition.color,
                'line-width': 3,
                'line-dasharray': [5, 5],
                'line-opacity': 0.5,
              },
            });

            // Completed route (only completed waypoints)
            const completedWaypoints = expedition.waypoints.filter(wp => wp.status === 'completed');
            if (completedWaypoints.length > 0) {
              map.addSource(`completed-route-${expeditionId}`, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: completedWaypoints.map(wp => [wp.coords.lng, wp.coords.lat]),
                  },
                },
              });

              map.addLayer({
                id: `completed-route-${expeditionId}`,
                type: 'line',
                source: `completed-route-${expeditionId}`,
                paint: {
                  'line-color': expedition.color,
                  'line-width': 4,
                  'line-opacity': 0.9,
                },
              });
            }
          }

          // Add waypoint markers
          expedition.waypoints.forEach((wp, idx) => {
            const isCompleted = wp.status === 'completed';
            const isCurrent = wp.status === 'current';
            
            const el = document.createElement('div');
            el.className = 'waypoint-marker';
            el.style.width = isCurrent ? '40px' : '28px';
            el.style.height = isCurrent ? '40px' : '28px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = isCompleted || isCurrent ? expedition.color : '#b5bcc4';
            el.style.border = '2px solid #202020';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.color = 'white';
            el.style.fontWeight = 'bold';
            el.style.fontSize = isCurrent ? '14px' : '12px';
            el.style.cursor = 'pointer';
            el.textContent = String(idx + 1);

            if (isCurrent) {
              el.style.boxShadow = `0 0 0 4px ${expedition.color}40`;
            }

            new mapboxgl.Marker(el)
              .setLngLat([wp.coords.lng, wp.coords.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(`
                  <div class="p-2 text-xs">
                    <div class="font-bold">${expedition.title}</div>
                    <div class="text-gray-600">Waypoint ${idx + 1}</div>
                    <div class="text-xs mt-1">Status: ${wp.status}</div>
                  </div>
                `)
              )
              .addTo(map);
          });

          // Add journal entry markers
          expedition.entries.forEach((entry) => {
            const el = document.createElement('div');
            el.className = 'entry-marker';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.backgroundColor = expedition.color;
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.color = 'white';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '10px';
            el.style.cursor = 'pointer';
            el.style.transition = 'all 0.2s ease';
            el.style.transformOrigin = 'center';
            el.textContent = 'E';

            // Add highlight functionality
            const clickHandler = () => {
              // Use entry directly since it now has full JournalEntry data

              // Remove highlight from all markers
              markersRef.current.forEach(marker => {
                const el = marker.getElement();
                if (el && (el as any).removeHighlight) {
                  (el as any).removeHighlight();
                }
              });

              // Calculate marker position on screen to determine optimal popup placement
              if (mapContainerRef.current) {
                const mapRect = mapContainerRef.current.getBoundingClientRect();
                const markerRect = el.getBoundingClientRect();
                const markerCenterX = markerRect.left + markerRect.width / 2 - mapRect.left;

                const isRightHalf = markerCenterX > mapRect.width / 2;

                // Position popup on opposite side (always bottom)
                if (isRightHalf) {
                  setPopupPosition('bottom-left');
                } else {
                  setPopupPosition('bottom-right');
                }
              }

              setClickedEntry(entry);

              // Add prominent highlight to this marker with enhanced glow
              el.style.boxShadow = '0 0 0 8px rgba(172, 109, 70, 0.5), 0 0 0 16px rgba(172, 109, 70, 0.3), 0 0 30px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.5)';
              el.style.border = '3px solid white';
              el.style.zIndex = '1000';
              (el as any).removeHighlight = () => {
                el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                el.style.border = '2px solid white';
                el.style.zIndex = 'auto';
              };
            };

            el.addEventListener('click', clickHandler);
            eventListeners.push({ element: el, handler: clickHandler });

            const marker = new mapboxgl.Marker(el)
              .setLngLat([entry.coords.lng, entry.coords.lat])
              .addTo(map);

            markersRef.current.push(marker);
          });
        });
      } else if (mapMode === 'all-entries') {
        allEntries.forEach((entry) => {
          const el = document.createElement('div');
          el.className = 'entry-marker';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.backgroundColor = '#ac6d46';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.fontSize = '10px';
          el.style.cursor = 'pointer';
          el.style.transition = 'all 0.2s ease';
          el.style.transformOrigin = 'center';
          el.textContent = 'E';

          // Add highlight functionality
          const clickHandler = () => {
            // Remove highlight from all markers
            markersRef.current.forEach(marker => {
              const el = marker.getElement();
              if (el && (el as any).removeHighlight) {
                (el as any).removeHighlight();
              }
            });

            // Calculate marker position on screen to determine optimal popup placement
            if (mapContainerRef.current) {
              const mapRect = mapContainerRef.current.getBoundingClientRect();
              const markerRect = el.getBoundingClientRect();
              const markerCenterX = markerRect.left + markerRect.width / 2 - mapRect.left;

              const isRightHalf = markerCenterX > mapRect.width / 2;

              // Position popup on opposite side (always bottom)
              if (isRightHalf) {
                setPopupPosition('bottom-left');
              } else {
                setPopupPosition('bottom-right');
              }
            }

            setClickedEntry(entry);

            // Add prominent highlight to this marker with enhanced glow
            el.style.boxShadow = '0 0 0 8px rgba(172, 109, 70, 0.5), 0 0 0 16px rgba(172, 109, 70, 0.3), 0 0 30px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.5)';
            el.style.border = '3px solid white';
            el.style.zIndex = '1000';
            (el as any).removeHighlight = () => {
              el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
              el.style.border = '2px solid white';
              el.style.zIndex = 'auto';
            };
          };

          el.addEventListener('click', clickHandler);
          eventListeners.push({ element: el, handler: clickHandler });

          const marker = new mapboxgl.Marker(el)
            .setLngLat([entry.coords.lng, entry.coords.lat])
            .addTo(map);

          markersRef.current.push(marker);
        });
      }
    });

    // Cleanup
    return () => {
      // Remove event listeners before removing map
      eventListeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      map.remove();
    };
  }, [expeditions, allEntries, mapMode, theme]);

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">{/* Map Header with Mode Toggle */}
      <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white border-b-2 border-[#202020] dark:border-[#616161]">
        <div className="p-4 flex items-center justify-between">
          <h3 className="text-sm font-bold">
            {mapMode === 'expedition' ? 'CURRENT EXPEDITION MAP' : 'ALL ENTRIES MAP'}
          </h3>
          <div className="text-xs font-mono">
            {mapMode === 'expedition' 
              ? (expeditions[0]?.title || 'No Active Expedition')
              : `${allEntries.length} Total Entries`
            }
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => setMapMode('expedition')}
            className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap ${
              mapMode === 'expedition'
                ? 'bg-[#ac6d46] text-white'
                : 'bg-[#202020] bg-opacity-30 hover:bg-opacity-50'
            }`}
          >
            CURRENT EXPEDITION
          </button>
          <button
            onClick={() => setMapMode('all-entries')}
            className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap ${
              mapMode === 'all-entries'
                ? 'bg-[#ac6d46] text-white'
                : 'bg-[#202020] bg-opacity-30 hover:bg-opacity-50'
            }`}
          >
            ALL ENTRIES
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative bg-[#b5bcc4]" style={{ height: '500px' }}>
        <div ref={mapContainerRef} className="absolute top-0 left-0 w-full h-full" />
        
        {/* Dynamic Position Popup Overlay - Entry Mode */}
        {clickedEntry && (
          <div 
            className={`absolute w-96 max-w-[calc(100%-2rem)] bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              popupPosition === 'bottom-left' ? 'bottom-[20px] left-4' : 'bottom-[20px] right-4'
            }`}
          >
            <div className="p-3 text-xs font-mono">
              <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] pb-2 mb-2">
                <div className="flex-1">
                  <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">{clickedEntry.title}</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] text-xs">
                    {clickedEntry.explorerName} • {clickedEntry.expeditionName}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setClickedEntry(null);
                    // Remove highlight from all markers
                    markersRef.current.forEach(marker => {
                      const el = marker.getElement();
                      if (el && (el as any).removeHighlight) {
                        (el as any).removeHighlight();
                      }
                    });
                  }}
                  className="p-1 hover:bg-[#202020] hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] ml-2"
                >
                  <X className="w-4 h-4 text-[#202020] dark:text-[#e5e5e5]" />
                </button>
              </div>
              <div className="space-y-2 text-[#202020] dark:text-[#e5e5e5]">
                <div><strong>EXPEDITION:</strong> {clickedEntry.expeditionName} {clickedEntry.expeditionDay && `• Day ${clickedEntry.expeditionDay}`}</div>
                <div><strong>LOCATION:</strong> {clickedEntry.location}</div>
                <div><strong>POSTED:</strong> {clickedEntry.date}</div>
                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-2 border-l-2 border-[#ac6d46] italic text-xs leading-relaxed">
                  "{clickedEntry.excerpt}"
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#b5bcc4] dark:border-[#616161] text-xs">
                  <div><strong>MEDIA:</strong> {clickedEntry.mediaCount} items</div>
                  <div><strong>VIEWS:</strong> {clickedEntry.views.toLocaleString()}</div>
                </div>
                <button
                  onClick={() => {
                    // Navigate to full entry
                  }}
                  className="w-full bg-[#ac6d46] text-white py-2 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold mt-2 whitespace-nowrap"
                >
                  VIEW ENTRY
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
        {mapMode === 'expedition' ? (
          <>
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">EXPEDITION LEGEND:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {expeditions.map((expedition) => (
                <div
                  key={expedition.id}
                  className="flex items-center gap-3 p-2 border border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#202020]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-[#202020]"
                      style={{ backgroundColor: expedition.color }}
                    />
                    <span
                      className="text-xs px-2 py-1 text-white rounded-full"
                      style={{ backgroundColor: expedition.color }}
                    >
                      {expedition.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs">
                    <div className="font-bold dark:text-[#e5e5e5]">{expedition.title}</div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">
                      {expedition.waypoints.length} waypoints • {expedition.entries.length} entries
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-6 text-xs mt-4 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ac6d46] border border-[#202020]" />
                <span>Completed Waypoint</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#4676ac] border border-[#202020]" />
                <span>Current Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#b5bcc4] border border-[#202020]" />
                <span>Planned Waypoint</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#ac6d46] border border-white text-white text-xs flex items-center justify-center">E</div>
                <span>Journal Entry</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ALL ENTRIES VIEW:</div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
              Showing all journal entries from {explorerName} across all expeditions. Click any marker to view entry details.
            </div>
            <div className="flex gap-6 text-xs pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#ac6d46] border border-white text-white text-xs flex items-center justify-center">E</div>
                <span>Journal Entry ({allEntries.length} total)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}