'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTheme } from '@/app/context/ThemeContext';
import {
  useMapLayer,
  getMapStyle,
  getLineCasingColor,
  applyNauticalOverlay,
} from '@/app/context/MapLayerContext';
import {
  clusterEntriesByProximity,
  createSingleEntryMarker,
  createClusterMarker,
  computePopupPosition,
  darkenColor,
  thresholdForZoom,
  type EntryCluster,
  type PopupPosition,
} from '@/app/utils/mapClustering';
import { Globe, X } from 'lucide-react';
import type {
  IHistoricalArchiveEntry,
  IHistoricalArchiveExpedition,
} from '@repo/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}
mapboxgl.accessToken = MAPBOX_TOKEN;

// Earthy palette that complements the brand copper/slate/blue.
// 19 hues + cycle if more expeditions ever land.
const PALETTE = [
  '#ac6d46', // copper (brand)
  '#4676ac', // blue (brand)
  '#598636', // green (brand)
  '#8a5738', // dark copper
  '#365a87', // slate blue
  '#3f6027', // dark green
  '#a04040', // brick red
  '#b8860b', // dark goldenrod
  '#5d4037', // brown
  '#7e57c2', // muted purple
  '#26a69a', // teal
  '#558b6e', // sage
  '#c0392b', // crimson
  '#d97706', // amber
  '#475569', // slate
  '#7c4a1f', // burnt
  '#4f7942', // fern
  '#a16207', // mustard
  '#1e40af', // royal blue
];

