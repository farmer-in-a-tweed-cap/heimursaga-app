'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { Navigation, X } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useTheme } from '@/app/context/ThemeContext';
import { useMapLayer, getMapStyle, getLineCasingColor } from '@/app/context/MapLayerContext';
import { projectToSegment } from '@/app/utils/routeSnapping';

// ---------------------------------------------------------------------------
// Mapbox token
// ---------------------------------------------------------------------------
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaypointSelectorMapProps {
  expeditionWaypoints: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    sequence: number;
    entryIds: string[];
  }>;
  expeditionRouteGeometry?: number[][];
  isRoundTrip?: boolean;
  onSelectExisting: (waypointId: string, coords: { lat: number; lng: number }) => void;
  onSelectNew: (coords: { lat: number; lng: number }, sequence: number) => void;
  onClose: () => void;
}

interface PendingNewWaypoint {
  lat: number;
  lng: number;
  sequence: number;
}

// ---------------------------------------------------------------------------
// Marker element factories
// ---------------------------------------------------------------------------

/** Blue diamond — unconverted waypoint (no entries yet) */
function createUnconvertedMarkerEl(title: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.title = title;
  wrapper.style.cssText =
    'width:18px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;';

  const diamond = document.createElement('div');
  diamond.style.cssText =
    'width:14px;height:14px;transform:rotate(45deg);background:#4676ac;border:2px solid white;' +
    'box-shadow:0 2px 4px rgba(0,0,0,0.3);';

  wrapper.appendChild(diamond);
  return wrapper;
}

/** Brown circle — converted waypoint (has linked entries) */
function createConvertedMarkerEl(title: string): HTMLDivElement {
  const el = document.createElement('div');
  el.title = title;
  el.style.cssText =
    'width:16px;height:16px;border-radius:50%;background:#ac6d46;border:2px solid white;' +
    'box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer;';
  return el;
}

/** Pulsing dashed circle — pending new waypoint being placed */
function createNewWaypointMarkerEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'waypoint-selector-new-pin';
  el.style.cssText =
    'width:20px;height:20px;border-radius:50%;background:#4676ac;border:3px dashed white;' +
    'box-shadow:0 0 0 3px rgba(70,118,172,0.4);cursor:default;' +
    'animation:waypointSelectorPulse 1.5s ease-in-out infinite;';
  return el;
}

// ---------------------------------------------------------------------------
// Sequence computation
// ---------------------------------------------------------------------------

/**
 * Given a click point and the route geometry, compute which sequence number
 * the new waypoint should receive.
 *
 * Strategy: find the closest segment index among waypoint-to-waypoint segments
 * (using `projectToSegment`), then insert after the waypoint at that segment
 * start index.  Returns a fractional sequence (e.g. 2.5) so the caller can
 * order it between existing waypoints; the backend or parent should round/
 * re-index as needed.
 */
