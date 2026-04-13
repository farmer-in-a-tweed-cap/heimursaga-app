/**
 * Route file import utility — parses GPX, KML, and GeoJSON files exported from
 * Gaia GPS, CalTopo, Garmin Connect, AllTrails, Komoot, etc. and normalizes them
 * into an `ImportedRoute` shape consumable by the expedition builder.
 *
 * Guide-only feature: this util is called from the `importRouteFile` endpoint
 * which enforces `is_guide` + `is_blueprint` before we ever parse user-supplied
 * bytes.
 *
 * Security: GPX and KML are XML. We use jsdom's DOMParser which (a) does not
 * resolve external entities, blocking classic XXE and billion-laughs attacks,
 * and (b) does not execute scripts. Extracted text (`name`, `desc`) is further
 * passed through the existing DOMPurify-based sanitizer to strip any residual
 * markup.
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
import { JSDOM } from 'jsdom';

import { sanitizeUserContent } from '@/lib/sanitizer';

type AnyFeatureCollection = FeatureCollection<Geometry | null>;

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
  /** Raw (unsimplified) track coordinates — [lng, lat] pairs, optionally with elevation. */
  trackPoints: Position[];
  distanceKm: number;
}

/** Hard caps enforced at parse time. Also duplicated client-side for early rejection. */
export const ROUTE_IMPORT_LIMITS = {
  MAX_FILE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_WAYPOINTS: 500,
  MAX_TRACKPOINTS: 20_000,
  /** Fallback waypoint count when a file has only a trackline and no explicit <wpt> elements. */
  SIMPLIFIED_WAYPOINT_COUNT: 50,
  /** Matches the guide-only description ceiling in the expedition builder UI. */
  DESCRIPTION_MAX: 4000,
  TITLE_MAX: 200,
} as const;

/** Sniff the first ~512 bytes to identify the format. Extension is not trusted. */
export function detectFormat(buffer: Buffer): RouteImportSourceFormat | null {
  const head = buffer.slice(0, 512).toString('utf8').trim();
  if (!head) return null;
  if (head.startsWith('{') || head.startsWith('[')) return 'geojson';
  // XML formats — look for root element name, ignoring XML declaration / BOM / whitespace.
  const lower = head.toLowerCase();
  if (lower.includes('<gpx')) return 'gpx';
  if (lower.includes('<kml')) return 'kml';
  return null;
}

/**
 * Parse a route file buffer into the normalized ImportedRoute shape.
 * Throws on malformed input or when the file exceeds the hard caps.
 */
export function parseRouteFile(
  buffer: Buffer,
  filenameHint: string | undefined,
): ImportedRoute {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file');
  }
  if (buffer.length > ROUTE_IMPORT_LIMITS.MAX_FILE_BYTES) {
    throw new Error(
      `File exceeds ${ROUTE_IMPORT_LIMITS.MAX_FILE_BYTES / (1024 * 1024)} MB limit`,
    );
  }

  const format = detectFormat(buffer);
  if (!format) {
    throw new Error(
      `Unable to detect file format${filenameHint ? ` (${filenameHint})` : ''}. ` +
        `Supported formats: GPX, KML, GeoJSON.`,
    );
  }

  const text = buffer.toString('utf8');

  let collection: AnyFeatureCollection;
  try {
    if (format === 'geojson') {
      const parsed = JSON.parse(text) as FeatureCollection | Feature;
      collection = normalizeToCollection(parsed);
    } else {
      const xmlDoc = parseXmlSafely(text);
      collection =
        format === 'gpx' ? gpxToGeoJson(xmlDoc) : kmlToGeoJson(xmlDoc);
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

/**
 * Parse XML with jsdom. jsdom does not resolve external entities by default,
 * which blocks XXE (billion-laughs, SYSTEM file reads) without additional config.
 */
function parseXmlSafely(text: string): Document {
  const dom = new JSDOM(text, { contentType: 'application/xml' });
  return dom.window.document;
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
          description: cleanText(
            featureDesc,
            ROUTE_IMPORT_LIMITS.DESCRIPTION_MAX,
          ),
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
        // Flatten the first multi-line only — multi-track files are rare and the
        // subsequent segments are usually discontinuous recording sessions.
        const lines = (geom as MultiLineString).coordinates;
        if (lines.length > 0) {
          trackPoints = sanitizeCoordinateList(lines[0]);
        }
      }
    }
  }

  // If no explicit <wpt> waypoints, downsample the trackline to a small set of
  // visual waypoints so the builder sidebar stays usable. The full trackline is
  // still returned separately for route_geometry persistence.
  let waypoints = explicitWaypoints;
  if (waypoints.length === 0 && trackPoints.length > 0) {
    waypoints = simplifyLineToWaypoints(
      trackPoints,
      ROUTE_IMPORT_LIMITS.SIMPLIFIED_WAYPOINT_COUNT,
      routeName,
    );
  }

  const distanceKm = haversineDistanceKm(
    trackPoints.length > 0 ? trackPoints : waypointsToCoords(waypoints),
  );

  return {
    name: routeName,
    sourceFormat: format,
    waypoints,
    trackPoints,
    distanceKm,
  };
}

