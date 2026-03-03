import mapboxgl from 'mapbox-gl';
import polyline from '@mapbox/polyline';
import { projectToSegment } from './routeSnapping';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export type POIResult = {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: { lat: number; lng: number };
  distanceFromRoute?: number; // meters, computed client-side
};

export type POICategory = {
  id: string;
  name: string;
};

/**
 * Stable session token — reused across geocoder re-instantiations to avoid
 * Mapbox billing each map re-init as a new session. Rotated only after 2 min
 * of inactivity (matching Mapbox's session expiry window).
 */
let _sessionToken = crypto.randomUUID();
let _sessionLastUsed = Date.now();

function getSessionToken(): string {
  const now = Date.now();
  // Rotate token after 2 min inactivity to match Mapbox session boundaries
  if (now - _sessionLastUsed > 2 * 60 * 1000) {
    _sessionToken = crypto.randomUUID();
  }
  _sessionLastUsed = now;
  return _sessionToken;
}

/**
 * Creates an externalGeocoder function for @mapbox/mapbox-gl-geocoder that
 * supplements standard Geocoding v5 results with POI data from the
 * Mapbox Search Box API (Foursquare-backed business/POI coverage).
 *
 * Cost optimization: only calls /suggest (billed per session). Coordinates
 * are resolved via a single /retrieve call only when the user selects a
 * result, triggered by the geocoder's 'result' event handler.
 */
export function createPOIGeocoder(map: mapboxgl.Map) {
  return async (query: string): Promise<any[]> => {
    if (query.length < 2) return [];

    const center = map.getCenter();
    const sessionToken = getSessionToken();

    try {
      // Only call /suggest — returns name, address, and mapbox_id (no coordinates)
      const suggestUrl =
        `https://api.mapbox.com/search/searchbox/v1/suggest` +
        `?q=${encodeURIComponent(query)}` +
        `&proximity=${center.lng},${center.lat}` +
        `&types=poi` +
        `&limit=3` +
        `&session_token=${sessionToken}` +
        `&access_token=${MAPBOX_TOKEN}`;

      const suggestRes = await fetch(suggestUrl);
      if (!suggestRes.ok) return [];
      const suggestData = await suggestRes.json();

      const suggestions = suggestData.suggestions || [];
      if (suggestions.length === 0) return [];

      // Return v5-compatible features using suggest data only (no /retrieve call).
      // We store mapbox_id so the geocoder result handler can /retrieve on selection.
      return suggestions.map((s: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] }, // placeholder — resolved on select
        center: [0, 0],
        place_name: [s.name, s.full_address || s.place_formatted].filter(Boolean).join(', '),
        text: s.name || '',
        properties: {
          mapbox_id: s.mapbox_id,
          name: s.name,
          full_address: s.full_address,
          place_formatted: s.place_formatted,
        },
      }));
    } catch {
      return [];
    }
  };
}

/**
 * Retrieve full coordinates for a POI by mapbox_id. Called once when the user
 * actually selects a result — avoids 3x /retrieve calls per keystroke.
 */
