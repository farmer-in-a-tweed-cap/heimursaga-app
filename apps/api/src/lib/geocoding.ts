/**
 * Geocoding utilities using Mapbox API
 * Used to reverse geocode coordinates to country codes
 */

interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  properties: {
    short_code?: string;
  };
  text: string;
  place_name: string;
  context?: Array<{
    id: string;
    short_code?: string;
    text: string;
  }>;
}

interface MapboxResponse {
  type: string;
  features: MapboxFeature[];
}

/**
 * Forward geocode a location string to coordinates using Mapbox geocoding API
 * Returns null if coordinates cannot be determined
 */
export async function getCoordinatesFromLocation(
  locationText: string,
): Promise<{ lat: number; lon: number } | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    console.warn('MAPBOX_ACCESS_TOKEN not configured, skipping geocoding');
    return null;
  }

  try {
    const encoded = encodeURIComponent(locationText);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Mapbox geocoding error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (data.features && data.features.length > 0) {
      const [lon, lat] = (data.features[0] as any).center as [number, number];
      return { lat, lon };
    }

    return null;
  } catch (error) {
    console.error('Error during forward geocoding:', error);
    return null;
  }
}

export interface ReverseGeocodeResult {
  locationName: string; // e.g. "Lightning Mountain, New Hampshire, United States"
  countryCode: string; // ISO 3166-1 alpha-2, e.g. "US"
  countryName: string; // e.g. "United States"
  stateProvince: string | null; // e.g. "New Hampshire"
}

/**
 * Query Mapbox Tilequery API to find the named natural feature directly
 * at the coordinates (using vector tile labels). This catches rivers,
 * lakes, and mountains that the waypoint is literally sitting on.
 */
async function findFeatureAtPoint(
  lat: number,
  lon: number,
  token: string,
): Promise<{ name: string; type: string } | null> {
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?radius=100&layers=natural_label&limit=5&access_token=${token}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    const features = data.features || [];

    // Pick the closest named natural feature
    let best: { name: string; type: string; dist: number } | null = null;
    for (const f of features) {
      const props = f.properties || {};
      const name = props.name || props.name_en;
      if (!name) continue;

      const cls = props.class || '';
      const dist = props.tilequery?.distance ?? 999;

      // Only accept features very close to the point
      if (dist > 100) continue;

      if (!best || dist < best.dist) {
        best = { name, type: cls || 'natural', dist };
      }
    }

    return best ? { name: best.name, type: best.type } : null;
  } catch {
    return null;
  }
}

// Per-category rules: [importance score, max distance in meters]
// Tight thresholds prevent urban parks/fountains from appearing for city waypoints
// while still detecting real natural features when you're near them.
const POINT_FEATURE_RULES: Record<string, [number, number]> = {
  volcano: [100, 5000],
  glacier: [95, 3000],
  mountain: [70, 2000],
  waterfall: [65, 200],
  hot_spring: [60, 200],
  lake: [50, 500],
  river: [45, 500],
  beach: [40, 300],
};

const AREA_FEATURE_RULES: Record<string, [number, number]> = {
  national_park: [100, 10000],
  national_forest: [90, 8000],
  state_park: [80, 5000],
  nature_reserve: [70, 1000],
};

interface SearchFeatureProps {
  name?: string;
  distance?: number;
  poi_category_ids?: string[];
}

/**
 * Pick the best feature from a Mapbox Search response using per-category
 * distance limits. Each category has its own max distance — large visible
 * landmarks (mountains, volcanoes) are allowed further away, while small
 * features (waterfalls, hot springs) must be very close.
 */
function pickBest(
  features: Array<{ properties: SearchFeatureProps }>,
  rules: Record<string, [number, number]>,
): { name: string; type: string } | null {
  let best: { name: string; type: string; score: number } | null = null;

  for (const f of features) {
    const { name, distance, poi_category_ids } = f.properties;
    if (!name || distance == null) continue;

    let topCat = '';
    let catScore = 0;
    for (const cat of poi_category_ids || []) {
      const rule = rules[cat];
      if (!rule) continue;
      const [score, maxDist] = rule;
      if (distance > maxDist) continue;
      if (score > catScore) {
        catScore = score;
        topCat = cat;
      }
    }
    if (!catScore) continue;

    const finalScore = catScore - distance / 100;
    if (!best || finalScore > best.score) {
      best = { name, type: topCat, score: finalScore };
    }
  }

  return best ? { name: best.name, type: best.type } : null;
}

