'use client';

import { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { MapPin, X } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useTheme } from '@/app/context/ThemeContext';
import { useMapLayer, getMapStyle, getLineCasingColor } from '@/app/context/MapLayerContext';
import { buildMergedRouteCoords } from '@/app/utils/routeSnapping';
import { createPOIGeocoder, retrievePOI } from '@/app/utils/poiGeocoder';
import { toast } from 'sonner';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

interface LocationMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  // Optional expedition context
  expeditionWaypoints?: Array<{ id?: string; lat: number; lng: number; title: string; type?: 'start' | 'end' | 'standard' }>;
  expeditionEntries?: Array<{ id?: string; lat: number; lng: number; title: string }>;
  expeditionRouteGeometry?: number[][];
  isRoundTrip?: boolean;
  // Completed route overlay
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  // Fires when marker is placed/moved — true if on completed segment
  onCompletedSegmentDrop?: (isOnCompletedSegment: boolean) => void;
}

function createEntryMarkerElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#ac6d46;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:grab;';
  return el;
}

/** Find the closest segment on a route and insert a point at that position */
function insertPointIntoRoute(routeCoords: number[][], point: [number, number]): number[][] {
  if (routeCoords.length < 2) return routeCoords;

  let bestSegIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [ax, ay] = routeCoords[i];
    const [bx, by] = routeCoords[i + 1];
    // Project point onto segment and compute distance
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((point[0] - ax) * dx + (point[1] - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    const d = Math.pow(point[0] - px, 2) + Math.pow(point[1] - py, 2);
    if (d < bestDist) { bestDist = d; bestSegIdx = i; }
  }

  const result = [...routeCoords];
  result.splice(bestSegIdx + 1, 0, point);
  return result;
}

export function LocationMap({ initialLat, initialLng, onLocationSelect, onClose, expeditionWaypoints, expeditionEntries, expeditionRouteGeometry, isRoundTrip, currentLocationSource, currentLocationId, onCompletedSegmentDrop }: LocationMapProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [zoom, setZoom] = useState(initialLat && initialLng ? 13 : 1.5);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const expeditionMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const originalRouteCoordsRef = useRef<number[][]>([]);
  const completedEndIdxRef = useRef<number>(-1);
  // Keep latest prop values accessible inside map-event closures without
  // re-initialising the map when expedition data arrives asynchronously.
  const expeditionWaypointsRef = useRef(expeditionWaypoints);
  const expeditionEntriesRef = useRef(expeditionEntries);
  const expeditionRouteGeometryRef = useRef(expeditionRouteGeometry);
  const isRoundTripRef = useRef(isRoundTrip);
  const currentLocationSourceRef = useRef(currentLocationSource);
  const currentLocationIdRef = useRef(currentLocationId);
  useEffect(() => { expeditionWaypointsRef.current = expeditionWaypoints; }, [expeditionWaypoints]);
  useEffect(() => { expeditionEntriesRef.current = expeditionEntries; }, [expeditionEntries]);
  useEffect(() => { expeditionRouteGeometryRef.current = expeditionRouteGeometry; }, [expeditionRouteGeometry]);
  useEffect(() => { isRoundTripRef.current = isRoundTrip; }, [isRoundTrip]);
  useEffect(() => { currentLocationSourceRef.current = currentLocationSource; }, [currentLocationSource]);
  useEffect(() => { currentLocationIdRef.current = currentLocationId; }, [currentLocationId]);
  const { theme } = useTheme();
  const { mapLayer } = useMapLayer();

  // Delay map initialization to ensure container is rendered
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Compute and render the completed-route overlay.
  // This is called both from the map 'load' event and from a dedicated effect
  // that fires when expedition data changes after the map is already loaded.
  // Using a ref-based helper avoids stale closure issues.
  // ---------------------------------------------------------------------------
  const applyCompletedOverlay = (map: mapboxgl.Map, routeCoords: number[][]) => {
    const wps = expeditionWaypointsRef.current;
    const ents = expeditionEntriesRef.current;
    const src = currentLocationSourceRef.current;
    const locId = currentLocationIdRef.current;

    let currentLocCoords: { lng: number; lat: number } | null = null;
    if (src === 'waypoint' && locId) {
      const wp = wps?.find(w => String(w.id) === String(locId));
      if (wp) currentLocCoords = { lng: wp.lng, lat: wp.lat };
    } else if (src === 'entry' && locId) {
      const entry = ents?.find(e => String(e.id) === String(locId));
      if (entry && (entry.lat !== 0 || entry.lng !== 0)) {
        currentLocCoords = { lng: entry.lng, lat: entry.lat };
      }
    }

    // Fallback: if no explicit current location, use the entry farthest along the route
    if (!currentLocCoords && ents && ents.length > 0) {
      let farthestIdx = -1;
      for (const e of ents) {
        if (e.lat === 0 && e.lng === 0) continue;
        let closestPtIdx = 0;
        let closestPtDist = Infinity;
        for (let i = 0; i < routeCoords.length; i++) {
          const [lng, lat] = routeCoords[i];
          const d = Math.pow(lng - e.lng, 2) + Math.pow(lat - e.lat, 2);
          if (d < closestPtDist) { closestPtDist = d; closestPtIdx = i; }
        }
        if (closestPtIdx > farthestIdx) farthestIdx = closestPtIdx;
      }
      if (farthestIdx > 0) {
        const fe = ents.find(e => {
          if (e.lat === 0 && e.lng === 0) return false;
          let cIdx = 0, cDist = Infinity;
          for (let i = 0; i < routeCoords.length; i++) {
            const [lng, lat] = routeCoords[i];
            const d = Math.pow(lng - e.lng, 2) + Math.pow(lat - e.lat, 2);
            if (d < cDist) { cDist = d; cIdx = i; }
          }
          return cIdx === farthestIdx;
        });
        if (fe) currentLocCoords = { lng: fe.lng, lat: fe.lat };
      }
    }

    if (!currentLocCoords) {
      completedEndIdxRef.current = -1;
      return;
    }

    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < routeCoords.length; i++) {
      const [lng, lat] = routeCoords[i];
      const d = Math.pow(lng - currentLocCoords.lng, 2) + Math.pow(lat - currentLocCoords.lat, 2);
      if (d < closestDist) { closestDist = d; closestIdx = i; }
    }
    completedEndIdxRef.current = closestIdx;
    const completedCoords = routeCoords.slice(0, closestIdx + 1);
    if (completedCoords.length < 2) return;

    // Remove any existing completed-route layers/sources before re-adding
    if (map.getLayer('completed-route')) map.removeLayer('completed-route');
    if (map.getLayer('completed-route-casing')) map.removeLayer('completed-route-casing');
    if (map.getSource('completed-route')) map.removeSource('completed-route');

    map.addSource('completed-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: completedCoords },
      },
    });
    map.addLayer({
      id: 'completed-route-casing',
      type: 'line',
      source: 'completed-route',
      paint: { 'line-color': getLineCasingColor(mapLayer, theme), 'line-width': 8, 'line-opacity': 0.3 },
    });
    map.addLayer({
      id: 'completed-route',
      type: 'line',
      source: 'completed-route',
      paint: { 'line-color': '#ac6d46', 'line-width': 4, 'line-opacity': 0.9 },
    });
  };

  // Re-apply the completed overlay whenever expedition current-location data
  // changes (handles the common case where the map loads before the async
  // expedition API response arrives).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const routeCoords = originalRouteCoordsRef.current;
    if (routeCoords.length < 2) return;
    applyCompletedOverlay(map, routeCoords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocationSource, currentLocationId, expeditionWaypoints, expeditionEntries]);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current;

    // Initialize map - default to world view centered on Atlantic
    const map = new mapboxgl.Map({
      container: container,
      style: getMapStyle(mapLayer, theme),
      center: [initialLng || 0, initialLat || 20],
      zoom: zoom,
      projection: 'globe',
      dragRotate: false,
      touchPitch: false,
      maxPitch: 0,
      renderWorldCopies: false,
    });
    map.touchZoomRotate.disableRotation();

    // Resize map after it loads and render expedition context
    map.on('load', () => {
      map.resize();

      // Read expedition data from refs so that asynchronously-loaded expedition
      // data (which arrives after this closure was created) is used correctly.
      const wps = expeditionWaypointsRef.current;
      const ents = expeditionEntriesRef.current;
      const routeGeom = expeditionRouteGeometryRef.current;
      const roundTrip = isRoundTripRef.current;

      // Render expedition context if provided
      const hasExpeditionContext = (wps && wps.length > 0) || (ents && ents.length > 0);

      if (hasExpeditionContext) {
        // Build route coordinates: use provided geometry, or merge waypoints + entries
        let routeCoords: number[][] = [];
        if (routeGeom && routeGeom.length > 0) {
          routeCoords = routeGeom;
        } else {
          routeCoords = buildMergedRouteCoords(
            (wps ?? []).map(wp => ({ lat: wp.lat, lng: wp.lng })),
            (ents ?? []).map(e => ({ lat: e.lat, lng: e.lng })),
          );
        }

        // Close route for round trips (directions geometry already includes return)
        if (!routeGeom?.length && roundTrip && routeCoords.length > 0) {
          routeCoords = [...routeCoords, routeCoords[0]];
        }

        // Draw route line
        if (routeCoords.length >= 2) {
          originalRouteCoordsRef.current = routeCoords;
          const hasDirections = routeGeom && routeGeom.length > 0;
          map.addSource('expedition-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeCoords },
            },
          });
          map.addLayer({
            id: 'expedition-route-casing',
            type: 'line',
            source: 'expedition-route',
            paint: {
              'line-color': getLineCasingColor(mapLayer, theme),
              'line-width': hasDirections ? 8 : 7,
              'line-opacity': 0.3,
            },
          });
          map.addLayer({
            id: 'expedition-route',
            type: 'line',
            source: 'expedition-route',
            paint: {
              'line-color': theme === 'dark' ? '#4676ac' : '#202020',
              'line-width': hasDirections ? 4 : 3,
              'line-opacity': 0.8,
              ...(hasDirections ? {} : { 'line-dasharray': [2, 2] }),
            },
          });

          // Completed route overlay — reads from refs so it works even when
          // expedition data arrives after the map 'load' event fires.
          applyCompletedOverlay(map, routeCoords);
        }

        // Add entry markers first (so waypoint diamonds render on top)
        ents?.forEach(e => {
          if (e.lat === 0 && e.lng === 0) return;
          const el = document.createElement('div');
          el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#ac6d46;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
          el.title = e.title;
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([e.lng, e.lat])
            .addTo(map);
          expeditionMarkersRef.current.push(marker);
        });

        // Add waypoint markers on top (diamond shape, matching ExpeditionDetailPage)
        wps?.forEach((wp, idx) => {
          if (wp.lat === 0 && wp.lng === 0) return;
          const isStart = wp.type === 'start';
          const isEnd = wp.type === 'end';
          const isStartEnd = isStart || isEnd;
          const isStartAndRoundTrip = isStart && roundTrip;

          const wrapper = document.createElement('div');
          wrapper.title = wp.title;

          const diamond = document.createElement('div');
          const size = isStartEnd ? '26px' : '22px';
          const bgColor = isStartAndRoundTrip ? '#ac6d46' : isStart ? '#ac6d46' : isEnd ? '#4676ac' : '#616161';
          const borderStyle = isStartAndRoundTrip ? '3px solid #4676ac' : isStartEnd ? '3px solid white' : '2px solid white';
          diamond.style.cssText = `width:${size};height:${size};display:flex;align-items:center;justify-content:center;transform:rotate(45deg);background:${bgColor};border:${borderStyle};box-shadow:0 1px 4px rgba(0,0,0,0.3);`;

          const label = document.createElement('span');
          label.style.cssText = `transform:rotate(-45deg);color:white;font-weight:bold;line-height:1;font-size:${isStartEnd ? '14px' : '12px'};`;
          label.textContent = isStart ? 'S' : isEnd ? 'E' : String(idx + 1);

          diamond.appendChild(label);
          wrapper.appendChild(diamond);

          const marker = new mapboxgl.Marker({ element: wrapper })
            .setLngLat([wp.lng, wp.lat])
            .addTo(map);
          expeditionMarkersRef.current.push(marker);
        });

        // Fit bounds to include all expedition points + selected location
        const bounds = new mapboxgl.LngLatBounds();
        wps?.forEach(wp => {
          if (wp.lat !== 0 || wp.lng !== 0) bounds.extend([wp.lng, wp.lat]);
        });
        ents?.forEach(e => {
          if (e.lat !== 0 || e.lng !== 0) bounds.extend([e.lng, e.lat]);
        });
        if (initialLat && initialLng) {
          bounds.extend([initialLng, initialLat]);
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
        }
      }
    });

    // Add error handler - suppress style evaluation warnings
    map.on('error', (e) => {
      // Suppress Mapbox style expression evaluation warnings (non-critical)
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) {
        return; // These are harmless warnings from Mapbox's internal style
      }
      console.error('Mapbox error:', e);
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    // Add geocoder for location search
    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: false, // We'll add our own marker
      placeholder: 'Search for a location or business...',
      trackProximity: false,
      types: 'country,region,place,locality,neighborhood,address,poi',
      limit: 10,
      externalGeocoder: createPOIGeocoder(map),
    } as any);
    map.addControl(geocoder as any, 'top-left');

    // Manually manage proximity bias at all zoom levels
    const updateGeocoderProximity = () => {
      const center = map.getCenter();
      geocoder.setProximity({ longitude: center.lng, latitude: center.lat });
    };
    map.on('moveend', updateGeocoderProximity);
    map.on('load', updateGeocoderProximity);

    // Check if a point falls on the completed segment and notify parent + show toast.
    // Uses segment-based (point-to-line) distance, not vertex distance, so a marker
    // near the middle of a long segment is correctly detected.
    const checkCompletedSegment = (markerLng: number, markerLat: number) => {
      if (completedEndIdxRef.current < 0) return;
      const original = originalRouteCoordsRef.current;
      if (original.length < 2) return;

      // Find the closest route SEGMENT (edge between consecutive vertices)
      let closestSegIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < original.length - 1; i++) {
        const [ax, ay] = original[i];
        const [bx, by] = original[i + 1];
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        let t = lenSq === 0 ? 0 : ((markerLng - ax) * dx + (markerLat - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = ax + t * dx, py = ay + t * dy;
        const d = Math.pow(markerLng - px, 2) + Math.pow(markerLat - py, 2);
        if (d < closestDist) { closestDist = d; closestSegIdx = i; }
      }

      // Segment (i, i+1) is completed if i+1 <= completedEndIdx
      const isOnCompleted = closestSegIdx + 1 <= completedEndIdxRef.current;
      onCompletedSegmentDrop?.(isOnCompleted);
      if (isOnCompleted) {
        toast.warning('This location is on the completed route — make sure the entry date is today or earlier.', { duration: 5000 });
      }
    };

    // Update route display to include a placed entry marker
    const updateRouteForMarker = (markerLng: number, markerLat: number) => {
      const original = originalRouteCoordsRef.current;
      if (original.length < 2) return;
      const source = map.getSource('expedition-route') as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      const updated = insertPointIntoRoute(original, [markerLng, markerLat]);
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: updated },
      });
      checkCompletedSegment(markerLng, markerLat);
    };

    // Handle geocoder result — zoom to location only, don't drop a marker.
    // User must tap the map to place a marker, then confirm via the button.
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
      map.flyTo({ center: [lng, lat], zoom: 14 });
    });

    // Add geolocate control (only if geolocation is available)
    if (navigator.geolocation) {
      try {
        // Suppress console warnings temporarily
        const originalWarn = console.warn;
        const originalError = console.error;
        console.warn = () => {};
        console.error = () => {};
        
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        });
        
        // Restore console methods
        console.warn = originalWarn;
        console.error = originalError;
        
        // Suppress console errors from GeolocateControl
        geolocate.on('error', () => {
          // Silently handle errors - geolocation not available
        });
        
        map.addControl(geolocate, 'top-right');
        
        // Update position when geolocate finds user location (local only, confirm required)
        geolocate.on('geolocate', (e: any) => {
          const lat = e.coords.latitude;
          const lng = e.coords.longitude;
          setPosition({ lat, lng });
          setCurrentLocation({ lat, lng });
        });
      } catch {
        // Silently handle case where GeolocateControl cannot be initialized
      }
    }

    // Update zoom on zoom end
    map.on('zoom', () => {
      setZoom(map.getZoom());
    });

    // Handle map click — drop/move marker, update local position only.
    // Location is not confirmed until the user clicks CONFIRM LOCATION.
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setPosition({ lat, lng });

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      const marker = new mapboxgl.Marker({ element: createEntryMarkerElement(), draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setPosition({ lat: lngLat.lat, lng: lngLat.lng });
        updateRouteForMarker(lngLat.lng, lngLat.lat);
      });
      markerRef.current = marker;
      updateRouteForMarker(lng, lat);
    });

    // Add initial marker if position exists
    if (initialLat && initialLng) {
      const marker = new mapboxgl.Marker({ element: createEntryMarkerElement(), draggable: true })
        .setLngLat([initialLng, initialLat])
        .addTo(map);
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setPosition({ lat: lngLat.lat, lng: lngLat.lng });
        updateRouteForMarker(lngLat.lng, lngLat.lat);
      });
      markerRef.current = marker;
    }

    mapRef.current = map;

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      expeditionMarkersRef.current.forEach(m => m.remove());
      expeditionMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, theme, mapLayer]);

  // Update route source from outside the map effect (e.g. getCurrentLocation button)
  const updateRouteSource = (markerLng: number, markerLat: number) => {
    const original = originalRouteCoordsRef.current;
    if (original.length < 2 || !mapRef.current) return;
    const source = mapRef.current.getSource('expedition-route') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    const updated = insertPointIntoRoute(original, [markerLng, markerLat]);
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: updated },
    });
    // Check completed segment (segment-based distance)
    if (completedEndIdxRef.current >= 0) {
      let closestSegIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < original.length - 1; i++) {
        const [ax, ay] = original[i];
        const [bx, by] = original[i + 1];
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        let t = lenSq === 0 ? 0 : ((markerLng - ax) * dx + (markerLat - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = ax + t * dx, py = ay + t * dy;
        const d = Math.pow(markerLng - px, 2) + Math.pow(markerLat - py, 2);
        if (d < closestDist) { closestDist = d; closestSegIdx = i; }
      }
      const isOnCompleted = closestSegIdx + 1 <= completedEndIdxRef.current;
      onCompletedSegmentDrop?.(isOnCompleted);
      if (isOnCompleted) {
        toast.warning('This location is on the completed route — make sure the entry date is today or earlier.', { duration: 5000 });
      }
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setCurrentLocation({ lat, lng });

        // Fly to the new location and drop marker
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 13,
            duration: 2000,
          });

          // Remove existing marker
          if (markerRef.current) {
            markerRef.current.remove();
          }

          const marker = new mapboxgl.Marker({ element: createEntryMarkerElement(), draggable: true })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
          marker.on('dragend', () => {
            const lngLat = marker.getLngLat();
            setPosition({ lat: lngLat.lat, lng: lngLat.lng });
            updateRouteSource(lngLat.lng, lngLat.lat);
          });
          markerRef.current = marker;
          updateRouteSource(lng, lat);
        }

        setGettingLocation(false);
      },
      (error) => {
        // Silently handle geolocation errors - these are expected when:
        // - User denies permission
        // - Browser doesn't support geolocation
        // - Geolocation times out
        // User will be prompted to click on the map instead
        let errorMessage = 'Unable to retrieve your location. Please click on the map to select a location.';
        
        if (error.code === 1) {
          errorMessage = 'Location permission denied. Please click on the map to select a location.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable. Please click on the map to select a location.';
        } else if (error.code === 3) {
          errorMessage = 'Location request timed out. Please click on the map to select a location.';
        }
        
        toast.error(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const isCurrentLocation = currentLocation && position && 
    position.lat === currentLocation.lat && 
    position.lng === currentLocation.lng;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-[#202020] border-4 border-[#202020] dark:border-[#616161] w-full max-w-5xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              SELECT LOCATION ON MAP
            </h2>
            <div className="text-xs mt-1 text-[#e5e5e5]">
              Click anywhere on the map to set coordinates, or use your current location
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#365a87] transition-all"
            aria-label="Close map"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Coordinates Display & Controls */}
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold mb-1 text-[#202020] dark:text-[#e5e5e5]">
                SELECTED COORDINATES:
              </div>
              <div className="font-mono text-xs sm:text-sm text-[#616161] dark:text-[#b5bcc4]">
                {position ? (
                  <>
                    <span className="text-[#ac6d46] font-bold">
                      {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                    </span>
                    <span className="ml-2 sm:ml-3 text-xs">
                      (±{isCurrentLocation ? '10m accurate' : 'Manual selection'})
                    </span>
                  </>
                ) : (
                  'No location selected - click on map'
                )}
              </div>
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="px-4 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-xs sm:text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gettingLocation ? 'LOCATING...' : 'USE CURRENT LOCATION'}
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative" style={{ minHeight: '250px' }}>
          <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />

          {/* Map Instructions Overlay - hidden on mobile */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 max-w-xs z-10 shadow-lg hidden sm:block">
            <div className="text-xs font-bold mb-2 text-[#202020] dark:text-[#e5e5e5]">
              MAP INSTRUCTIONS:
            </div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
              <div>• Search for a location above</div>
              <div>• Click anywhere to drop a marker</div>
              <div>• Drag the marker to reposition</div>
              <div>• Scroll to zoom in/out</div>
              <div>• Use location button (top-right) for GPS</div>
            </div>
          </div>

          {/* Zoom Level & Map Info Indicator - hidden on mobile */}
          <div className="absolute bottom-4 right-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] px-3 py-2 z-10 font-mono text-xs hidden sm:block">
            <div className="space-y-1">
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Zoom:</span>{' '}
                <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                  {zoom.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Style:</span>{' '}
                <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                  Outdoors
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#202020] dark:border-[#616161] p-3 sm:p-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] hidden sm:block">
              <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">DATA SOURCE:</div>
              {isCurrentLocation ? (
                <div>Live GPS Capture (Real-time device location)</div>
              ) : position ? (
                <div>Map Reference (Mapbox manual selection)</div>
              ) : (
                <div>No location selected yet</div>
              )}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-2.5 sm:py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all text-sm font-bold"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (position) {
                    onLocationSelect(position.lat, position.lng);
                  }
                  onClose();
                }}
                disabled={!position}
                className="flex-1 sm:flex-none px-6 py-2.5 sm:py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CONFIRM LOCATION
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}