export async function retrievePOI(mapboxId: string): Promise<{
  lng: number; lat: number; name: string; address: string;
} | null> {
  const sessionToken = getSessionToken();
  try {
    const url =
      `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}` +
      `?session_token=${sessionToken}` +
      `&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates;
    return {
      lng, lat,
      name: f.properties.name || '',
      address: f.properties.full_address || f.properties.place_formatted || '',
    };
  } catch {
    return null;
  }
}

/**
 * Clip a route to the coordinates that fall within the given bounds,
 * with a buffer. Returns the clipped subset, or the full route if
 * most of it is visible.
 */
export function clipRouteToBounds(
  coords: number[][], // [lng, lat][]
  bounds: { west: number; south: number; east: number; north: number },
): number[][] {
  // Add ~20% buffer around the viewport so we include POIs just off-screen
  const lngSpan = bounds.east - bounds.west;
  const latSpan = bounds.north - bounds.south;
  const buffered = {
    west: bounds.west - lngSpan * 0.2,
    east: bounds.east + lngSpan * 0.2,
    south: bounds.south - latSpan * 0.2,
    north: bounds.north + latSpan * 0.2,
  };

  const inBounds = (c: number[]) =>
    c[0] >= buffered.west && c[0] <= buffered.east &&
    c[1] >= buffered.south && c[1] <= buffered.north;

  const clipped = coords.filter(inBounds);

  // If most of the route is visible, just use the full route
  if (clipped.length === 0 || clipped.length > coords.length * 0.8) {
    return coords;
  }

  return clipped;
}

/**
 * Simplify a coordinate array by sampling every Nth point,
 * always keeping first and last points.
 */
function simplifyCoords(coords: number[][], maxPoints: number): number[][] {
  if (coords.length <= maxPoints) return coords;
  const step = (coords.length - 1) / (maxPoints - 1);
  const result: number[][] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(coords[Math.round(i * step)]);
  }
  result.push(coords[coords.length - 1]);
  return result;
}

/**
 * Compute approximate distance in meters from a point to the nearest
 * segment of a route polyline.
 */
function distanceToRoute(
  point: { lat: number; lng: number },
  routeCoords: number[][], // [lng, lat][]
): number {
  let minDistSq = Infinity;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const a = { lat: routeCoords[i][1], lng: routeCoords[i][0] };
    const b = { lat: routeCoords[i + 1][1], lng: routeCoords[i + 1][0] };
    const { distSq } = projectToSegment(point, a, b);
    if (distSq < minDistSq) minDistSq = distSq;
  }
  // Convert degree-squared to approximate meters
  const degDist = Math.sqrt(minDistSq);
  return degDist * 111_320; // ~111km per degree at equator (rough approximation)
}

/**
 * Fetch the full list of Mapbox POI categories from the Search Box API.
 * Returns canonical_id + name pairs. Cached after first fetch.
 */
let _categoriesCache: POICategory[] | null = null;

export async function fetchPOICategories(): Promise<POICategory[]> {
  if (_categoriesCache) return _categoriesCache;
  try {
    const url =
      `https://api.mapbox.com/search/searchbox/v1/list/category` +
      `?access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    // API returns { listItems: [{ canonical_id, name, icon_name, ... }] }
    const items = data?.listItems || [];
    const cats: POICategory[] = items.map((c: any) => ({
      id: c.canonical_id,
      name: c.name,
    }));
    _categoriesCache = cats;
    return cats;
  } catch {
    return [];
  }
}

/**
 * Related categories to search together. When a user selects one category,
 * we also search these siblings to cover POIs that Mapbox classifies under
 * a different but closely related canonical_id.
 */
const CATEGORY_GROUPS: Record<string, string[]> = {
  grocery: ['grocery', 'supermarket', 'convenience_store'],
  supermarket: ['supermarket', 'grocery'],
  restaurant: ['restaurant', 'fast_food'],
  cafe: ['cafe', 'coffee'],
  hotel: ['hotel', 'lodging', 'motel'],
  lodging: ['lodging', 'hotel', 'motel', 'hostel'],
  hospital: ['hospital', 'urgent_care', 'clinic'],
  gas_station: ['gas_station', 'fuel'],
  bar: ['bar', 'pub', 'nightclub'],
  campground: ['campground', 'camping'],
};

/**
 * Cache for /category route search results. Key = categoryId|timeDeviation|routeHash.
 * Avoids re-fetching when the user clicks the same category or adjusts the slider
 * back to a previously searched value.
 */
const _routeSearchCache = new Map<string, POIResult[]>();

/**
 * Approximate total distance of a coordinate array in km.
 */
function approxRouteDistanceKm(coords: number[][]): number {
  let totalDeg = 0;
  for (let i = 1; i < coords.length; i++) {
    const dlng = coords[i][0] - coords[i - 1][0];
    const dlat = coords[i][1] - coords[i - 1][1];
    totalDeg += Math.sqrt(dlng * dlng + dlat * dlat);
  }
  return totalDeg * 111.32; // rough conversion
}

/**
 * Split a coordinate array into N overlapping segments.
 */
function splitRoute(coords: number[][], segments: number): number[][][] {
  if (segments <= 1 || coords.length < 4) return [coords];
  const segLen = Math.ceil(coords.length / segments);
  const overlap = Math.min(20, Math.floor(segLen * 0.1)); // 10% overlap
  const result: number[][][] = [];
  for (let i = 0; i < segments; i++) {
    const start = Math.max(0, i * segLen - overlap);
    const end = Math.min(coords.length, (i + 1) * segLen + overlap);
    result.push(coords.slice(start, end));
  }
  return result;
}

/**
 * Search a single category along a single route segment.
 */
async function searchSegment(
  catId: string,
  segmentCoords: number[][],
  timeDeviation: number,
  fullRouteCoords: number[][],
): Promise<POIResult[]> {
  const simplified = simplifyCoords(segmentCoords, 200);
  const latLngPairs = simplified.map(c => [c[1], c[0]]);
  const encoded = polyline.encode(latLngPairs);

  const url =
    `https://api.mapbox.com/search/searchbox/v1/category/${encodeURIComponent(catId)}` +
    `?sar_type=isochrone` +
    `&route=${encodeURIComponent(encoded)}` +
    `&route_geometry=polyline` +
    `&time_deviation=${timeDeviation}` +
    `&limit=25` +
    `&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features || []).map((f: any) => {
    const [lng, lat] = f.geometry.coordinates;
    const point = { lat, lng };
    return {
      id: f.properties.mapbox_id || f.id || crypto.randomUUID(),
      name: f.properties.name || 'Unknown',
      address: f.properties.full_address || f.properties.place_formatted || '',
      category: f.properties.poi_category_ids?.[0] || catId,
      coordinates: point,
      distanceFromRoute: distanceToRoute(point, fullRouteCoords),
    };
  });
}

/**
 * Search for POIs along a route using the Mapbox Search Box category endpoint
 * with search-along-route (SAR) isochrone filtering. Automatically searches
 * related categories in parallel to improve coverage. Long routes (>100km)
 * are split into segments to overcome the 25-result-per-request API limit.
 */
export async function searchAlongRoute(
  categoryId: string,
  routeCoordinates: number[][], // [lng, lat][]
  options?: { limit?: number; timeDeviation?: number },
): Promise<POIResult[]> {
  const timeDeviation = options?.timeDeviation ?? 5;

  // Check cache
  const simplified = simplifyCoords(routeCoordinates, 200);
  const latLngPairs = simplified.map(c => [c[1], c[0]]);
  const encoded = polyline.encode(latLngPairs);
  const cacheKey = `${categoryId}|${timeDeviation}|${encoded.slice(0, 100)}`;
  const cached = _routeSearchCache.get(cacheKey);
  if (cached) return cached;

  // Determine how many segments based on route length
  const distKm = approxRouteDistanceKm(routeCoordinates);
  const numSegments = distKm < 100 ? 1 : distKm < 300 ? 2 : 3;
  const segments = splitRoute(routeCoordinates, numSegments);

  // Search related categories × segments in parallel
  const categoryIds = CATEGORY_GROUPS[categoryId] || [categoryId];

  const allResults = await Promise.all(
    categoryIds.flatMap(catId =>
      segments.map(seg => searchSegment(catId, seg, timeDeviation, routeCoordinates))
    ),
  );

  // Merge and deduplicate by mapbox_id
  const seen = new Set<string>();
  const merged: POIResult[] = [];
  for (const results of allResults) {
    for (const poi of results) {
      if (!seen.has(poi.id)) {
        seen.add(poi.id);
        merged.push(poi);
      }
    }
  }

  // Sort by distance from route
  merged.sort((a, b) => (a.distanceFromRoute ?? Infinity) - (b.distanceFromRoute ?? Infinity));

  // Cache results (cap cache size to prevent memory growth)
  if (_routeSearchCache.size > 50) _routeSearchCache.clear();
  _routeSearchCache.set(cacheKey, merged);

  return merged;
}

/**
 * Clear the route search cache (e.g. when the route changes).
 */
export function clearRouteSearchCache() {
  _routeSearchCache.clear();
}