/**
 * Query Mapbox Search API for notable natural features near coordinates.
 * Returns a point feature (mountain, waterfall, etc.) and optionally a
 * containing area (national park, state forest, etc.).
 */
async function findNaturalFeatures(
  lat: number,
  lon: number,
  token: string,
): Promise<{
  point: { name: string; type: string } | null;
  area: { name: string; type: string } | null;
}> {
  const pointCats = Object.keys(POINT_FEATURE_RULES).join(',');
  const areaCats = Object.keys(AREA_FEATURE_RULES).join(',');

  const [pointRes, areaRes] = await Promise.all([
    fetch(
      `https://api.mapbox.com/search/searchbox/v1/category/${pointCats}?proximity=${lon},${lat}&limit=10&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) },
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch(
      `https://api.mapbox.com/search/searchbox/v1/category/${areaCats}?proximity=${lon},${lat}&limit=5&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) },
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  const point = pointRes
    ? pickBest(pointRes.features || [], POINT_FEATURE_RULES)
    : null;
  const area = areaRes
    ? pickBest(areaRes.features || [], AREA_FEATURE_RULES)
    : null;

  return { point, area };
}

/**
 * Named water body lookup — maps coordinates to known seas, gulfs, bays, and oceans.
 * Mapbox doesn't label open water features, so we use bounding-box matching against
 * a curated list of major water bodies. Checked from most specific (bays/gulfs) to
 * most general (oceans) so smaller bodies take precedence.
 */
const WATER_BODIES: { name: string; bounds: [number, number, number, number] }[] = [
  // [minLon, minLat, maxLon, maxLat]
  // North America
  { name: 'Gulf of Maine', bounds: [-71, 42, -65, 45.5] },
  { name: 'Chesapeake Bay', bounds: [-77, 36.5, -75.5, 39.5] },
  { name: 'Gulf of Mexico', bounds: [-98, 18, -80, 31] },
  { name: 'Gulf of California', bounds: [-115, 22, -107, 32] },
  { name: 'Puget Sound', bounds: [-123.5, 47, -122, 49] },
  { name: 'Gulf of St. Lawrence', bounds: [-67, 45.5, -56, 52] },
  { name: 'Hudson Bay', bounds: [-95, 51, -75, 63.5] },
  { name: 'Baffin Bay', bounds: [-80, 66, -50, 78] },
  // Caribbean
  { name: 'Caribbean Sea', bounds: [-88, 9, -59, 22] },
  // Europe
  { name: 'English Channel', bounds: [-6, 48.5, 2, 51.5] },
  { name: 'Irish Sea', bounds: [-7, 51, -3, 55] },
  { name: 'North Sea', bounds: [-4, 51, 10, 62] },
  { name: 'Baltic Sea', bounds: [10, 53, 30, 66] },
  { name: 'Bay of Biscay', bounds: [-10, 43, -1, 48.5] },
  { name: 'Strait of Gibraltar', bounds: [-6.5, 35.5, -5, 36.5] },
  { name: 'Adriatic Sea', bounds: [12, 39.5, 20, 45.8] },
  { name: 'Aegean Sea', bounds: [22, 35, 28, 41] },
  { name: 'Tyrrhenian Sea', bounds: [9, 37.5, 16.5, 43.5] },
  { name: 'Ligurian Sea', bounds: [7, 43, 10.5, 44.5] },
  { name: 'Balearic Sea', bounds: [-1, 38, 5, 42] },
  { name: 'Mediterranean Sea', bounds: [-6, 30, 36.5, 46] },
  { name: 'Black Sea', bounds: [27, 40.5, 42, 47] },
  // Middle East / Indian Ocean
  { name: 'Red Sea', bounds: [32, 12.5, 44, 30] },
  { name: 'Persian Gulf', bounds: [47, 23, 57, 31] },
  { name: 'Gulf of Aden', bounds: [43, 10.5, 51, 15.5] },
  { name: 'Arabian Sea', bounds: [51, 5, 77, 25] },
  { name: 'Bay of Bengal', bounds: [77, 5, 100, 23] },
  // Asia-Pacific
  { name: 'South China Sea', bounds: [100, 0, 121, 23] },
  { name: 'East China Sea', bounds: [117, 23, 131, 34] },
  { name: 'Sea of Japan', bounds: [127, 33, 142, 52] },
  { name: 'Sea of Okhotsk', bounds: [135, 43, 163, 62] },
  { name: 'Bering Sea', bounds: [162, 51, -157, 66] },
  { name: 'Coral Sea', bounds: [142, -26, 175, -10] },
  { name: 'Tasman Sea', bounds: [147, -47, 175, -28] },
  // Polar
  { name: 'Norwegian Sea', bounds: [-10, 62, 20, 72] },
  { name: 'Barents Sea', bounds: [15, 69, 60, 81] },
  // Oceans (checked last — most general)
  { name: 'Arctic Ocean', bounds: [-180, 72, 180, 90] },
  { name: 'North Atlantic Ocean', bounds: [-80, 0, 0, 72] },
  { name: 'South Atlantic Ocean', bounds: [-70, -60, 20, 0] },
  { name: 'North Pacific Ocean', bounds: [100, 0, -80, 65] },
  { name: 'South Pacific Ocean', bounds: [140, -60, -70, 0] },
  { name: 'Indian Ocean', bounds: [20, -60, 147, 30] },
  { name: 'Southern Ocean', bounds: [-180, -90, 180, -60] },
];

function matchWaterBody(lat: number, lon: number): string | null {
  for (const wb of WATER_BODIES) {
    const [minLon, minLat, maxLon, maxLat] = wb.bounds;
    if (minLon <= maxLon) {
      // Normal bbox
      if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
        return wb.name;
      }
    } else {
      // Wraps antimeridian (e.g., Bering Sea, Pacific)
      if ((lon >= minLon || lon <= maxLon) && lat >= minLat && lat <= maxLat) {
        return wb.name;
      }
    }
  }
  return null;
}

/**
 * Confirm coordinates are in water using Mapbox Tilequery against the water layer.
 */
async function isInWater(
  lat: number,
  lon: number,
  token: string,
): Promise<boolean> {
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lon},${lat}.json?radius=0&layers=water&limit=1&access_token=${token}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.features || []).length > 0;
  } catch {
    return false;
  }
}

