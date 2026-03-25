'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { expeditionApi, type Expedition } from '@/app/services/api';
import {
  drawRouteLines,
  drawPerLegRouteLines,
  drawCompletedRoute,
  addWaypointMarkers,
  addEntryMarkerDots,
  injectPulseAnimation,
  fitMapToCoords,
  type RouteWaypoint,
  type RouteEntry,
} from '@/app/utils/mapRouteDrawing';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

mapboxgl.accessToken = MAPBOX_TOKEN;

const STATUS_COLORS: Record<string, string> = {
  active: '#ac6d46',
  planned: '#4676ac',
  completed: '#616161',
  cancelled: '#994040',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'ACTIVE EXPEDITION',
  planned: 'PLANNED EXPEDITION',
  completed: 'COMPLETED EXPEDITION',
  cancelled: 'CANCELLED EXPEDITION',
};

export function EmbedExpeditionMap({ expeditionId }: { expeditionId: string }) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Read theme from URL params (lazy initializer avoids flash + double map init)
  const [theme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return new URLSearchParams(window.location.search).get('theme') === 'dark' ? 'dark' : 'light';
  });

  // Fetch expedition data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await expeditionApi.getById(expeditionId);
        if (!cancelled) {
          setExpedition(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Expedition not found');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [expeditionId]);

  // Initialize map once data is loaded
  useEffect(() => {
    if (!expedition || !mapContainerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? STYLE_DARK : STYLE_LIGHT,
      interactive: false,
      attributionControl: false,
      projection: 'mercator',
    });

    mapRef.current = map;

    map.on('load', () => {
      const casingColor = theme === 'dark' ? '#ffffff' : '#202020';
      const hasDirectionsRoute = !!expedition.routeGeometry?.length;

      // Build route coordinates
      let routeCoordinates: number[][] = [];
      if (hasDirectionsRoute) {
        routeCoordinates = expedition.routeGeometry!;
      } else {
        const coords: number[][] = [];
        expedition.waypoints?.forEach(wp => {
          if (wp.lat && wp.lon) coords.push([wp.lon, wp.lat]);
        });
        expedition.entries?.forEach(e => {
          if (e.lat && e.lon) coords.push([e.lon, e.lat]);
        });
        routeCoordinates = coords;
      }

      // Transform waypoints for utilities
      const waypoints: RouteWaypoint[] = (expedition.waypoints || [])
        .filter(wp => wp.lat != null && wp.lon != null)
        .map((wp, i) => ({
          id: String(wp.id),
          coords: { lat: wp.lat!, lng: wp.lon! },
          status: (i === 0 ? 'completed' : 'planned') as 'completed' | 'current' | 'planned',
          entryId: wp.entryId || null,
        }));

      // Transform entries for utilities
      const entries: RouteEntry[] = (expedition.entries || [])
        .filter(e => e.lat != null && e.lon != null)
        .map(e => ({
          id: e.id,
          coords: { lat: e.lat!, lng: e.lon! },
        }));

      // Draw route
      if (routeCoordinates.length >= 2) {
        const legModes = expedition.routeLegModes;
        if (legModes && legModes.length > 1 && hasDirectionsRoute) {
          const wpLngLats: [number, number][] = waypoints.map(wp => [wp.coords.lng, wp.coords.lat]);
          drawPerLegRouteLines(map, {
            routeCoordinates,
            waypointLngLats: wpLngLats,
            legModes,
            casingColor,
            isRoundTrip: expedition.isRoundTrip,
          });
        } else {
          drawRouteLines(map, {
            routeCoordinates,
            hasDirectionsRoute,
            casingColor,
            theme,
            routeMode: expedition.routeMode,
          });
        }

        // Draw completed route for active expeditions
        if (expedition.status === 'active' && expedition.currentLocationSource && expedition.currentLocationId) {
          const currentWp = waypoints.find(w => w.id === expedition.currentLocationId);
          const currentEntry = entries.find(e => e.id === expedition.currentLocationId);
          const currentCoords = expedition.currentLocationSource === 'waypoint' && currentWp
            ? { lng: currentWp.coords.lng, lat: currentWp.coords.lat }
            : currentEntry
            ? { lng: currentEntry.coords.lng, lat: currentEntry.coords.lat }
            : null;

          if (currentCoords) {
            drawCompletedRoute(map, {
              routeCoordinates,
              hasDirectionsRoute,
              casingColor,
              currentLocCoords: currentCoords,
              waypoints,
              currentLocationSource: expedition.currentLocationSource as 'waypoint' | 'entry',
              currentLocationId: expedition.currentLocationId,
            });
          }
        }
      }

      // Add markers
      injectPulseAnimation();
      const wpMarkers = addWaypointMarkers(map, {
        waypoints,
        isRoundTrip: expedition.isRoundTrip || false,
        interactive: false,
      });
      const entryMarkers = addEntryMarkerDots(map, entries, {
        currentLocationSource: expedition.currentLocationSource as 'waypoint' | 'entry' | undefined,
        currentLocationId: expedition.currentLocationId,
      });
      markersRef.current = [...wpMarkers, ...entryMarkers];

      // Fit bounds
      const allCoords: [number, number][] = [];
      if (routeCoordinates.length > 0) {
        routeCoordinates.forEach(c => allCoords.push([c[0], c[1]]));
      }
      entries.forEach(e => allCoords.push([e.coords.lng, e.coords.lat]));
      waypoints.forEach(w => allCoords.push([w.coords.lng, w.coords.lat]));

      fitMapToCoords(map, allCoords, { padding: 40, maxZoom: 14, duration: 0 });
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  // theme is read once via lazy initializer — no need to re-init map on theme change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expedition]);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://heimursaga.com';
  const expeditionUrl = `${siteUrl}/expedition/${expeditionId}`;

  // Loading state
  if (loading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-[#202020]"
        style={{ backgroundImage: 'url(/patterns/topo-dark.svg)', backgroundRepeat: 'repeat', backgroundSize: '800px 800px' }}
      >
        <div className="text-xs font-mono text-[#b5bcc4] tracking-wide">LOADING EXPEDITION MAP...</div>
      </div>
    );
  }

  // Error state
  if (error || !expedition) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-[#202020]"
        style={{ backgroundImage: 'url(/patterns/topo-dark.svg)', backgroundRepeat: 'repeat', backgroundSize: '800px 800px' }}
      >
        <div className="text-xs font-mono text-[#b5bcc4] tracking-wide">{error?.toUpperCase() || 'EXPEDITION NOT FOUND'}</div>
      </div>
    );
  }

  const status = expedition.status || 'active';
  const statusColor = STATUS_COLORS[status] || '#616161';
  const statusLabel = STATUS_LABELS[status] || 'EXPEDITION';
  const showSponsor = !!(expedition.goal && expedition.goal > 0 && expedition.author?.stripeAccountConnected && status !== 'completed' && status !== 'cancelled');
  const sponsorUrl = `${siteUrl}/sponsor/${expedition.id || expeditionId}`;

  // Stats
  const distanceKm = expedition.totalDistanceKm || expedition.routeDistanceKm;
  const stats: { label: string; value: string }[] = [];
  if (expedition.entriesCount) stats.push({ label: 'ENTRIES', value: String(expedition.entriesCount) });
  if (expedition.waypointsCount) stats.push({ label: 'WAYPOINTS', value: String(expedition.waypointsCount) });
  if (distanceKm) stats.push({ label: 'DISTANCE', value: `${Math.round(distanceKm)} km` });
  if (expedition.sponsorsCount) stats.push({ label: 'SPONSORS', value: String(expedition.sponsorsCount) });

  return (
    <div className="w-full h-full flex flex-col bg-[#202020] border-2 border-[#616161]" style={{ minHeight: '200px' }}>
      {/* Status bar */}
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{ backgroundColor: statusColor }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white text-[10px] font-bold tracking-[0.14em] font-[family-name:var(--font-jost)]">
            {statusLabel}
          </span>
        </div>
        <span className="text-white/70 text-[10px] font-mono tracking-wide">
          {expedition.author?.username || 'Explorer'}
        </span>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="flex-1 w-full" style={{ minHeight: '120px' }} />

      {/* Stats row + title */}
      <div
        className="border-t-2 border-[#616161]"
        style={{ backgroundImage: 'url(/patterns/topo-dark.svg)', backgroundRepeat: 'repeat', backgroundSize: '800px 800px' }}
      >
        {/* Title row */}
        <a
          href={expeditionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 no-underline hover:bg-white/5 transition-colors"
        >
          <h2 className="text-sm font-semibold text-[#e5e5e5] truncate font-[family-name:var(--font-lora)]" style={{ lineHeight: 1.3 }}>
            {expedition.title}
          </h2>
          {expedition.region && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {expedition.region.split(', ').map(r => (
                <span key={r} className="text-[9px] font-bold tracking-[0.14em] text-[#4676ac] font-[family-name:var(--font-jost)]">
                  {r.toUpperCase()}
                </span>
              ))}
              {expedition.category && (
                <span className="text-[9px] font-bold tracking-[0.14em] text-[#b5bcc4] font-[family-name:var(--font-jost)]">
                  {expedition.category.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </a>

        {/* Stats bar */}
        {stats.length > 0 && (
          <div className="flex items-center border-t border-[#616161]/50 px-3 py-1.5 gap-4">
            {stats.map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold tracking-[0.14em] text-[#b5bcc4] font-[family-name:var(--font-jost)]">{s.label}</span>
                <span className="text-[10px] font-bold text-[#e5e5e5] font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom bar: Sponsor CTA + Heimursaga branding */}
        <div className="flex items-center justify-between px-3 py-2 border-t-2 border-[#616161]">
          <div className="flex items-center gap-2">
            {showSponsor && (
              <a
                href={sponsorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-[#ac6d46] text-white text-[10px] font-bold tracking-[0.14em] no-underline hover:bg-[#8a5738] transition-colors whitespace-nowrap font-[family-name:var(--font-jost)]"
              >
                SPONSOR THIS EXPEDITION
              </a>
            )}
          </div>
          <a
            href={expeditionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 no-underline hover:opacity-80 transition-opacity"
          >
            <span className="text-[10px] font-bold tracking-[0.14em] text-[#ac6d46] font-[family-name:var(--font-jost)]">
              HEIMURSAGA
            </span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[#ac6d46]">
              <path d="M3 1h6v6M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
