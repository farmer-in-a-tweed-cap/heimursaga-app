import { MAPBOX_TOKEN } from '@/services/mapConfig';

export type POIResult = {
  id: string;
  name: string;
  address: string;
  category: string;
  coordinates: { lat: number; lng: number };
  distanceFromRoute?: number; // meters
};

export type POICategory = {
  id: string;
  name: string;
};

// ── Curated quick-pick categories ────────────────────────────────────────────

export const QUICK_PICK_CATEGORIES: POICategory[] = [
  { id: 'restaurant', name: 'Restaurant' },
  { id: 'cafe', name: 'Cafe' },
  { id: 'hotel', name: 'Hotel' },
  { id: 'lodging', name: 'Lodging' },
  { id: 'gas_station', name: 'Gas Station' },
  { id: 'grocery', name: 'Grocery' },
  { id: 'supermarket', name: 'Supermarket' },
  { id: 'pharmacy', name: 'Pharmacy' },
  { id: 'hospital', name: 'Hospital' },
  { id: 'campground', name: 'Campground' },
  { id: 'parking', name: 'Parking' },
  { id: 'atm', name: 'ATM' },
  { id: 'drinking_water', name: 'Water' },
  { id: 'bar', name: 'Bar' },
  { id: 'place_of_worship', name: 'Worship' },
];

// Related categories to search together for better coverage
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
  place_of_worship: ['place_of_worship', 'church', 'mosque', 'synagogue', 'temple'],
};

// ── Polyline encoder (Google format, precision 5) ────────────────────────────

function encodePolyline(coords: number[][]): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;
  for (const [lat, lng] of coords) {
    const dLat = Math.round(lat * 1e5) - prevLat;
    const dLng = Math.round(lng * 1e5) - prevLng;
    prevLat += dLat;
    prevLng += dLng;
    result += encodeValue(dLat) + encodeValue(dLng);
  }
  return result;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let result = '';
  while (v >= 0x20) {
    result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  result += String.fromCharCode(v + 63);
  return result;
}

// ── Simple hash for cache keys ───────────────────────────────────────────────

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

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

function projectToSegment(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const cosLat = Math.cos((p.lat * Math.PI) / 180);
  const px = p.lng * cosLat, py = p.lat;
  const ax = a.lng * cosLat, ay = a.lat;
  const bx = b.lng * cosLat, by = b.lat;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  }
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return (px - projX) ** 2 + (py - projY) ** 2;
}

function distanceToRoute(
  point: { lat: number; lng: number },
  routeCoords: number[][], // [lng, lat][]
): number {
  let minDistSq = Infinity;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const a = { lat: routeCoords[i][1], lng: routeCoords[i][0] };
    const b = { lat: routeCoords[i + 1][1], lng: routeCoords[i + 1][0] };
    const distSq = projectToSegment(point, a, b);
    if (distSq < minDistSq) minDistSq = distSq;
  }
  return Math.sqrt(minDistSq) * 111_320; // degrees → meters
}

function approxRouteDistanceKm(coords: number[][]): number {
  let totalKm = 0;
  for (let i = 1; i < coords.length; i++) {
    const midLat = (coords[i][1] + coords[i - 1][1]) / 2;
    const cosLat = Math.cos((midLat * Math.PI) / 180);
    const dlng = (coords[i][0] - coords[i - 1][0]) * cosLat;
    const dlat = coords[i][1] - coords[i - 1][1];
    totalKm += Math.sqrt(dlng * dlng + dlat * dlat) * 111.32;
  }
  return totalKm;
}

function splitRoute(coords: number[][], segments: number): number[][][] {
  if (segments <= 1 || coords.length < 4) return [coords];
  const segLen = Math.ceil(coords.length / segments);
  const overlap = Math.max(1, Math.min(20, Math.floor(segLen * 0.1)));
  const result: number[][][] = [];
  for (let i = 0; i < segments; i++) {
    const start = Math.max(0, i * segLen - overlap);
    const end = Math.min(coords.length, (i + 1) * segLen + overlap);
    result.push(coords.slice(start, end));
  }
  return result;
}