/**
 * Find the nearest country to coordinates (useful for open-water points).
 * Uses Mapbox geocoding with a broader search.
 */
async function findNearestCountry(
  lat: number,
  lon: number,
  token: string,
): Promise<{ countryCode: string; countryName: string } | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=country&limit=1&access_token=${token}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data: MapboxResponse = await res.json();
    if (!data.features?.length) return null;

    const feature = data.features[0];
    const code = (feature.properties?.short_code || '').toUpperCase();
    if (!code) return null;

    return { countryCode: code, countryName: feature.text };
  } catch {
    return null;
  }
}

/**
 * Full reverse geocode from coordinates — returns structured location data
 * for expedition location labeling.
 *
 * Strategy:
 * 1. Query Mapbox Search for nearby point features (mountains, waterfalls, etc.)
 * 2. Query Mapbox Search for containing areas (national parks, state forests, etc.)
 * 3. Query Mapbox Geocoding for administrative context (state, country)
 * 4. Combine: "Lightning Mountain, Nash Stream State Forest, New Hampshire, United States"
 *
 * For open-water coordinates (no admin context), falls back to water body detection:
 * → "Gulf of Maine, United States" or "North Atlantic Ocean"
 */
export async function reverseGeocodeLocation(
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    console.warn(
      'MAPBOX_ACCESS_TOKEN not configured, skipping reverse geocoding',
    );
    return null;
  }

  try {
    // Run all queries in parallel — Tilequery finds features AT the point,
    // Search finds nearby POIs, Geocoding gives admin context
    const [atPoint, features, mapboxResult] = await Promise.all([
      findFeatureAtPoint(lat, lon, token),
      findNaturalFeatures(lat, lon, token),
      fetchMapboxContext(lat, lon, token),
    ]);

    // If standard geocoding found admin context, use the normal land-based flow
    if (mapboxResult) {
      const { placeName, countryCode, countryName, stateProvince } = mapboxResult;
      const { point: searchPoint, area } = features;

      // Tilequery result (feature the waypoint is literally on) takes precedence
      const point = atPoint || searchPoint;

      // Build the best location name
      const parts: string[] = [];

      if (point) {
        parts.push(point.name);
      }

      if (area && area.name !== point?.name) {
        parts.push(area.name);
      }

      if (parts.length > 0) {
        // We have natural features — append state + country
        if (stateProvince) parts.push(stateProvince);
        if (countryName) parts.push(countryName);
      } else {
        // No natural features — fall back to Mapbox's place name
        parts.push(placeName);
      }

      return {
        locationName: parts.join(', '),
        countryCode,
        countryName,
        stateProvince,
      };
    }

    // No admin context — likely open water.
    // Confirm with tilequery, then match against known water bodies.
    const inWater = await isInWater(lat, lon, token);
    if (!inWater) return null;

    const waterBodyName = matchWaterBody(lat, lon);
    const nearestCountry = await findNearestCountry(lat, lon, token);

    if (waterBodyName) {
      const parts = [waterBodyName];
      if (nearestCountry) parts.push(nearestCountry.countryName);

      return {
        locationName: parts.join(', '),
        countryCode: nearestCountry?.countryCode || '',
        countryName: nearestCountry?.countryName || '',
        stateProvince: null,
      };
    }

    // In water but no named body matched — generic ocean
    return {
      locationName: nearestCountry
        ? `Open water, ${nearestCountry.countryName}`
        : 'Open water',
      countryCode: nearestCountry?.countryCode || '',
      countryName: nearestCountry?.countryName || '',
      stateProvince: null,
    };
  } catch (error) {
    console.error('Error during reverse geocoding:', error);
    return null;
  }
}

