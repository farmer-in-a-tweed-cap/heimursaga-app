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
 * Full reverse geocode from coordinates — returns structured location data
 * for expedition location labeling.
 *
 * Strategy:
 * 1. Query Mapbox Search for nearby point features (mountains, waterfalls, etc.)
 * 2. Query Mapbox Search for containing areas (national parks, state forests, etc.)
 * 3. Query Mapbox Geocoding for administrative context (state, country)
 * 4. Combine: "Lightning Mountain, Nash Stream State Forest, New Hampshire, United States"
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

    if (!mapboxResult) return null;

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
