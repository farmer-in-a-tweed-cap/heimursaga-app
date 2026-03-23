import mapboxgl from 'mapbox-gl';

// ---------------------------------------------------------------------------
// Route mode color/style constants — consistent across builder, detail, atlas
// ---------------------------------------------------------------------------

export const ROUTE_MODE_STYLES: Record<string, { color: string; label: string; dash: number[] | null; width: number }> = {
  straight: { color: '#999999', label: 'Straight Line', dash: [2, 2], width: 3 },
  walking:  { color: '#4676ac', label: 'Walking', dash: null, width: 4 },
  cycling:  { color: '#9b59b6', label: 'Cycling', dash: null, width: 4 },
  driving:  { color: '#d35400', label: 'Driving', dash: null, width: 4 },
  trail:    { color: '#598636', label: 'Trail', dash: [4, 2], width: 4 },
  waterway: { color: '#ac6d46', label: 'Waterway', dash: [6, 3], width: 4 },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RouteWaypoint = {
  id: string;
  coords: { lat: number; lng: number };
  status: 'completed' | 'current' | 'planned';
  entryId?: string | null;
};

export type RouteEntry = {
  id: string;
  coords: { lat: number; lng: number };
};

export type DrawRouteLinesParams = {
  routeCoordinates: number[][];
  hasDirectionsRoute: boolean;
  casingColor: string;
  theme: string;
  routeMode?: string;
};

export type DrawCompletedRouteParams = {
  routeCoordinates: number[][];
  hasDirectionsRoute: boolean;
  casingColor: string;
  currentLocCoords: { lng: number; lat: number };
  waypoints: RouteWaypoint[];
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
};

export type AddWaypointMarkersParams = {
  waypoints: RouteWaypoint[];
  isRoundTrip: boolean;
  /** Banner markers are non-interactive (30px/24px); modal markers are smaller (26px/22px). */
  interactive: boolean;
};

export type AddEntryMarkerDotsOptions = {
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
};

export type FitMapToCoordsOptions = {
  padding?: number;
  maxZoom?: number;
  duration?: number;
};

export type FindCompletedRouteCoordsParams = {
  routeCoordinates: number[][];
  hasDirectionsRoute: boolean;
  currentLocCoords: { lng: number; lat: number };
  waypoints: RouteWaypoint[];
  currentLocationSource?: 'waypoint' | 'entry';
};

// ---------------------------------------------------------------------------
// 1. drawRouteLines
// ---------------------------------------------------------------------------

/**
 * Adds the main route-line source and layers (casing + core) to a mapbox map.
 * Must be called after `map.on('load')`.
 */
export function drawRouteLines(
  map: mapboxgl.Map,
  params: DrawRouteLinesParams,
): void {
  const { routeCoordinates, hasDirectionsRoute, casingColor, theme, routeMode } = params;

  if (routeCoordinates.length < 2) return;

  const style = ROUTE_MODE_STYLES[routeMode || ''] || ROUTE_MODE_STYLES.straight;

  map.addSource('route-line', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: routeCoordinates },
    },
  });

  map.addLayer({
    id: 'route-line-casing',
    type: 'line',
    source: 'route-line',
    paint: {
      'line-color': casingColor,
      'line-width': hasDirectionsRoute ? 8 : 7,
      'line-opacity': 0.3,
    },
  });

  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'route-line',
    paint: {
      'line-color': style.color,
      'line-width': hasDirectionsRoute ? style.width : 3,
      'line-opacity': 0.8,
      ...(hasDirectionsRoute && style.dash ? { 'line-dasharray': style.dash } : !hasDirectionsRoute ? { 'line-dasharray': [2, 2] } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// 2. drawCompletedRoute
// ---------------------------------------------------------------------------

/**
 * Adds the completed-route overlay (casing + core) to a mapbox map.
 * Must be called after `map.on('load')`.
 */
export function drawCompletedRoute(
  map: mapboxgl.Map,
  params: DrawCompletedRouteParams,
): void {
  const {
    routeCoordinates,
    hasDirectionsRoute,
    casingColor,
    currentLocCoords,
    waypoints,
    currentLocationSource,
  } = params;

  if (routeCoordinates.length < 2) return;

  const completedCoords = findCompletedRouteCoords({
    routeCoordinates,
    hasDirectionsRoute,
    currentLocCoords,
    waypoints,
    currentLocationSource,
  });

  if (completedCoords.length < 2) return;

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
    paint: { 'line-color': casingColor, 'line-width': 8, 'line-opacity': 0.3 },
  });

  map.addLayer({
    id: 'completed-route',
    type: 'line',
    source: 'completed-route',
    paint: { 'line-color': '#ac6d46', 'line-width': 4, 'line-opacity': 0.9 },
  });
}