/**
 * Fetch administrative context (place, state, country) from Mapbox.
 */
async function fetchMapboxContext(
  lat: number,
  lon: number,
  token: string,
): Promise<{
  placeName: string;
  countryCode: string;
  countryName: string;
  stateProvince: string | null;
} | null> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=locality,place,district,region,country&limit=1&access_token=${token}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data: MapboxResponse = await response.json();
  if (!data.features?.length) return null;

  const feature = data.features[0];
  let countryCode = '';
  let countryName = '';
  let stateProvince: string | null = null;

  if (feature.place_type?.includes('country')) {
    countryCode = (feature.properties?.short_code || '').toUpperCase();
    countryName = feature.text;
  }

  if (feature.context) {
    for (const ctx of feature.context) {
      if (ctx.id.startsWith('country.')) {
        countryCode = (ctx.short_code || '').toUpperCase();
        countryName = ctx.text;
      } else if (ctx.id.startsWith('region.')) {
        stateProvince = ctx.text;
      }
    }
  }

  if (!countryCode) return null;

  return {
    placeName: feature.place_name,
    countryCode,
    countryName,
    stateProvince,
  };
}

/**
 * Get ISO 3166-1 alpha-2 country code from coordinates using Mapbox reverse geocoding
 * Returns null if country cannot be determined
 */
export async function getCountryCodeFromCoordinates(
  lat: number,
  lon: number,
): Promise<string | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    console.warn(
      'MAPBOX_ACCESS_TOKEN not configured, skipping country code lookup',
    );
    return null;
  }

  try {
    // Use Mapbox reverse geocoding API
    // Request only country-level data for efficiency
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=country&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Mapbox geocoding error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (data.features && data.features.length > 0) {
      const countryFeature = data.features[0];

      // The short_code in properties contains the ISO country code (lowercase)
      if (countryFeature.properties?.short_code) {
        return countryFeature.properties.short_code.toUpperCase();
      }
    }

    return null;
  } catch (error) {
    console.error('Error during reverse geocoding:', error);
    return null;
  }
}