function computeInsertionSequence(
  clickLat: number,
  clickLng: number,
  waypoints: WaypointSelectorMapProps['expeditionWaypoints'],
): number {
  if (waypoints.length === 0) return 1;
  if (waypoints.length === 1) return waypoints[0].sequence + 1;

  const sorted = [...waypoints].sort((a, b) => a.sequence - b.sequence);
  const p = { lat: clickLat, lng: clickLng };

  let bestDistSq = Infinity;
  let bestSegIdx = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const { distSq } = projectToSegment(p, sorted[i], sorted[i + 1]);
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestSegIdx = i;
    }
  }

  // Insert between sorted[bestSegIdx] and sorted[bestSegIdx + 1]
  const prev = sorted[bestSegIdx].sequence;
  const next = sorted[bestSegIdx + 1].sequence;
  return (prev + next) / 2;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaypointSelectorMap({
  expeditionWaypoints,
  expeditionRouteGeometry,
  isRoundTrip,
  onSelectExisting,
  onSelectNew,
  onClose,
}: WaypointSelectorMapProps) {
  const { theme } = useTheme();
  const { mapLayer } = useMapLayer();

  const [mapReady, setMapReady] = useState(false);
  const [pendingWaypoint, setPendingWaypoint] = useState<PendingNewWaypoint | null>(null);
  const [existingEntryNotice, setExistingEntryNotice] = useState<{
    waypointId: string;
    entryCount: number;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const waypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const newPinMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Keep latest prop values in refs so map event closures stay current
  const waypointsRef = useRef(expeditionWaypoints);
  const routeGeomRef = useRef(expeditionRouteGeometry);
  const isRoundTripRef = useRef(isRoundTrip);
  useEffect(() => { waypointsRef.current = expeditionWaypoints; }, [expeditionWaypoints]);
  useEffect(() => { routeGeomRef.current = expeditionRouteGeometry; }, [expeditionRouteGeometry]);
  useEffect(() => { isRoundTripRef.current = isRoundTrip; }, [isRoundTrip]);

  // Small delay so the container is in the DOM before Mapbox measures it
  useEffect(() => {
    const t = setTimeout(() => setMapReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  // ---------------------------------------------------------------------------
  // Remove pending new-pin marker from map
  // ---------------------------------------------------------------------------
  const clearNewPin = useCallback(() => {
    if (newPinMarkerRef.current) {
      newPinMarkerRef.current.remove();
      newPinMarkerRef.current = null;
    }
    setPendingWaypoint(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Map initialisation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current;
    const wps = waypointsRef.current;
    const routeGeom = routeGeomRef.current;
    const roundTrip = isRoundTripRef.current;

    // Build initial center from first valid waypoint or world view
    const firstValid = wps.find(w => w.lat !== 0 || w.lng !== 0);
    const center: [number, number] = firstValid
      ? [firstValid.lng, firstValid.lat]
      : [0, 20];

    const map = new mapboxgl.Map({
      container,
      style: getMapStyle(mapLayer, theme),
      center,
      zoom: firstValid ? 7 : 1.5,
    });

    map.on('load', () => {
      map.resize();

      // -----------------------------------------------------------------------
      // Build route line coordinates
      // -----------------------------------------------------------------------
      let routeCoords: number[][] = [];
      if (routeGeom && routeGeom.length >= 2) {
        routeCoords = routeGeom;
      } else if (wps.length >= 2) {
        const sorted = [...wps].sort((a, b) => a.sequence - b.sequence);
        routeCoords = sorted
          .filter(w => w.lat !== 0 || w.lng !== 0)
          .map(w => [w.lng, w.lat]);
        if (roundTrip && routeCoords.length > 0) {
          routeCoords = [...routeCoords, routeCoords[0]];
        }
      }

      // -----------------------------------------------------------------------
      // Draw route line
      // -----------------------------------------------------------------------
      if (routeCoords.length >= 2) {
        const hasDirections = !!routeGeom && routeGeom.length >= 2;

        map.addSource('ws-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: routeCoords },
          },
        });

        map.addLayer({
          id: 'ws-route-casing',
          type: 'line',
          source: 'ws-route',
          paint: {
            'line-color': getLineCasingColor(mapLayer, theme),
            'line-width': hasDirections ? 8 : 7,
            'line-opacity': 0.3,
          },
        });

        map.addLayer({
          id: 'ws-route',
          type: 'line',
          source: 'ws-route',
          paint: {
            'line-color': theme === 'dark' ? '#4676ac' : '#202020',
            'line-width': hasDirections ? 4 : 3,
            'line-opacity': 0.8,
            ...(hasDirections ? {} : { 'line-dasharray': [2, 2] }),
          },
        });
      }

      // -----------------------------------------------------------------------
      // Add waypoint markers
      // -----------------------------------------------------------------------
      wps.forEach(wp => {
        if (wp.lat === 0 && wp.lng === 0) return;

        const isConverted = wp.entryIds.length > 0;
        const el = isConverted
          ? createConvertedMarkerEl(wp.title)
          : createUnconvertedMarkerEl(wp.title);

        el.addEventListener('click', (e) => {
          // Prevent the click from bubbling up to the map (which would open the
          // new-waypoint flow instead of selecting this existing waypoint).
          e.stopPropagation();
          clearNewPin();

          if (isConverted) {
            setExistingEntryNotice({ waypointId: wp.id, entryCount: wp.entryIds.length });
          } else {
            setExistingEntryNotice(null);
          }

          onSelectExisting(wp.id, { lat: wp.lat, lng: wp.lng });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([wp.lng, wp.lat])
          .addTo(map);

        waypointMarkersRef.current.push(marker);
      });

      // -----------------------------------------------------------------------
      // Fit bounds to all waypoints
      // -----------------------------------------------------------------------
      const validWps = wps.filter(w => w.lat !== 0 || w.lng !== 0);
      if (validWps.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validWps.forEach(w => bounds.extend([w.lng, w.lat]));
        map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
      }
    });

    // -----------------------------------------------------------------------
    // Map click — place a new waypoint pin
    // -----------------------------------------------------------------------
    map.on('click', (e) => {
      const { lat, lng } = e.lngLat;
      const currentWps = waypointsRef.current;
      const sequence = computeInsertionSequence(lat, lng, currentWps);

      // Remove existing pending pin
      if (newPinMarkerRef.current) {
        newPinMarkerRef.current.remove();
        newPinMarkerRef.current = null;
      }

      // Dismiss any existing-entry notice when starting a new placement
      setExistingEntryNotice(null);

      const pinEl = createNewWaypointMarkerEl();
      const pin = new mapboxgl.Marker({ element: pinEl })
        .setLngLat([lng, lat])
        .addTo(map);

      newPinMarkerRef.current = pin;
      setPendingWaypoint({ lat, lng, sequence });
    });

    // Suppress non-critical Mapbox internal style warnings
    map.on('error', (e) => {
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) return;
      console.error('Mapbox error:', e);
    });

    // -----------------------------------------------------------------------
    // Controls
    // -----------------------------------------------------------------------
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: 'Search for a location...',
      trackProximity: true,
    });
    map.addControl(geocoder as any, 'top-left');

    if (navigator.geolocation) {
      try {
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
          showUserHeading: false,
        });
        geolocate.on('error', () => { /* silently handle */ });
        map.addControl(geolocate, 'top-right');
      } catch {
        // GeolocateControl unavailable — continue without it
      }
    }

    mapRef.current = map;

    return () => {
      waypointMarkersRef.current.forEach(m => m.remove());
      waypointMarkersRef.current = [];
      if (newPinMarkerRef.current) {
        newPinMarkerRef.current.remove();
        newPinMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
    // mapReady, theme, mapLayer are the only stable dependencies that should
    // trigger a full re-initialisation (prop data is read from refs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, theme, mapLayer]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleConfirmNew = () => {
    if (!pendingWaypoint) return;
    onSelectNew(
      { lat: pendingWaypoint.lat, lng: pendingWaypoint.lng },
      pendingWaypoint.sequence,
    );
  };

  const handleCancelNew = () => {
    clearNewPin();
    setExistingEntryNotice(null);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Keyframe animation injected once into the document head */}
      <style>{`
        @keyframes waypointSelectorPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.75; }
        }
      `}</style>

      <div className="fixed inset-0 bg-[#202020]/90 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] w-full max-w-5xl max-h-[90vh] flex flex-col">

          {/* ---------------------------------------------------------------- */}
          {/* Header                                                           */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                SELECT WAYPOINT ON ROUTE
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#365a87] transition-all"
              aria-label="Close waypoint selector"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Info bar                                                         */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] px-4 py-2.5">
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
              Click an existing waypoint or tap the map to add a new one
            </p>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-2">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    transform: 'rotate(45deg)',
                    background: '#4676ac',
                    border: '1.5px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
                <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Unconverted waypoint
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#ac6d46',
                    border: '1.5px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
                <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Has entries
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#4676ac',
                    border: '2px dashed white',
                    boxShadow: '0 0 0 2px rgba(70,118,172,0.4)',
                  }}
                />
                <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  New waypoint
                </span>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Existing-entry notice (shown when a converted waypoint is clicked) */}
          {/* ---------------------------------------------------------------- */}
          {existingEntryNotice && (
            <div className="bg-[#ac6d46]/10 border-b-2 border-[#ac6d46]/40 px-4 py-2.5 flex items-center gap-2">
              <span className="text-xs text-[#ac6d46] font-bold">NOTE:</span>
              <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                This waypoint has{' '}
                <span className="font-bold text-[#ac6d46]">
                  {existingEntryNotice.entryCount}{' '}
                  {existingEntryNotice.entryCount === 1 ? 'existing entry' : 'existing entries'}
                </span>
                . Your entry will be added to this location.
              </span>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Map container                                                    */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex-1 relative" style={{ minHeight: '460px', height: '460px' }}>
            <div
              ref={mapContainerRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
              }}
            />
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Footer — pending confirmation or idle close button               */}
          {/* ---------------------------------------------------------------- */}
          {pendingWaypoint ? (
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#202020] dark:border-[#616161] p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-0.5">
                    NEW WAYPOINT AT
                  </div>
                  <div className="font-mono text-sm text-[#4676ac] font-bold">
                    {pendingWaypoint.lat.toFixed(6)}, {pendingWaypoint.lng.toFixed(6)}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                    Sequence position ~{pendingWaypoint.sequence.toFixed(1)}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelNew}
                    className="px-5 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#e5e5e5] dark:hover:bg-[#3a3a3a] transition-all text-xs font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleConfirmNew}
                    className="px-5 py-2 bg-[#4676ac] text-white font-bold hover:bg-[#365a87] transition-all text-xs"
                  >
                    CONFIRM
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#202020] dark:border-[#616161] p-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#e5e5e5] dark:hover:bg-[#3a3a3a] transition-all text-xs font-bold"
              >
                CLOSE
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
