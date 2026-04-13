/**
 * Browser-side route file parser for GPX, KML, and GeoJSON — mirrors the
 * server-side parser at `apps/api/src/modules/expedition/route-import.util.ts`
 * so we can show an instant preview in the Import Route modal before sending
 * the file to the server for authoritative storage.
 *
 * Guide-only feature: the modal that calls this parser is only mounted for
 * guide accounts, but the parser itself is pure and has no auth dependency.
 *
 * Security: uses the browser's native DOMParser. Neither DOMParser nor
 * `@tmcw/togeojson` evaluate script content or resolve external entities, so
 * XXE / script-injection vectors are not applicable. Extracted text is still
 * trimmed and length-clamped before being rendered.
 */

import { gpx as gpxToGeoJson, kml as kmlToGeoJson } from '@tmcw/togeojson';
import type {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
  Point,
  Position,
} from 'geojson';

type AnyFeatureCollection = FeatureCollection<Geometry | null>;
import { haversineKm } from '@/app/utils/haversine';

export type RouteImportSourceFormat = 'gpx' | 'kml' | 'geojson';

export interface ImportedRouteWaypoint {
  lat: number;
  lon: number;
  title?: string;
  description?: string;
  sequence: number;
  elevationM?: number;
}

export interface ImportedRoute {
  name?: string;
  sourceFormat: RouteImportSourceFormat;
  waypoints: ImportedRouteWaypoint[];
  trackPoints: Position[];
  distanceKm: number;
}

/** Mirrors ROUTE_IMPORT_LIMITS in route-import.util.ts (kept in sync manually). */
export const ROUTE_IMPORT_LIMITS = {
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  MAX_WAYPOINTS: 500,
  MAX_TRACKPOINTS: 20_000,
  SIMPLIFIED_WAYPOINT_COUNT: 50,
  DESCRIPTION_MAX: 4000,
  TITLE_MAX: 200,
} as const;

export async function parseRouteFileInBrowser(file: File): Promise<ImportedRoute> {
  if (!file) throw new Error('No file selected');
  if (file.size === 0) throw new Error('File is empty');
  if (file.size > ROUTE_IMPORT_LIMITS.MAX_FILE_BYTES) {
    throw new Error(
      `File exceeds ${ROUTE_IMPORT_LIMITS.MAX_FILE_BYTES / (1024 * 1024)} MB limit`,
    );
  }

  const text = await file.text();
  const format = detectFormat(text, file.name);
  if (!format) {
    throw new Error(
      `Unable to detect file format (${file.name}). Supported: GPX, KML, GeoJSON.`,
    );
  }

  let collection: AnyFeatureCollection;
  try {
    if (format === 'geojson') {
      const parsed = JSON.parse(text) as FeatureCollection | Feature;
      collection = normalizeToCollection(parsed);
    } else {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'application/xml');
      // DOMParser reports XML errors as a <parsererror> child on the document.
      const parseError = xmlDoc.getElementsByTagName('parsererror');
      if (parseError.length > 0) {
        throw new Error('Malformed XML');
      }
      collection = format === 'gpx' ? gpxToGeoJson(xmlDoc) : kmlToGeoJson(xmlDoc);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown parse error';
    throw new Error(`Unable to parse ${format.toUpperCase()} file: ${msg}`);
  }

  const route = normalizeFeatureCollection(collection, format);

  if (route.waypoints.length === 0 && route.trackPoints.length === 0) {
    throw new Error('Route file contains no waypoints or track points');
  }
  if (route.waypoints.length > ROUTE_IMPORT_LIMITS.MAX_WAYPOINTS) {
    throw new Error(
      `Route file contains ${route.waypoints.length} waypoints; maximum is ${ROUTE_IMPORT_LIMITS.MAX_WAYPOINTS}`,
    );
  }
  if (route.trackPoints.length > ROUTE_IMPORT_LIMITS.MAX_TRACKPOINTS) {
    throw new Error(
      `Route file contains ${route.trackPoints.length} track points; maximum is ${ROUTE_IMPORT_LIMITS.MAX_TRACKPOINTS}`,
    );
  }

  return route;
}

function detectFormat(
  text: string,
  filename: string,
): RouteImportSourceFormat | null {
  const head = text.slice(0, 512).trim();
  if (!head) return null;
  if (head.startsWith('{') || head.startsWith('[')) return 'geojson';
  const lower = head.toLowerCase();
  if (lower.includes('<gpx')) return 'gpx';
  if (lower.includes('<kml')) return 'kml';
  // Extension fallback for cases where DOCTYPE / comments push the root past 512 bytes
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'gpx') return 'gpx';
  if (ext === 'kml') return 'kml';
  if (ext === 'geojson' || ext === 'json') return 'geojson';
  return null;
}

function normalizeToCollection(
  input: FeatureCollection | Feature,
): AnyFeatureCollection {
  if (input && (input as FeatureCollection).type === 'FeatureCollection') {
    return input as AnyFeatureCollection;
  }
  if (input && (input as Feature).type === 'Feature') {
    return { type: 'FeatureCollection', features: [input as Feature] };
  }
  throw new Error('GeoJSON must be a Feature or FeatureCollection');
}

