'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useTheme } from '@/app/context/ThemeContext';
import { useMapLayer, getMapStyle, getLineCasingColor, applyNauticalOverlay } from '@/app/context/MapLayerContext';
import { ROUTE_MODE_STYLES, findCompletedRouteCoords } from '@/app/utils/mapRouteDrawing';
import { createPOIGeocoder, retrievePOI } from '@/app/utils/poiGeocoder';
import { X, ChevronLeft, Globe } from 'lucide-react';
import {
  clusterEntriesByProximity,
  createSingleEntryMarker,
  createClusterMarker,
  computePopupPosition,
  renderClusteredMarkers,
  darkenColor,
  thresholdForZoom,
  type EntryCluster,
  type PopupPosition,
  type ClusteredMarkersResult,
} from '@/app/utils/mapClustering';
import { ClusterTimelinePopup } from '@/app/components/ClusterTimelinePopup';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

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
  entries: JournalEntry[];
  routeGeometry?: number[][];
  currentLocation?: { lat: number; lng: number };
  routeMode?: string;
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
  const [clickedCluster, setClickedCluster] = useState<EntryCluster<JournalEntry> | null>(null);
  const [sourceCluster, setSourceCluster] = useState<EntryCluster<JournalEntry> | null>(null);
  const [popupPosition, setPopupPosition] = useState<'bottom-left' | 'bottom-right'>('bottom-left');
  const { theme } = useTheme();
  const { mapLayer, nauticalOverlay } = useMapLayer();

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
      style: getMapStyle(mapLayer, theme),
      bounds: bounds,
      fitBoundsOptions: { padding: 50 },
      projection: 'mercator',
      dragRotate: false,
      touchPitch: false,
      maxPitch: 0,
      renderWorldCopies: false,
    });
    map.touchZoomRotate.disableRotation();

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
      placeholder: 'Search for a location or business',
      marker: false,
      trackProximity: false,
      types: 'country,region,place,locality,neighborhood,address,poi',
      limit: 10,
      externalGeocoder: createPOIGeocoder(map),
    } as any);
    map.addControl(geocoder as any, 'top-left');

    // POI results from the external geocoder come back with placeholder
    // center: [0, 0] — resolve the real coordinates via /retrieve before flying.
    geocoder.on('result', async (e: any) => {
      const mapboxId = e.result?.properties?.mapbox_id;
      let lng: number, lat: number;
      if (mapboxId) {
        const poi = await retrievePOI(mapboxId);
        if (!poi) return;
        lng = poi.lng;
        lat = poi.lat;
      } else {
        const { center } = e.result;
        [lng, lat] = center;
      }
      map.flyTo({ center: [lng, lat], zoom: 10 });
    });

    // Manually manage proximity bias at all zoom levels
    const updateGeocoderProximity = () => {
      const center = map.getCenter();
      geocoder.setProximity({ longitude: center.lng, latitude: center.lat });
    };
    map.on('moveend', updateGeocoderProximity);
    map.on('load', updateGeocoderProximity);

    // Add navigation control (zoom buttons) below geocoder
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');

    // Track event listeners for cleanup
    const eventListeners: Array<{ element: HTMLElement; handler: () => void }> = [];

    // Inject pulse animation keyframe
    if (!document.getElementById('wp-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'wp-pulse-style';
      style.textContent = '@keyframes wp-pulse { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 100% { box-shadow: 0 0 0 16px rgba(255,255,255,0); } }';
      document.head.appendChild(style);
    }

    // Wait for map to load
    map.on('load', () => {
      applyNauticalOverlay(map, nauticalOverlay);

      if (mapMode === 'expedition') {
        expeditions.forEach((expedition) => {
          const expeditionId = expedition.id;
          
          // Route geometry — use saved route if available, fall back to waypoint-to-waypoint
          const hasDirectionsRoute = expedition.routeGeometry && expedition.routeGeometry.length >= 2;
          const routeCoords = hasDirectionsRoute
            ? expedition.routeGeometry!
            : expedition.waypoints.length > 1
              ? expedition.waypoints.map(wp => [wp.coords.lng, wp.coords.lat])
              : null;

          const routeStyle = ROUTE_MODE_STYLES[expedition.routeMode || ''] || ROUTE_MODE_STYLES.straight;
          const casingColor = getLineCasingColor(mapLayer, theme);

          if (routeCoords && routeCoords.length >= 2) {
            // Full route line (planned — using route mode style)
            map.addSource(`route-${expeditionId}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: routeCoords },
              },
            });
            map.addLayer({
              id: `route-${expeditionId}-casing`,
              type: 'line',
              source: `route-${expeditionId}`,
              paint: {
                'line-color': casingColor,
                'line-width': hasDirectionsRoute ? 8 : 7,
                'line-opacity': 0.3,
              },
            });
            map.addLayer({
              id: `route-${expeditionId}`,
              type: 'line',
              source: `route-${expeditionId}`,
              paint: {
                'line-color': routeStyle.color,
                'line-width': hasDirectionsRoute ? routeStyle.width : 3,
                'line-opacity': 0.8,
                ...(hasDirectionsRoute && routeStyle.dash
                  ? { 'line-dasharray': routeStyle.dash }
                  : !hasDirectionsRoute
                    ? { 'line-dasharray': [2, 2] }
                    : {}),
              },
            });

            // Completed route overlay (start → current location, solid copper)
            if (expedition.currentLocation) {
              const completedCoords = findCompletedRouteCoords({
                routeCoordinates: routeCoords,
                hasDirectionsRoute: !!hasDirectionsRoute,
                currentLocCoords: expedition.currentLocation,
                waypoints: expedition.waypoints,
              });
              if (completedCoords.length >= 2) {
                map.addSource(`completed-route-${expeditionId}`, {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: completedCoords },
                  },
                });
                map.addLayer({
                  id: `completed-route-${expeditionId}-casing`,
                  type: 'line',
                  source: `completed-route-${expeditionId}`,
                  paint: { 'line-color': casingColor, 'line-width': 8, 'line-opacity': 0.3 },
                });
                map.addLayer({
                  id: `completed-route-${expeditionId}`,
                  type: 'line',
                  source: `completed-route-${expeditionId}`,
                  paint: { 'line-color': '#ac6d46', 'line-width': 4, 'line-opacity': 0.9 },
                });
              }
            }
          }

          // Add waypoint markers — match expedition detail page style
          const wpCount = expedition.waypoints.length;
          expedition.waypoints.forEach((wp, idx) => {
            const isCurrent = wp.status === 'current';
            const isStart = idx === 0;
            const isEnd = idx === wpCount - 1 && wpCount > 1;

            const wrapper = document.createElement('div');
            wrapper.className = 'waypoint-marker';
            wrapper.style.cursor = 'pointer';

            if (isStart || isEnd) {
              // Start/End — diamond with S/E label
              const diamond = document.createElement('div');
              Object.assign(diamond.style, {
                width: '30px', height: '30px',
                backgroundColor: isStart ? '#ac6d46' : '#4676ac',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'rotate(45deg)',
              });
              const label = document.createElement('span');
              Object.assign(label.style, { transform: 'rotate(-45deg)', color: 'white', fontWeight: 'bold', fontSize: '13px', lineHeight: '1' });
              label.textContent = isStart ? 'S' : 'E';
              diamond.appendChild(label);
              wrapper.appendChild(diamond);
              if (isCurrent) diamond.style.animation = 'wp-pulse 2s ease-out infinite';
            } else {
              // Intermediate — gray circle with number
              Object.assign(wrapper.style, {
                width: '22px', height: '22px', borderRadius: '50%',
                backgroundColor: '#616161', border: '2px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              });
              const circleLabel = document.createElement('span');
              Object.assign(circleLabel.style, { color: 'white', fontWeight: 'bold', fontSize: '10px', lineHeight: '1' });
              circleLabel.textContent = String(idx + 1);
              wrapper.appendChild(circleLabel);
              if (isCurrent) wrapper.style.animation = 'wp-pulse 2s ease-out infinite';
            }

            // Build popup with DOM API to prevent XSS
            const popupEl = document.createElement('div');
            popupEl.className = 'p-2 text-xs';
            const titleEl = document.createElement('div');
            titleEl.className = 'font-bold';
            titleEl.textContent = expedition.title;
            const wpLabel = document.createElement('div');
            wpLabel.className = 'text-gray-600';
            wpLabel.textContent = isStart ? 'Start' : isEnd ? 'End' : `Waypoint ${idx + 1}`;
            popupEl.appendChild(titleEl);
            popupEl.appendChild(wpLabel);

            new mapboxgl.Marker(wrapper)
              .setLngLat([wp.coords.lng, wp.coords.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupEl)
              )
              .addTo(map);
          });

          // Add animated current location marker
          if (expedition.currentLocation) {
            const locEl = document.createElement('div');
            Object.assign(locEl.style, {
              width: '18px', height: '18px', borderRadius: '50%',
              backgroundColor: '#ac6d46', border: '3px solid white',
              boxShadow: '0 0 0 4px rgba(172,109,70,0.3)',
              animation: 'wp-pulse 2s ease-out infinite',
            });
            new mapboxgl.Marker(locEl)
              .setLngLat([expedition.currentLocation.lng, expedition.currentLocation.lat])
              .addTo(map);
          }

          // Add clustered journal entry markers
          const removeAllHighlights = () => {
            markersRef.current.forEach(m => {
              const el = m.getElement();
              if (el && (el as any).removeHighlight) (el as any).removeHighlight();
            });
          };

          const handleEntryClick = (entry: JournalEntry, container: HTMLElement, applyHighlight: () => void) => {
            removeAllHighlights();
            const position = mapContainerRef.current
              ? computePopupPosition(container, mapContainerRef.current)
              : 'bottom-right' as PopupPosition;
            setClickedCluster(null);
            setSourceCluster(null);
            setPopupPosition(position);
            setClickedEntry(entry);
            applyHighlight();
          };

          const handleClusterClick = (cluster: EntryCluster<JournalEntry>, container: HTMLElement, applyHighlight: () => void) => {
            removeAllHighlights();
            const position = mapContainerRef.current
              ? computePopupPosition(container, mapContainerRef.current)
              : 'bottom-right' as PopupPosition;
            setClickedEntry(null);
            setSourceCluster(null);
            setPopupPosition(position);
            setClickedCluster(cluster);
            applyHighlight();
          };

          const validEntries = expedition.entries.filter(
            (e) => e.coords.lat !== 0 || e.coords.lng !== 0,
          );
          const clusters = clusterEntriesByProximity(validEntries, thresholdForZoom(map.getZoom()));

          clusters.forEach((cluster) => {
            if (cluster.entries.length === 1) {
              const entry = cluster.entries[0];
              const { container, applyHighlight } = createSingleEntryMarker(expedition.color);

              const marker = new mapboxgl.Marker(container)
                .setLngLat([entry.coords.lng, entry.coords.lat])
                .addTo(map);

              const handler = () => handleEntryClick(entry, container, applyHighlight);
              container.addEventListener('click', handler);
              eventListeners.push({ element: container, handler });
              markersRef.current.push(marker);
            } else {
              const { container, applyHighlight } = createClusterMarker(
                cluster.entries.length,
                darkenColor(expedition.color),
              );

              const marker = new mapboxgl.Marker(container)
                .setLngLat([cluster.center.lng, cluster.center.lat])
                .addTo(map);

              const handler = () => handleClusterClick(cluster, container, applyHighlight);
              container.addEventListener('click', handler);
              eventListeners.push({ element: container, handler });
              markersRef.current.push(marker);
            }
          });
        });

        // Zoom-based cluster dissolution for expedition mode
        const expeditionZoomHandler = () => {
          const zoom = map.getZoom();
          const threshold = thresholdForZoom(zoom);

          // Remove only entry markers (keep waypoint markers which aren't in markersRef)
          eventListeners.forEach(({ element, handler }) => element.removeEventListener('click', handler));
          eventListeners.length = 0;
          markersRef.current.forEach(m => m.remove());
          markersRef.current = [];

          const removeAll = () => {
            markersRef.current.forEach(m => {
              const el = m.getElement();
              if (el && (el as any).removeHighlight) (el as any).removeHighlight();
            });
          };

          expeditions.forEach((expedition) => {
            const valid = expedition.entries.filter(e => e.coords.lat !== 0 || e.coords.lng !== 0);
            const cls = clusterEntriesByProximity(valid, threshold);

            cls.forEach((cluster) => {
              if (cluster.entries.length === 1) {
                const entry = cluster.entries[0];
                const { container, applyHighlight } = createSingleEntryMarker(expedition.color);
                const marker = new mapboxgl.Marker(container)
                  .setLngLat([entry.coords.lng, entry.coords.lat])
                  .addTo(map);
                const handler = () => {
                  removeAll();
                  const pos = mapContainerRef.current
                    ? computePopupPosition(container, mapContainerRef.current)
                    : 'bottom-right' as PopupPosition;
                  setClickedCluster(null);
                  setSourceCluster(null);
                  setPopupPosition(pos);
                  setClickedEntry(entry);
                  applyHighlight();
                };
                container.addEventListener('click', handler);
                eventListeners.push({ element: container, handler });
                markersRef.current.push(marker);
              } else {
                const { container, applyHighlight } = createClusterMarker(
                  cluster.entries.length,
                  darkenColor(expedition.color),
                );
                const marker = new mapboxgl.Marker(container)
                  .setLngLat([cluster.center.lng, cluster.center.lat])
                  .addTo(map);
                const handler = () => {
                  removeAll();
                  const pos = mapContainerRef.current
                    ? computePopupPosition(container, mapContainerRef.current)
                    : 'bottom-right' as PopupPosition;
                  setClickedEntry(null);
                  setSourceCluster(null);
                  setPopupPosition(pos);
                  setClickedCluster(cluster);
                  applyHighlight();
                };
                container.addEventListener('click', handler);
                eventListeners.push({ element: container, handler });
                markersRef.current.push(marker);
              }
            });
          });
        };
        map.on('zoomend', expeditionZoomHandler);
      } else if (mapMode === 'all-entries') {
        const result = renderClusteredMarkers<JournalEntry>({
          entries: allEntries,
          map,
          mapContainerRef,
          onSingleEntryClick: (entry, position) => {
            setClickedCluster(null);
            setSourceCluster(null);
            setPopupPosition(position);
            setClickedEntry(entry);
          },
          onClusterClick: (cluster, position) => {
            setClickedEntry(null);
            setSourceCluster(null);
            setPopupPosition(position);
            setClickedCluster(cluster);
          },
        });
        markersRef.current = result.markers;
        map.on('zoomend', result.recalculate);
      }
    });

    // Cleanup
    return () => {
      eventListeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      setClickedCluster(null);
      map.remove();
    };
  }, [expeditions, allEntries, mapMode, theme, mapLayer, nauticalOverlay]);

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

        {/* No Active Expedition Overlay */}
        {mapMode === 'expedition' && !hasActiveExpedition && (
          <div className="absolute inset-0 z-10">
            <div className="absolute inset-0 bg-[#b5bcc4]/80 dark:bg-[#202020]/80" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 text-center">
              <Globe className="w-8 h-8 md:w-12 md:h-12 text-[#616161] dark:text-[#b5bcc4] mb-2 md:mb-4" />
              <p className="text-sm md:text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 md:mb-2">
                No active expedition
              </p>
              <p className="text-xs md:text-sm text-[#616161] dark:text-[#b5bcc4]">
                {explorerName ? `${explorerName} doesn't have` : 'No'} an active expedition right now.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Position Popup Overlay - Entry Mode */}
        {clickedEntry && (
          <div 
            className={`absolute w-96 max-w-[calc(100%-2rem)] max-h-[calc(100vh-100px)] overflow-y-auto bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              popupPosition === 'bottom-left' ? 'bottom-[20px] left-4' : 'bottom-[20px] right-4'
            }`}
          >
            <div className="p-3 text-xs font-mono">
              {sourceCluster && (
                <button
                  onClick={() => {
                    setClickedEntry(null);
                    setClickedCluster(sourceCluster);
                    setSourceCluster(null);
                    markersRef.current.forEach(m => {
                      const el = m.getElement();
                      if (el && (el as any).removeHighlight) (el as any).removeHighlight();
                    });
                  }}
                  className="flex items-center gap-1 text-[10px] text-[#ac6d46] hover:underline mb-2"
                >
                  <ChevronLeft className="w-3 h-3" />
                  BACK TO {sourceCluster.entries.length} ENTRIES
                </button>
              )}
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
                    setSourceCluster(null);
                    markersRef.current.forEach(m => {
                      const el = m.getElement();
                      if (el && (el as any).removeHighlight) (el as any).removeHighlight();
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
                  onClick={() => window.open(`/entry/${clickedEntry.id}`, '_blank')}
                  className="w-full bg-[#ac6d46] text-white py-2 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold mt-2 whitespace-nowrap"
                >
                  VIEW ENTRY
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cluster Timeline Popup */}
        {clickedCluster && (
          <ClusterTimelinePopup
            cluster={clickedCluster}
            position={popupPosition}
            className="w-96 max-w-[calc(100%-2rem)] bottom-[20px]"
            onClose={() => {
              setClickedCluster(null);
              markersRef.current.forEach(m => {
                const el = m.getElement();
                if (el && (el as any).removeHighlight) (el as any).removeHighlight();
              });
            }}
            onEntrySelect={(entry) => {
              setSourceCluster(clickedCluster);
              setClickedCluster(null);
              setClickedEntry(entry);
            }}
            renderEntryMeta={(entry) => (
              <>{entry.explorerName} {entry.expeditionName ? `• ${entry.expeditionName}` : ''}</>
            )}
          />
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
                  <span
                    className="text-xs px-2 py-1 text-white rounded-full shrink-0"
                    style={{ backgroundColor: expedition.color }}
                  >
                    {expedition.status.toUpperCase()}
                  </span>
                  <div className="text-xs">
                    <Link href={`/expedition/${expedition.id}`} className="font-serif font-bold dark:text-[#e5e5e5] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] transition-colors">
                      {expedition.title}
                    </Link>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">
                      {expedition.waypoints.length} waypoints • {expedition.entries.length} entries
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-xs mt-4 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-[18px] h-[18px] bg-[#ac6d46] border-2 border-white rounded-full" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                </div>
                <span>Journal Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-[22px] h-[22px] bg-[#ac6d46] border-2 border-white rounded-full" style={{ boxShadow: '0 0 0 3px #ac6d46, 0 2px 6px rgba(0,0,0,0.4)' }} />
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
                  <div className="w-[18px] h-[18px] rounded-full bg-[#616161] border-2 border-white" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
                <span>Waypoint</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-[18px] h-[18px] rounded-full bg-[#ac6d46] border-2 border-white" style={{ boxShadow: '0 0 0 3px rgba(172,109,70,0.3)', animation: 'wp-pulse 2s ease-out infinite' }} />
                </div>
                <span>Current Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 flex items-center justify-center shrink-0">
                  <div className="w-6 h-0.5 bg-[#ac6d46]" />
                </div>
                <span>Completed Route</span>
              </div>
              {(() => {
                // Show route mode indicator(s) matching the detail page
                const modes = [...new Set(expeditions.map(e => e.routeMode).filter(Boolean))] as string[];
                if (modes.length > 0 && modes.some(m => m !== 'straight')) {
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
                      <div className="w-6 h-0.5 bg-[#202020] dark:bg-[#4676ac]" />
                    </div>
                    <span>Planned Route</span>
                  </div>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ALL ENTRIES VIEW:</div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
              Showing all journal entries from {explorerName} across all expeditions. Click any marker to view entry details.
            </div>
          </>
        )}
      </div>
    </div>
  );
}