function colorForExpedition(publicId: string, index: number): string {
  // Deterministic per-publicId, but biased toward sequential indices to
  // keep adjacent expeditions visually distinct.
  let h = 0;
  for (let i = 0; i < publicId.length; i++) {
    h = (h * 31 + publicId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[(index + (h % 7)) % PALETTE.length];
}

interface MarkerEntry {
  id: string;
  title: string;
  cleanTitle: string;
  date: string;
  coords: { lat: number; lng: number };
  href: string;
  expeditionPublicId: string;
  expeditionColor: string;
  explorer: string;
  expeditionTitle: string;
}

interface ExpeditionVisual {
  publicId: string;
  cleanTitle: string;
  explorer: string;
  color: string;
  entryCount: number;
  href: string;
}

interface Props {
  expeditions: IHistoricalArchiveExpedition[];
  entries: IHistoricalArchiveEntry[];
}

export function HistoricalArchiveMap({ expeditions, entries }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const eventListenersRef = useRef<Array<{ element: HTMLElement; handler: () => void }>>([]);

  const { theme } = useTheme();
  const { mapLayer, nauticalOverlay } = useMapLayer();

  const [clickedEntry, setClickedEntry] = useState<MarkerEntry | null>(null);
  const [clickedCluster, setClickedCluster] = useState<EntryCluster<MarkerEntry> | null>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>('bottom-left');
  const [focusedExpedition, setFocusedExpedition] = useState<string | null>(null);

  // Build expedition → color and marker entries.
  const { expeditionVisuals, markerEntries, expeditionEntries } = useMemo(() => {
    // Stable ordering by start_date asc to keep colors consistent across renders.
    const sortedExpeditions = [...expeditions].sort((a, b) => {
      const ad = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bd = b.startDate ? new Date(b.startDate).getTime() : 0;
      return ad - bd;
    });

    const colorByExp = new Map<string, string>();
    const titleByExp = new Map<string, string>();
    const explorerByExp = new Map<string, string>();
    const slugByExp = new Map<string, string>();
    sortedExpeditions.forEach((x, i) => {
      colorByExp.set(x.publicId, colorForExpedition(x.publicId, i));
      titleByExp.set(x.publicId, x.cleanTitle);
      explorerByExp.set(x.publicId, x.explorer);
      slugByExp.set(x.publicId, x.slug || x.publicId);
    });

    // Web Mercator projects lat ±90° to ±infinity, so markers at the actual
    // poles (Peary, Amundsen, Scott) render off-screen. Clamp the display lat
    // for marker placement; the entry data itself stays accurate.
    const MERCATOR_LAT_CAP = 84.9;
    const me: MarkerEntry[] = entries
      .filter((e) => e.expeditionPublicId && colorByExp.has(e.expeditionPublicId))
      .map((e) => {
        const rawLat = e.lat as number;
        const displayLat = Math.max(
          -MERCATOR_LAT_CAP,
          Math.min(MERCATOR_LAT_CAP, rawLat),
        );
        return {
          id: e.publicId,
          title: e.title,
          cleanTitle: e.cleanTitle,
          date: e.date ? new Date(e.date).toISOString() : '',
          coords: { lat: displayLat, lng: e.lon as number },
          href: `/entry/${e.slug || e.publicId}`,
          expeditionPublicId: e.expeditionPublicId as string,
          expeditionColor: colorByExp.get(e.expeditionPublicId as string) as string,
          explorer: e.explorer || explorerByExp.get(e.expeditionPublicId as string) || '',
          expeditionTitle: e.expeditionTitle || titleByExp.get(e.expeditionPublicId as string) || '',
        };
      });

    // Group entries by expedition for polyline drawing.
    const byExp = new Map<string, MarkerEntry[]>();
    for (const m of me) {
      const list = byExp.get(m.expeditionPublicId) || [];
      list.push(m);
      byExp.set(m.expeditionPublicId, list);
    }
    for (const list of byExp.values()) {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    const visuals: ExpeditionVisual[] = sortedExpeditions.map((x) => ({
      publicId: x.publicId,
      cleanTitle: x.cleanTitle,
      explorer: x.explorer,
      color: colorByExp.get(x.publicId) as string,
      entryCount: byExp.get(x.publicId)?.length || 0,
      href: `/expedition/${x.slug || x.publicId}`,
    }));

    return {
      expeditionVisuals: visuals,
      markerEntries: me,
      expeditionEntries: byExp,
    };
  }, [expeditions, entries]);

  // Visible entries (legend toggle filter).
  const visibleEntries = useMemo(() => {
    if (!focusedExpedition) return markerEntries;
    return markerEntries.filter((m) => m.expeditionPublicId === focusedExpedition);
  }, [markerEntries, focusedExpedition]);

  // Track polyline source IDs so we can clean them up between renders
  // without destroying the map.
  const polylineSourcesRef = useRef<Set<string>>(new Set());
  // Re-render handler stored in a ref so the zoomend listener can call the
  // latest closure (which references the current visibleEntries) even
  // though we never re-bind the listener.
  const renderMarkersRef = useRef<(() => void) | null>(null);

  // --- Effect 1: Initialize the map (runs only when reasons-to-recreate
  // change: theme, map layer, nautical overlay, or whether we have any
  // markers at all). Filter/focus state lives in Effect 2 below so legend
  // clicks don't tear down the map. ---
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (markerEntries.length === 0) return;

    const allCoords: [number, number][] = markerEntries.map(
      (m) => [m.coords.lng, m.coords.lat] as [number, number],
    );
    const bounds = allCoords.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]),
    );

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(mapLayer, theme),
      bounds,
      fitBoundsOptions: { padding: { top: 40, right: 40, bottom: 40, left: 40 } },
      projection: 'mercator',
      dragRotate: false,
      touchPitch: false,
      maxPitch: 0,
      renderWorldCopies: false,
      maxBounds: [
        [-180, -85],
        [180, 85],
      ],
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('error', (e) => {
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) return;
      console.error('Mapbox error:', e);
    });

    const onZoomEnd = () => {
      if (renderMarkersRef.current) renderMarkersRef.current();
    };
    map.on('zoomend', onZoomEnd);

    map.on('load', () => {
      applyNauticalOverlay(map, nauticalOverlay);
    });

    return () => {
      eventListenersRef.current.forEach(({ element, handler }) =>
        element.removeEventListener('click', handler),
      );
      eventListenersRef.current = [];
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      polylineSourcesRef.current.clear();
      setClickedEntry(null);
      setClickedCluster(null);
      mapRef.current = null;
      map.remove();
    };
  }, [theme, mapLayer, nauticalOverlay, markerEntries.length]);

  // --- Effect 2: Render polylines + markers for the current filter state.
  // Runs on focused-expedition / visible-entries changes without
  // recreating the map. ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const drawPolylines = () => {
      // Remove any previous expedition polylines first.
      for (const sourceId of polylineSourcesRef.current) {
        const lineLayer = `${sourceId}-line`;
        const casingLayer = `${sourceId}-casing`;
        if (map.getLayer(lineLayer)) map.removeLayer(lineLayer);
        if (map.getLayer(casingLayer)) map.removeLayer(casingLayer);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
      polylineSourcesRef.current.clear();

      // Only draw the connecting line when an expedition is isolated —
      // drawing every expedition's chronological zigzag at once turns the
      // map into a chaotic web that hides the markers.
      if (!focusedExpedition) return;
      const list = expeditionEntries.get(focusedExpedition);
      if (!list || list.length < 2) return;

      const casingColor = getLineCasingColor(mapLayer, theme);
      const coords = list.map((e) => [e.coords.lng, e.coords.lat] as [number, number]);
      const color = list[0].expeditionColor;
      const sourceId = `arch-route-${focusedExpedition}`;
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });
      map.addLayer({
        id: `${sourceId}-casing`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': casingColor,
          'line-width': 4,
          'line-opacity': 0.3,
        },
      });
      map.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-opacity': 0.7,
          'line-dasharray': [3, 2],
        },
      });
      polylineSourcesRef.current.add(sourceId);
    };

    const removeAllHighlights = () => {
      markersRef.current.forEach((m) => {
        const el = m.getElement();
        if (el && (el as any).removeHighlight) (el as any).removeHighlight();
      });
    };

    const renderMarkers = () => {
      eventListenersRef.current.forEach(({ element, handler }) =>
        element.removeEventListener('click', handler),
      );
      eventListenersRef.current = [];
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const zoom = map.getZoom();
      const threshold = thresholdForZoom(zoom);

      // Cluster within each expedition group so different expeditions don't
      // blob together under a single muddy marker.
      const byExp = new Map<string, MarkerEntry[]>();
      for (const m of visibleEntries) {
        const list = byExp.get(m.expeditionPublicId) || [];
        list.push(m);
        byExp.set(m.expeditionPublicId, list);
      }

      for (const list of byExp.values()) {
        const color = list[0].expeditionColor;
        const clusters = clusterEntriesByProximity(list, threshold);

        clusters.forEach((cluster) => {
          if (cluster.entries.length === 1) {
            const entry = cluster.entries[0];
            const { container, applyHighlight } = createSingleEntryMarker(color);
            const marker = new mapboxgl.Marker(container)
              .setLngLat([entry.coords.lng, entry.coords.lat])
              .addTo(map);
            const handler = () => {
              removeAllHighlights();
              const pos = mapContainerRef.current
                ? computePopupPosition(container, mapContainerRef.current)
                : ('bottom-right' as PopupPosition);
              setClickedCluster(null);
              setPopupPosition(pos);
              setClickedEntry(entry);
              applyHighlight();
            };
            container.addEventListener('click', handler);
            eventListenersRef.current.push({ element: container, handler });
            markersRef.current.push(marker);
          } else {
            const { container, applyHighlight } = createClusterMarker(
              cluster.entries.length,
              darkenColor(color),
            );
            const marker = new mapboxgl.Marker(container)
              .setLngLat([cluster.center.lng, cluster.center.lat])
              .addTo(map);
            const handler = () => {
              removeAllHighlights();
              const pos = mapContainerRef.current
                ? computePopupPosition(container, mapContainerRef.current)
                : ('bottom-right' as PopupPosition);
              setClickedEntry(null);
              setPopupPosition(pos);
              setClickedCluster(cluster);
              applyHighlight();
            };
            container.addEventListener('click', handler);
            eventListenersRef.current.push({ element: container, handler });
            markersRef.current.push(marker);
          }
        });
      }
    };

    // Keep zoomend handler pointed at the freshest closure.
    renderMarkersRef.current = renderMarkers;

    const draw = () => {
      drawPolylines();
      renderMarkers();
    };

    if (map.isStyleLoaded()) {
      draw();
    } else {
      const onLoad = () => draw();
      map.once('load', onLoad);
      return () => {
        map.off('load', onLoad);
      };
    }
  }, [focusedExpedition, visibleEntries, expeditionEntries, theme, mapLayer]);

  const formatShortDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  return (
    <section className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
      {/* Map section header */}
      <div className="bg-[#616161] text-white px-4 md:px-6 py-2.5 md:py-3 border-b-2 border-[#202020] dark:border-[#4a4a4a] flex items-center justify-between gap-3">
        <h2 className="text-xs md:text-sm font-bold tracking-[0.14em]">
          THE EXPLORER ATLAS
        </h2>
        <div className="flex items-center gap-3">
          {focusedExpedition && (
            <button
              onClick={() => setFocusedExpedition(null)}
              className="text-[10px] md:text-xs font-mono text-white hover:text-[#ac6d46] tracking-wider whitespace-nowrap"
            >
              ← SHOW ALL
            </button>
          )}
          <span className="text-[10px] md:text-xs font-mono text-[#e5e5e5] whitespace-nowrap">
            {visibleEntries.length} MARKERS
          </span>
        </div>
      </div>

      {/* Map + Legend layout. Map fills container width on narrow screens
          and pins to 720×720 on lg+, with the legend column filling the
          remaining horizontal space. */}
      <div className="flex flex-col lg:flex-row">
        {/* Map container — square (Web Mercator at ±85° lat is square, so
            this fills with no empty sides + no tile repeats). */}
        <div
          className="relative bg-[#b5bcc4] dark:bg-[#2a2a2a] w-full lg:flex-shrink-0"
          style={{ aspectRatio: '1 / 1', maxWidth: '720px' }}
        >
          <div ref={mapContainerRef} className="absolute top-0 left-0 w-full h-full" />

        {markerEntries.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <Globe className="w-10 h-10 text-[#616161] dark:text-[#b5bcc4] mb-3" />
            <p className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
              No geotagged entries yet.
            </p>
          </div>
        )}

        {/* Entry popup */}
        {clickedEntry && (
          <div
            className={`absolute max-w-[calc(100%-2rem)] w-80 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              popupPosition === 'bottom-left' ? 'bottom-5 left-4' : 'bottom-5 right-4'
            }`}
          >
            <div
              className="flex items-center justify-between px-3 py-2 border-b-2 border-[#202020] dark:border-[#616161]"
              style={{ backgroundColor: clickedEntry.expeditionColor }}
            >
              <span className="text-[10px] font-mono font-bold tracking-wider text-white">
                JOURNAL ENTRY
              </span>
              <button
                onClick={() => {
                  setClickedEntry(null);
                  markersRef.current.forEach((m) => {
                    const el = m.getElement();
                    if (el && (el as any).removeHighlight) (el as any).removeHighlight();
                  });
                }}
                className="text-white hover:text-[#202020]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider mb-1">
                {formatShortDate(clickedEntry.date)}
              </div>
              <h3 className="font-serif font-bold text-base text-[#202020] dark:text-[#e5e5e5] leading-snug mb-2">
                {clickedEntry.cleanTitle}
              </h3>
              <div className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider mb-3 truncate">
                {clickedEntry.explorer} · {clickedEntry.expeditionTitle}
              </div>
              <Link
                href={clickedEntry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-2 text-[10px] font-mono font-bold tracking-wider bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors"
              >
                READ ENTRY →
              </Link>
            </div>
          </div>
        )}

        {/* Cluster popup */}
        {clickedCluster && (
          <div
            className={`absolute max-w-[calc(100%-2rem)] w-80 max-h-[400px] overflow-y-auto bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              popupPosition === 'bottom-left' ? 'bottom-5 left-4' : 'bottom-5 right-4'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 bg-[#616161] border-b-2 border-[#202020] dark:border-[#616161] sticky top-0">
              <span className="text-[10px] font-mono font-bold tracking-wider text-white">
                {clickedCluster.entries.length} ENTRIES
              </span>
              <button
                onClick={() => {
                  setClickedCluster(null);
                  markersRef.current.forEach((m) => {
                    const el = m.getElement();
                    if (el && (el as any).removeHighlight) (el as any).removeHighlight();
                  });
                }}
                className="text-white hover:text-[#ac6d46]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-[#b5bcc4] dark:divide-[#3a3a3a]">
              {clickedCluster.entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setClickedCluster(null);
                    setClickedEntry(entry);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors"
                >
                  <div className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider mb-0.5">
                    {formatShortDate(entry.date)}
                  </div>
                  <div className="font-serif text-sm font-bold text-[#202020] dark:text-[#e5e5e5] leading-snug">
                    {entry.cleanTitle}
                  </div>
                  <div className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider truncate mt-0.5">
                    {entry.explorer}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* Legend — sits below the map on narrow screens, beside it on lg+.
            Uses overflow-y-auto so a long list scrolls within the map's
            height instead of growing the section. */}
        <div className="flex-1 min-w-0 flex flex-col border-t-2 lg:border-t-0 lg:border-l-2 border-[#202020] dark:border-[#616161]">
          <div className="bg-[#616161] text-white px-4 md:px-6 py-2 border-b-2 border-[#202020] dark:border-[#4a4a4a] flex items-center justify-between lg:hidden">
            <span className="text-[10px] md:text-xs font-bold tracking-[0.14em]">
              LEGEND
            </span>
            <span className="text-[10px] font-mono text-[#e5e5e5]">
              CLICK TO ISOLATE
            </span>
          </div>
          <div className="p-3 md:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-1 lg:overflow-y-auto lg:flex-1">
            {expeditionVisuals.map((v) => {
              const isActive = focusedExpedition === v.publicId;
              const isOther = focusedExpedition !== null && !isActive;
              return (
                // Anchor so crawlers see 19 internal links to the expedition
                // pages. Regular click toggles map isolation; modifier-click
                // (cmd/ctrl/middle) navigates normally.
                <a
                  key={v.publicId}
                  href={v.href}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                    e.preventDefault();
                    setFocusedExpedition(isActive ? null : v.publicId);
                  }}
                  className={`flex items-center gap-2 py-1.5 px-2 text-left transition-opacity border-l-4 ${
                    isOther ? 'opacity-40' : ''
                  } ${isActive ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]' : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'}`}
                  style={{ borderLeftColor: v.color }}
                >
                  <span
                    className="inline-block w-3 h-3 shrink-0 border border-[#202020] dark:border-[#616161]"
                    style={{ backgroundColor: v.color }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-serif text-xs font-bold text-[#202020] dark:text-[#e5e5e5] truncate">
                      {v.cleanTitle}
                    </span>
                    <span className="block text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider truncate">
                      {v.explorer.toUpperCase()} · {v.entryCount} {v.entryCount === 1 ? 'ENTRY' : 'ENTRIES'}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