function normalizeFeatureCollection(
  collection: AnyFeatureCollection,
  format: RouteImportSourceFormat,
): ImportedRoute {
  let routeName: string | undefined;
  const explicitWaypoints: ImportedRouteWaypoint[] = [];
  let trackPoints: Position[] = [];

  for (const feature of collection.features || []) {
    if (!feature || !feature.geometry) continue;
    const props = (feature.properties || {}) as Record<string, unknown>;
    const featureName = getStringProp(props, 'name');
    const featureDesc = getStringProp(props, 'desc', 'description', 'cmt');
    const geom = feature.geometry;

    if (geom.type === 'Point') {
      const [lng, lat, ele] = (geom as Point).coordinates as Position;
      if (isFiniteCoord(lng, lat)) {
        explicitWaypoints.push({
          lat,
          lon: lng,
          title: cleanText(featureName, ROUTE_IMPORT_LIMITS.TITLE_MAX),
          description: cleanText(featureDesc, ROUTE_IMPORT_LIMITS.DESCRIPTION_MAX),
          sequence: explicitWaypoints.length,
          elevationM: isFiniteNumber(ele) ? Number(ele) : undefined,
        });
      }
    } else if (geom.type === 'LineString') {
      if (!routeName && featureName) routeName = featureName;
      if (trackPoints.length === 0) {
        trackPoints = sanitizeCoordinateList((geom as LineString).coordinates);
      }
    } else if (geom.type === 'MultiLineString') {
      if (!routeName && featureName) routeName = featureName;
      if (trackPoints.length === 0) {
        const lines = (geom as MultiLineString).coordinates;
        if (lines.length > 0) {
          trackPoints = sanitizeCoordinateList(lines[0]);
        }
      }
    }
  }

  let waypoints = explicitWaypoints;
  if (waypoints.length === 0 && trackPoints.length > 0) {
    waypoints = simplifyLineToWaypoints(
      trackPoints,
      ROUTE_IMPORT_LIMITS.SIMPLIFIED_WAYPOINT_COUNT,
      routeName,
    );
  }

  const distanceKm = haversineDistanceKmFromCoords(
    trackPoints.length > 0 ? trackPoints : waypoints.map((w) => [w.lon, w.lat]),
  );

  return {
    name: routeName,
    sourceFormat: format,
    waypoints,
    trackPoints,
    distanceKm,
  };
}

function sanitizeCoordinateList(coords: Position[]): Position[] {
  const out: Position[] = [];
  for (const c of coords || []) {
    if (!Array.isArray(c) || c.length < 2) continue;
    const [lng, lat, ele] = c;
    if (!isFiniteCoord(lng, lat)) continue;
    if (isFiniteNumber(ele)) {
      out.push([lng, lat, ele]);
    } else {
      out.push([lng, lat]);
    }
  }
  return out;
}

function simplifyLineToWaypoints(
  coords: Position[],
  targetCount: number,
  baseName: string | undefined,
): ImportedRouteWaypoint[] {
  if (coords.length === 0) return [];
  if (coords.length <= targetCount) {
    return coords.map((c, i) => ({
      lat: c[1],
      lon: c[0],
      title: buildSimplifiedTitle(baseName, i + 1, coords.length),
      sequence: i,
      elevationM: isFiniteNumber(c[2]) ? Number(c[2]) : undefined,
    }));
  }

  const result: ImportedRouteWaypoint[] = [];
  const step = (coords.length - 1) / (targetCount - 1);
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(coords.length - 1, Math.round(i * step));
    const c = coords[idx];
    result.push({
      lat: c[1],
      lon: c[0],
      title: buildSimplifiedTitle(baseName, i + 1, targetCount),
      sequence: i,
      elevationM: isFiniteNumber(c[2]) ? Number(c[2]) : undefined,
    });
  }
  return result;
}

function buildSimplifiedTitle(
  baseName: string | undefined,
  index: number,
  total: number,
): string {
  const prefix = baseName ? cleanText(baseName, 80) || 'Route' : 'Route';
  return `${prefix} — Point ${index} / ${total}`;
}

/** Haversine sum over [lng, lat] coordinates. Returns kilometers. */
function haversineDistanceKmFromCoords(coords: Position[]): number {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1] as number[], coords[i] as number[]);
  }
  return total;
}

function isFiniteCoord(lng: unknown, lat: unknown): lng is number {
  return (
    isFiniteNumber(lng) &&
    isFiniteNumber(lat) &&
    (lng as number) >= -180 &&
    (lng as number) <= 180 &&
    (lat as number) >= -90 &&
    (lat as number) <= 90
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getStringProp(
  props: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function cleanText(
  input: string | undefined,
  max: number,
): string | undefined {
  if (!input) return undefined;
  // Strip any HTML-like tags and collapse whitespace — defensive, since the
  // server re-sanitizes authoritatively.
  const stripped = input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return undefined;
  return stripped.length > max ? stripped.slice(0, max) : stripped;
}