// ── Search segment via Mapbox Search Box API ─────────────────────────────────

async function searchSegment(
  catId: string,
  segmentCoords: number[][],
  timeDeviation: number,
  fullRouteCoords: number[][],
  signal?: AbortSignal,
): Promise<POIResult[]> {
  const simplified = simplifyCoords(segmentCoords, 200);
  const latLngPairs = simplified.map(c => [c[1], c[0]]); // [lat, lng] for polyline
  const encoded = encodePolyline(latLngPairs);

  const url =
    `https://api.mapbox.com/search/searchbox/v1/category/${encodeURIComponent(catId)}` +
    `?sar_type=isochrone` +
    `&route=${encodeURIComponent(encoded)}` +
    `&route_geometry=polyline` +
    `&time_deviation=${timeDeviation}` +
    `&limit=25` +
    `&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) {
    // Throw on server errors / rate limits so caller can handle partial failures
    if (res.status >= 500 || res.status === 429) {
      throw new Error(`Mapbox API error: ${res.status}`);
    }
    return [];
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  return (data.features || []).map((f: any) => {
    const [lng, lat] = f.geometry.coordinates;
    const point = { lat, lng };
    return {
      id: f.properties?.mapbox_id || `${lng}_${lat}`,
      name: f.properties?.name || 'Unknown',
      address: f.properties?.full_address || f.properties?.place_formatted || '',
      category: f.properties?.poi_category_ids?.[0] || catId,
      coordinates: point,
      distanceFromRoute: distanceToRoute(point, fullRouteCoords),
    };
  });
}

// ── Cache ────────────────────────────────────────────────────────────────────

const _cache = new Map<string, POIResult[]>();

export function clearRouteSearchCache() {
  _cache.clear();
}

// ── Main search function ─────────────────────────────────────────────────────

export async function searchAlongRoute(
  categoryId: string,
  routeCoordinates: number[][], // [lng, lat][]
  options?: { timeDeviation?: number; signal?: AbortSignal },
): Promise<POIResult[]> {
  const timeDeviation = options?.timeDeviation ?? 30;
  const signal = options?.signal;

  // Cache check — hash the full polyline to avoid truncation collisions
  const simplified = simplifyCoords(routeCoordinates, 200);
  const latLngPairs = simplified.map(c => [c[1], c[0]]);
  const encoded = encodePolyline(latLngPairs);
  const cacheKey = `${categoryId}|${timeDeviation}|${djb2Hash(encoded)}`;
  const cached = _cache.get(cacheKey);
  if (cached) return cached;

  // Segment based on route length
  const distKm = approxRouteDistanceKm(routeCoordinates);
  const numSegments = distKm < 100 ? 1 : distKm < 300 ? 2 : 3;
  const segments = splitRoute(routeCoordinates, numSegments);

  // Search related categories × segments in parallel (tolerate partial failures)
  const categoryIds = CATEGORY_GROUPS[categoryId] || [categoryId];

  const settled = await Promise.allSettled(
    categoryIds.flatMap(catId =>
      segments.map(seg => searchSegment(catId, seg, timeDeviation, routeCoordinates, signal))
    ),
  );

  const allResults = settled
    .filter((r): r is PromiseFulfilledResult<POIResult[]> => r.status === 'fulfilled')
    .map(r => r.value);

  // Merge + deduplicate
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

  // Don't cache aborted or fully-failed results
  if (signal?.aborted || allResults.length === 0) return merged;

  // Cache with LRU eviction
  if (_cache.size >= 50) {
    const oldest = _cache.keys().next().value;
    if (oldest !== undefined) _cache.delete(oldest);
  }
  _cache.set(cacheKey, merged);

  return merged;
}