// ---------------------------------------------------------------------------
// 3. addWaypointMarkers
// ---------------------------------------------------------------------------

/**
 * Creates diamond-shaped waypoint markers, skipping any waypoint that has an
 * `entryId` (those are rendered as entry markers instead).
 *
 * Banner (non-interactive) markers use 30px/24px diamonds.
 * Modal (interactive) markers use 26px/22px diamonds.
 *
 * Returns the array of created Marker instances so callers can clean them up.
 */
export function addWaypointMarkers(
  map: mapboxgl.Map,
  params: AddWaypointMarkersParams,
): mapboxgl.Marker[] {
  const { waypoints, isRoundTrip, interactive } = params;
  const markers: mapboxgl.Marker[] = [];

  // Sizes differ between banner (non-interactive) and modal (interactive)
  const lgSize = interactive ? '26px' : '30px';
  const smSize = interactive ? '22px' : '24px';
  const lgFont = interactive ? '14px' : '13px';
  const smFont = interactive ? '12px' : '11px';
  const markerClass = interactive ? 'waypoint-marker' : 'banner-waypoint-marker';

  waypoints.forEach((wp, idx) => {
    // Skip rendering diamond for waypoints that have been converted to entries
    if (wp.entryId) return;

    const isStart = idx === 0;
    const isEnd = !isRoundTrip && idx === waypoints.length - 1 && waypoints.length > 1;
    const isCurrent = wp.status === 'current';

    const wrapper = document.createElement('div');
    wrapper.className = markerClass;

    const diamond = document.createElement('div');
    Object.assign(diamond.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: 'rotate(45deg)',
    });

    const label = document.createElement('span');
    Object.assign(label.style, {
      transform: 'rotate(-45deg)',
      color: 'white',
      fontWeight: 'bold',
      lineHeight: '1',
    });

    if (isStart && isRoundTrip) {
      Object.assign(diamond.style, {
        width: lgSize,
        height: lgSize,
        backgroundColor: '#ac6d46',
        border: '3px solid #4676ac',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      });
      label.style.fontSize = lgFont;
      label.textContent = 'S';
    } else if (isStart || isEnd) {
      Object.assign(diamond.style, {
        width: lgSize,
        height: lgSize,
        backgroundColor: isStart ? '#ac6d46' : '#4676ac',
        border: '3px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      });
      label.style.fontSize = lgFont;
      label.textContent = isStart ? 'S' : 'E';
    } else {
      // Intermediate waypoint — gray circle (no diamond)
      Object.assign(wrapper.style, {
        width: smSize,
        height: smSize,
        borderRadius: '50%',
        backgroundColor: '#616161',
        border: '2px solid white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      const circleLabel = document.createElement('span');
      Object.assign(circleLabel.style, {
        color: 'white',
        fontWeight: 'bold',
        fontSize: smFont,
        lineHeight: '1',
      });
      circleLabel.textContent = String(idx + 1);
      wrapper.appendChild(circleLabel);

      if (isCurrent) {
        wrapper.style.animation = 'wp-pulse 2s ease-out infinite';
      }

      const marker = new mapboxgl.Marker(wrapper)
        .setLngLat([wp.coords.lng, wp.coords.lat])
        .addTo(map);
      markers.push(marker);
      return; // skip diamond append below
    }

    diamond.appendChild(label);
    wrapper.appendChild(diamond);

    if (isCurrent) {
      diamond.style.animation = 'wp-pulse 2s ease-out infinite';
    }

    const marker = new mapboxgl.Marker(wrapper)
      .setLngLat([wp.coords.lng, wp.coords.lat])
      .addTo(map);

    markers.push(marker);
  });

  return markers;
}

// ---------------------------------------------------------------------------
// 4. addEntryMarkerDots
// ---------------------------------------------------------------------------

/**
 * Adds non-interactive circle entry markers (for the banner map).
 * The current-location entry gets the pulse animation.
 */
export function addEntryMarkerDots(
  map: mapboxgl.Map,
  entries: RouteEntry[],
  options: AddEntryMarkerDotsOptions = {},
): mapboxgl.Marker[] {
  const { currentLocationSource, currentLocationId } = options;
  const markers: mapboxgl.Marker[] = [];

  entries
    .filter(entry => entry.coords.lat !== 0 || entry.coords.lng !== 0)
    .forEach((entry) => {
      const el = document.createElement('div');
      el.className = 'banner-entry-marker';
      Object.assign(el.style, {
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        backgroundColor: '#ac6d46',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      });

      if (currentLocationSource === 'entry' && currentLocationId === entry.id) {
        el.style.animation = 'wp-pulse 2s ease-out infinite';
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([entry.coords.lng, entry.coords.lat])
        .addTo(map);

      markers.push(marker);
    });

  return markers;
}

// ---------------------------------------------------------------------------
// 5. injectPulseAnimation
// ---------------------------------------------------------------------------

/**
 * Idempotently injects the `wp-pulse` CSS keyframe animation into the
 * document head. Safe to call multiple times — only creates the style
 * element once.
 */
export function injectPulseAnimation(): void {
  if (document.getElementById('wp-pulse-style')) return;

  const style = document.createElement('style');
  style.id = 'wp-pulse-style';
  style.textContent = `
    @keyframes wp-pulse {
      0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
      100% { box-shadow: 0 0 0 16px rgba(255,255,255,0); }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// 6. fitMapToCoords
// ---------------------------------------------------------------------------

/**
 * Fits a mapbox map to the bounding box of the given coordinate array.
 * Does nothing if `coords` is empty.
 */
export function fitMapToCoords(
  map: mapboxgl.Map,
  coords: [number, number][],
  options: FitMapToCoordsOptions = {},
): void {
  if (coords.length === 0) return;

  const { padding = 50, maxZoom = 10, duration = 500 } = options;

  const bounds = coords.reduce(
    (b, coord) => b.extend(coord),
    new mapboxgl.LngLatBounds(coords[0], coords[0]),
  );

  map.fitBounds(bounds, { padding, maxZoom, duration });
}

// ---------------------------------------------------------------------------
// 7. findCompletedRouteCoords
// ---------------------------------------------------------------------------

/**
 * Computes the portion of the route that has been completed, based on the
 * current location.
 *
 * - For directions routes (dense point sets): finds the nearest coordinate
 *   and slices up to that index.
 * - For fallback routes (waypoint-to-waypoint): uses waypoint `status` to
 *   determine which segments are complete.
 */
export function findCompletedRouteCoords(
  params: FindCompletedRouteCoordsParams,
): number[][] {
  const {
    routeCoordinates,
    hasDirectionsRoute,
    currentLocCoords,
    waypoints,
    currentLocationSource,
  } = params;

  if (hasDirectionsRoute) {
    // Dense point set — nearest-coordinate search works fine
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < routeCoordinates.length; i++) {
      const [lng, lat] = routeCoordinates[i];
      const d =
        Math.pow(lng - currentLocCoords.lng, 2) +
        Math.pow(lat - currentLocCoords.lat, 2);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }
    return routeCoordinates.slice(0, closestIdx + 1);
  }

  // Fallback route (waypoint-to-waypoint) — use waypoint status
  const completedCoords: number[][] = waypoints
    .filter(
      (w) =>
        (w.status === 'completed' || w.status === 'current') &&
        (w.coords.lat !== 0 || w.coords.lng !== 0),
    )
    .map((w) => [w.coords.lng, w.coords.lat]);

  if (currentLocationSource === 'entry') {
    completedCoords.push([currentLocCoords.lng, currentLocCoords.lat]);
  }

  return completedCoords;
}

// ---------------------------------------------------------------------------
// 8. drawPreviewRoute
// ---------------------------------------------------------------------------

/**
 * Draws a translucent expedition route overlay on the atlas map when an entry
 * marker is clicked. Uses `preview-` prefixed IDs to avoid collisions with
 * expedition detail page layers.
 */
export function drawPreviewRoute(
  map: mapboxgl.Map,
  params: { routeCoordinates: number[][]; hasDirectionsRoute: boolean; casingColor: string; theme: string },
): void {
  const { routeCoordinates, hasDirectionsRoute, casingColor, theme } = params;
  if (routeCoordinates.length < 2 || !map.isStyleLoaded()) return;

  // Remove stale artifacts before adding
  removePreviewRoute(map);

  map.addSource('preview-route-line', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: routeCoordinates },
    },
  });

  map.addLayer({
    id: 'preview-route-line-casing',
    type: 'line',
    source: 'preview-route-line',
    paint: {
      'line-color': casingColor,
      'line-width': 6,
      'line-opacity': 0.2,
    },
  });

  map.addLayer({
    id: 'preview-route-line',
    type: 'line',
    source: 'preview-route-line',
    paint: {
      'line-color': theme === 'dark' ? '#4676ac' : '#ac6d46',
      'line-width': 3,
      'line-opacity': 0.6,
      ...(hasDirectionsRoute ? {} : { 'line-dasharray': [2, 2] }),
    },
  });
}

// ---------------------------------------------------------------------------
// 9. removePreviewRoute
// ---------------------------------------------------------------------------

/**
 * Removes all preview route layers, sources, and markers from the map.
 * Safe to call even if no preview is currently drawn.
 */
export function removePreviewRoute(map: mapboxgl.Map | null | undefined): void {
  if (!map || !map.isStyleLoaded()) return;
  ['preview-route-line', 'preview-route-line-casing'].forEach(id => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (map.getSource('preview-route-line')) map.removeSource('preview-route-line');
}