function waypointsToCoords(waypoints: ImportedRouteWaypoint[]): Position[] {
  return waypoints.map((w) => [w.lon, w.lat]);
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

/**
 * Downsample a dense trackline to `targetCount` representative waypoints by
 * picking evenly-spaced indices. Douglas-Peucker would preserve shape better,
 * but for the expedition builder sidebar we just want a bounded set of visual
 * pins — the full trackline is rendered separately from `route_geometry`.
 */
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
  // Always include the first and last point verbatim, then distribute the rest.
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

export interface GpxExportWaypoint {
  lat: number;
  lon: number;
  name?: string | null;
  description?: string | null;
  elevationM?: number | null;
}

export interface GpxExportInput {
  name: string;
  description?: string | null;
  waypoints: GpxExportWaypoint[];
  /** Raw [lng, lat] (or [lng, lat, ele]) coordinates from `route_geometry`. */
  trackPoints: number[][];
}

/**
 * Serialize an expedition's waypoints + trackline to a GPX 1.1 XML document
 * that can be loaded into Gaia GPS, CalTopo, Garmin Connect, AllTrails, Komoot,
 * etc. Used by the `exportRouteGpx` endpoint.
 *
 * Only emits ASCII-safe escaped text — we never trust DB content to be raw XML.
 */
export function buildGpx(input: GpxExportInput): string {
  const creator = 'Heimursaga';
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<gpx version="1.1" creator="${xmlAttr(creator)}" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">`,
  );

  // Metadata
  lines.push('  <metadata>');
  lines.push(`    <name>${xmlText(input.name)}</name>`);
  if (input.description) {
    lines.push(`    <desc>${xmlText(input.description)}</desc>`);
  }
  lines.push(`    <time>${new Date().toISOString()}</time>`);
  lines.push('  </metadata>');

  // Named waypoints — <wpt> elements at the top level of the GPX doc, the same
  // way Gaia/Garmin export them.
  for (const wp of input.waypoints) {
    if (!Number.isFinite(wp.lat) || !Number.isFinite(wp.lon)) continue;
    lines.push(`  <wpt lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">`);
    if (wp.elevationM != null && Number.isFinite(wp.elevationM)) {
      lines.push(`    <ele>${Number(wp.elevationM).toFixed(1)}</ele>`);
    }
    if (wp.name) {
      lines.push(`    <name>${xmlText(wp.name)}</name>`);
    }
    if (wp.description) {
      lines.push(`    <desc>${xmlText(wp.description)}</desc>`);
    }
    lines.push('  </wpt>');
  }

  // Full trackline as a single <trk> with one <trkseg>. Most GPX consumers
  // expect this shape.
  if (input.trackPoints.length >= 2) {
    lines.push('  <trk>');
    lines.push(`    <name>${xmlText(input.name)}</name>`);
    lines.push('    <trkseg>');
    for (const c of input.trackPoints) {
      if (!Array.isArray(c) || c.length < 2) continue;
      const [lng, lat, ele] = c;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      const attrs = `lat="${Number(lat).toFixed(6)}" lon="${Number(lng).toFixed(6)}"`;
      if (Number.isFinite(ele)) {
        lines.push(`      <trkpt ${attrs}><ele>${Number(ele).toFixed(1)}</ele></trkpt>`);
      } else {
        lines.push(`      <trkpt ${attrs}/>`);
      }
    }
    lines.push('    </trkseg>');
    lines.push('  </trk>');
  }

  lines.push('</gpx>');
  return lines.join('\n');
}

function xmlText(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function xmlAttr(value: string): string {
  return xmlText(value).replace(/"/g, '&quot;');
}

/** Haversine sum across a sequence of [lng, lat] coordinates. Returns kilometers. */
export function haversineDistanceKm(coords: Position[]): number {
  if (!coords || coords.length < 2) return 0;
  const R = 6371; // Earth radius in km
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  return total;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
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

/** Run text through the shared DOMPurify sanitizer and clamp to `max` chars. */
function cleanText(input: string | undefined, max: number): string | undefined {
  if (!input) return undefined;
  const sanitized = sanitizeUserContent(input).trim();
  if (!sanitized) return undefined;
  return sanitized.length > max ? sanitized.slice(0, max) : sanitized;
}
