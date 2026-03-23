/**
 * Tests for pure logic functions used in ExpeditionBuilderPage.
 *
 * These functions are defined inline in the component, so we replicate
 * them here verbatim for isolated testing. If the source changes,
 * these copies must be updated to match.
 */
import { describe, it, expect } from 'vitest';
import { haversineFromLatLng } from '@/app/utils/haversine';

// ---------------------------------------------------------------------------
// Type definitions (mirrored from component)
// ---------------------------------------------------------------------------

interface Waypoint {
  id: string;
  sequence: number;
  name: string;
  type: 'start' | 'end' | 'standard';
  coordinates: { lat: number; lng: number };
  location: string;
  date: string;
  description: string;
  distanceFromPrevious?: number;
  cumulativeDistance?: number;
  travelTimeFromPrevious?: number;
  cumulativeTravelTime?: number;
  entryIds: string[];
}

type RouteMode = 'straight' | 'walking' | 'cycling' | 'driving' | 'trail' | 'waterway';

// ---------------------------------------------------------------------------
// Replicated pure functions from ExpeditionBuilderPage.tsx
// ---------------------------------------------------------------------------

/** splitGeometryAtWaypoints — line 37-69 of source */
function splitGeometryAtWaypoints(
  fullCoords: number[][],
  waypointLngLats: [number, number][],
): number[][][] {
  if (waypointLngLats.length < 2 || fullCoords.length < 2) return [fullCoords];

  const splitIndices: number[] = [0];
  let searchFrom = 0;

  for (let w = 1; w < waypointLngLats.length - 1; w++) {
    const [wpLng, wpLat] = waypointLngLats[w];
    let bestIdx = searchFrom;
    let bestDist = Infinity;

    for (let i = searchFrom; i < fullCoords.length; i++) {
      const d = (fullCoords[i][0] - wpLng) ** 2 + (fullCoords[i][1] - wpLat) ** 2;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }

    splitIndices.push(bestIdx);
    searchFrom = bestIdx;
  }

  splitIndices.push(fullCoords.length - 1);

  const segments: number[][][] = [];
  for (let i = 0; i < splitIndices.length - 1; i++) {
    segments.push(fullCoords.slice(splitIndices[i], splitIndices[i + 1] + 1));
  }
  return segments;
}

/** updateDistances — line 501-516 of source */
function updateDistances(points: Waypoint[]): Waypoint[] {
  let cumulative = 0;
  return points.map((point, index) => {
    if (index === 0) {
      return { ...point, distanceFromPrevious: 0, cumulativeDistance: 0 };
    }
    const prev = points[index - 1];
    const distance = haversineFromLatLng(prev.coordinates, point.coordinates);
    cumulative += distance;
    return {
      ...point,
      distanceFromPrevious: distance,
      cumulativeDistance: cumulative,
    };
  });
}

/** formatCoord — line 519-529 of source */
function formatCoord(lng: number, lat: number): string {
  const lngNum = Number(lng);
  const latNum = Number(lat);
  if (!isFinite(lngNum) || !isFinite(latNum)) {
    throw new Error('Invalid coordinates detected');
  }
  if (lngNum < -180 || lngNum > 180 || latNum < -90 || latNum > 90) {
    throw new Error('Coordinates out of range');
  }
  return `${lngNum.toFixed(6)},${latNum.toFixed(6)}`;
}

/** formatTravelTime — line 532-539 of source */
function formatTravelTime(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** legCacheKey — line 609-610 of source */
function legCacheKey(from: { lat: number; lng: number }, to: { lat: number; lng: number }, mode: string): string {
  return `${from.lat},${from.lng}|${to.lat},${to.lng}|${mode}`;
}

/** applyDirectionsDistances — line 1029-1043 of source (pure mapping extracted) */
function applyDirectionsDistances(
  points: Waypoint[],
  legDistances: number[],
  legDurations?: number[],
): Waypoint[] {
  let cumDist = 0;
  let cumTime = 0;
  return points.map((point, index) => {
    if (index === 0) {
      return { ...point, distanceFromPrevious: 0, cumulativeDistance: 0, travelTimeFromPrevious: 0, cumulativeTravelTime: 0 };
    }
    const dist = legDistances[index - 1] ?? point.distanceFromPrevious ?? 0;
    const time = legDurations?.[index - 1] ?? 0;
    cumDist += dist;
    cumTime += time;
    return { ...point, distanceFromPrevious: dist, cumulativeDistance: cumDist, travelTimeFromPrevious: time, cumulativeTravelTime: cumTime };
  });
}

/** totalDistance — line 2797-2804 of source */
function computeTotalDistance(
  waypoints: Waypoint[],
  isRoundTrip: boolean,
  directionsLegDistances: number[] | null,
): number {
  const cumDist = waypoints[waypoints.length - 1]?.cumulativeDistance || 0;
  if (!isRoundTrip || waypoints.length < 2) return cumDist;
  const returnIdx = waypoints.length - 1;
  const returnDist = directionsLegDistances?.[returnIdx]
    ?? haversineFromLatLng(waypoints[returnIdx].coordinates, waypoints[0].coordinates);
  return cumDist + returnDist;
}

/** totalTravelTime — line 2730-2736 of source */
function computeTotalTravelTime(
  waypoints: Waypoint[],
  isRoundTrip: boolean,
  directionsLegDurations: number[] | null,
): number {
  const cumTime = waypoints[waypoints.length - 1]?.cumulativeTravelTime || 0;
  if (!isRoundTrip || waypoints.length < 2) return cumTime;
  const returnIdx = waypoints.length - 1;
  const returnTime = directionsLegDurations?.[returnIdx] ?? 0;
  return cumTime + returnTime;
}

/** routeMode determination — line 350 of source */
function determineRouteMode(perLegModes: RouteMode[], fallbackRouteMode: RouteMode): string | null {
  const u = new Set(perLegModes);
  if (u.size > 1) return 'mixed';
  const m = perLegModes[0] || fallbackRouteMode;
  return m !== 'straight' ? m : null;
}

/** computeStatus — line 436-451 of source */
function computeStatus(startDate: string, endDate: string, today: string): string {
  if (!startDate) return 'planned';
  if (endDate && endDate <= today) return 'completed';
  if (startDate > today) return 'planned';
  return 'active';
}

/** formatDistance — from DistanceUnitContext.tsx line 36-41 */
const KM_TO_MI = 0.621371;
function formatDistanceKm(km: number, decimals: number = 1): string {
  return `${km.toFixed(decimals)} km`;
}
function formatDistanceMi(km: number, decimals: number = 1): string {
  return `${(km * KM_TO_MI).toFixed(decimals)} mi`;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeWaypoint(overrides: Partial<Waypoint> & { id: string; coordinates: { lat: number; lng: number } }): Waypoint {
  return {
    sequence: 0,
    name: '',
    type: 'standard',
    location: '',
    date: '',
    description: '',
    entryIds: [],
    ...overrides,
  };
}

// Real-world coordinates for a 3-stop European route
const PARIS = { lat: 48.8566, lng: 2.3522 };
const AMSTERDAM = { lat: 52.3676, lng: 4.9041 };
const BERLIN = { lat: 52.5200, lng: 13.4050 };
// ============================================================================
// Tests
// ============================================================================

describe('updateDistances', () => {
  it('sets first waypoint to zero distance', () => {
    const points = [makeWaypoint({ id: 'a', coordinates: PARIS })];
    const result = updateDistances(points);
    expect(result[0].distanceFromPrevious).toBe(0);
    expect(result[0].cumulativeDistance).toBe(0);
  });

  it('calculates haversine distances between consecutive waypoints', () => {
    const points = [
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
    ];
    const result = updateDistances(points);
    // Paris → Amsterdam ≈ 430 km
    expect(result[1].distanceFromPrevious).toBeGreaterThan(420);
    expect(result[1].distanceFromPrevious).toBeLessThan(440);
    expect(result[1].cumulativeDistance).toBe(result[1].distanceFromPrevious);
  });

  it('accumulates distances across multiple waypoints', () => {
    const points = [
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
      makeWaypoint({ id: 'c', coordinates: BERLIN }),
    ];
    const result = updateDistances(points);
    expect(result[0].cumulativeDistance).toBe(0);
    const leg1 = result[1].distanceFromPrevious!;
    const leg2 = result[2].distanceFromPrevious!;
    expect(result[2].cumulativeDistance).toBeCloseTo(leg1 + leg2, 6);
  });

  it('returns empty array for empty input', () => {
    expect(updateDistances([])).toEqual([]);
  });

  it('does not mutate the original waypoints', () => {
    const original = makeWaypoint({ id: 'a', coordinates: PARIS });
    const points = [original, makeWaypoint({ id: 'b', coordinates: AMSTERDAM })];
    updateDistances(points);
    expect(original.distanceFromPrevious).toBeUndefined();
  });
});

describe('applyDirectionsDistances', () => {
  const threeWaypoints = [
    makeWaypoint({ id: 'a', coordinates: PARIS }),
    makeWaypoint({ id: 'b', coordinates: AMSTERDAM, distanceFromPrevious: 430 }),
    makeWaypoint({ id: 'c', coordinates: BERLIN, distanceFromPrevious: 580 }),
  ];

  it('overwrites distances with API leg distances', () => {
    const result = applyDirectionsDistances(threeWaypoints, [450, 600]);
    expect(result[0].distanceFromPrevious).toBe(0);
    expect(result[1].distanceFromPrevious).toBe(450);
    expect(result[2].distanceFromPrevious).toBe(600);
  });

  it('accumulates cumulative distance correctly', () => {
    const result = applyDirectionsDistances(threeWaypoints, [450, 600]);
    expect(result[0].cumulativeDistance).toBe(0);
    expect(result[1].cumulativeDistance).toBe(450);
    expect(result[2].cumulativeDistance).toBe(1050);
  });

  it('applies travel times per leg', () => {
    const result = applyDirectionsDistances(threeWaypoints, [450, 600], [18000, 21600]);
    expect(result[0].travelTimeFromPrevious).toBe(0);
    expect(result[0].cumulativeTravelTime).toBe(0);
    expect(result[1].travelTimeFromPrevious).toBe(18000); // 5 hours
    expect(result[1].cumulativeTravelTime).toBe(18000);
    expect(result[2].travelTimeFromPrevious).toBe(21600); // 6 hours
    expect(result[2].cumulativeTravelTime).toBe(39600); // 11 hours
  });

  it('falls back to existing distanceFromPrevious when API leg is missing', () => {
    const points = [
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM, distanceFromPrevious: 430 }),
    ];
    // legDistances array shorter than expected — index 0 exists but let's test fallback
    const result = applyDirectionsDistances(points, []);
    // With no leg distance provided, falls back to existing distanceFromPrevious
    expect(result[1].distanceFromPrevious).toBe(430);
  });

  it('defaults travel time to 0 when durations not provided', () => {
    const result = applyDirectionsDistances(threeWaypoints, [450, 600]);
    expect(result[1].travelTimeFromPrevious).toBe(0);
    expect(result[2].travelTimeFromPrevious).toBe(0);
  });

  it('handles single waypoint (no legs)', () => {
    const result = applyDirectionsDistances(
      [makeWaypoint({ id: 'a', coordinates: PARIS })],
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].distanceFromPrevious).toBe(0);
    expect(result[0].cumulativeDistance).toBe(0);
  });
});

describe('computeTotalDistance', () => {
  it('returns cumulative distance of last waypoint for one-way trip', () => {
    const wps = updateDistances([
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
      makeWaypoint({ id: 'c', coordinates: BERLIN }),
    ]);
    const total = computeTotalDistance(wps, false, null);
    expect(total).toBe(wps[2].cumulativeDistance);
  });

  it('adds return leg haversine for round trip when no directions data', () => {
    const wps = updateDistances([
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
      makeWaypoint({ id: 'c', coordinates: BERLIN }),
    ]);
    const oneWay = computeTotalDistance(wps, false, null);
    const roundTrip = computeTotalDistance(wps, true, null);
    const returnLeg = haversineFromLatLng(BERLIN, PARIS);
    expect(roundTrip).toBeCloseTo(oneWay + returnLeg, 6);
  });

  it('uses API return leg distance when available', () => {
    const wps = updateDistances([
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
    ]);
    // directionsLegDistances[1] = return leg distance
    const total = computeTotalDistance(wps, true, [430, 999]);
    expect(total).toBeCloseTo(wps[1].cumulativeDistance! + 999, 6);
  });

  it('returns 0 for empty waypoints', () => {
    expect(computeTotalDistance([], false, null)).toBe(0);
    expect(computeTotalDistance([], true, null)).toBe(0);
  });

  it('returns 0 for single waypoint regardless of round trip', () => {
    const wps = updateDistances([makeWaypoint({ id: 'a', coordinates: PARIS })]);
    expect(computeTotalDistance(wps, false, null)).toBe(0);
    expect(computeTotalDistance(wps, true, null)).toBe(0);
  });
});

describe('computeTotalTravelTime', () => {
  it('returns cumulative travel time for one-way trip', () => {
    const wps = applyDirectionsDistances(
      [
        makeWaypoint({ id: 'a', coordinates: PARIS }),
        makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
        makeWaypoint({ id: 'c', coordinates: BERLIN }),
      ],
      [430, 580],
      [18000, 21600],
    );
    expect(computeTotalTravelTime(wps, false, null)).toBe(39600);
  });

  it('adds return leg travel time for round trip', () => {
    const wps = applyDirectionsDistances(
      [
        makeWaypoint({ id: 'a', coordinates: PARIS }),
        makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
      ],
      [430],
      [18000],
    );
    // directionsLegDurations[1] = return leg
    expect(computeTotalTravelTime(wps, true, [18000, 7200])).toBe(18000 + 7200);
  });

  it('returns 0 when no travel times set', () => {
    const wps = updateDistances([
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
    ]);
    expect(computeTotalTravelTime(wps, false, null)).toBe(0);
  });

  it('returns 0 for empty waypoints', () => {
    expect(computeTotalTravelTime([], false, null)).toBe(0);
  });

  it('does not add return time for single waypoint round trip', () => {
    const wps = applyDirectionsDistances(
      [makeWaypoint({ id: 'a', coordinates: PARIS })],
      [],
      [],
    );
    expect(computeTotalTravelTime(wps, true, null)).toBe(0);
  });
});

describe('determineRouteMode', () => {
  it('returns null when all legs are straight', () => {
    expect(determineRouteMode(['straight', 'straight'], 'straight')).toBeNull();
  });

  it('returns the single mode when all legs share a non-straight mode', () => {
    expect(determineRouteMode(['walking', 'walking'], 'straight')).toBe('walking');
    expect(determineRouteMode(['cycling'], 'straight')).toBe('cycling');
    expect(determineRouteMode(['driving', 'driving', 'driving'], 'straight')).toBe('driving');
  });

  it('returns "mixed" when legs have different modes', () => {
    expect(determineRouteMode(['walking', 'cycling'], 'straight')).toBe('mixed');
    expect(determineRouteMode(['driving', 'walking', 'cycling'], 'straight')).toBe('mixed');
    expect(determineRouteMode(['straight', 'walking'], 'straight')).toBe('mixed');
  });

  it('falls back to the global routeMode when perLegModes is empty', () => {
    expect(determineRouteMode([], 'walking')).toBe('walking');
    expect(determineRouteMode([], 'cycling')).toBe('cycling');
    expect(determineRouteMode([], 'straight')).toBeNull();
  });

  it('handles trail and waterway modes', () => {
    expect(determineRouteMode(['trail', 'trail'], 'straight')).toBe('trail');
    expect(determineRouteMode(['waterway'], 'straight')).toBe('waterway');
    expect(determineRouteMode(['trail', 'waterway'], 'straight')).toBe('mixed');
  });
});

describe('legCacheKey', () => {
  it('encodes both endpoints and mode', () => {
    const from = { lat: 48.8566, lng: 2.3522 };
    const to = { lat: 52.3676, lng: 4.9041 };
    const key = legCacheKey(from, to, 'walking');
    expect(key).toBe('48.8566,2.3522|52.3676,4.9041|walking');
  });

  it('produces different keys for different modes', () => {
    const from = { lat: 48.8566, lng: 2.3522 };
    const to = { lat: 52.3676, lng: 4.9041 };
    const k1 = legCacheKey(from, to, 'walking');
    const k2 = legCacheKey(from, to, 'cycling');
    expect(k1).not.toBe(k2);
  });

  it('produces different keys for reversed endpoints', () => {
    const a = { lat: 48.8566, lng: 2.3522 };
    const b = { lat: 52.3676, lng: 4.9041 };
    expect(legCacheKey(a, b, 'walking')).not.toBe(legCacheKey(b, a, 'walking'));
  });

  it('handles negative coordinates', () => {
    const from = { lat: -33.8688, lng: 151.2093 };
    const to = { lat: -37.8136, lng: 144.9631 };
    const key = legCacheKey(from, to, 'driving');
    expect(key).toBe('-33.8688,151.2093|-37.8136,144.9631|driving');
  });
});

describe('formatCoord', () => {
  it('formats to 6 decimal places', () => {
    expect(formatCoord(2.3522, 48.8566)).toBe('2.352200,48.856600');
  });

  it('handles negative coordinates', () => {
    expect(formatCoord(-73.9857, 40.7484)).toBe('-73.985700,40.748400');
  });

  it('throws for NaN', () => {
    expect(() => formatCoord(NaN, 48)).toThrow('Invalid coordinates detected');
    expect(() => formatCoord(2, NaN)).toThrow('Invalid coordinates detected');
  });

  it('throws for Infinity', () => {
    expect(() => formatCoord(Infinity, 48)).toThrow('Invalid coordinates detected');
    expect(() => formatCoord(2, -Infinity)).toThrow('Invalid coordinates detected');
  });

  it('throws for out of range longitude', () => {
    expect(() => formatCoord(181, 48)).toThrow('Coordinates out of range');
    expect(() => formatCoord(-181, 48)).toThrow('Coordinates out of range');
  });

  it('throws for out of range latitude', () => {
    expect(() => formatCoord(2, 91)).toThrow('Coordinates out of range');
    expect(() => formatCoord(2, -91)).toThrow('Coordinates out of range');
  });

  it('accepts boundary values', () => {
    expect(formatCoord(180, 90)).toBe('180.000000,90.000000');
    expect(formatCoord(-180, -90)).toBe('-180.000000,-90.000000');
    expect(formatCoord(0, 0)).toBe('0.000000,0.000000');
  });
});

describe('formatTravelTime', () => {
  it('returns "< 1 min" for less than 60 seconds', () => {
    expect(formatTravelTime(0)).toBe('< 1 min');
    expect(formatTravelTime(30)).toBe('< 1 min');
    expect(formatTravelTime(59)).toBe('< 1 min');
  });

  it('returns minutes only for under an hour', () => {
    expect(formatTravelTime(60)).toBe('1 min');
    expect(formatTravelTime(300)).toBe('5 min');
    expect(formatTravelTime(2700)).toBe('45 min');
    expect(formatTravelTime(3540)).toBe('59 min');
  });

  it('returns hours only when minutes are zero', () => {
    expect(formatTravelTime(3600)).toBe('1h');
    expect(formatTravelTime(7200)).toBe('2h');
  });

  it('returns hours and minutes combined', () => {
    expect(formatTravelTime(5400)).toBe('1h 30m');
    expect(formatTravelTime(7500)).toBe('2h 5m');
    expect(formatTravelTime(86400)).toBe('24h'); // 24 hours exactly, 0 mins
  });

  it('rounds minutes', () => {
    // 3600 + 89 seconds = 1h 1.48min → rounds to 1h 1m
    expect(formatTravelTime(3689)).toBe('1h 1m');
    // 3600 + 150 seconds = 1h 2.5min → rounds to 1h 3m
    expect(formatTravelTime(3750)).toBe('1h 3m');
  });
});

describe('splitGeometryAtWaypoints', () => {
  // A simple polyline: 10 points along a straight line
  const line: number[][] = Array.from({ length: 10 }, (_, i) => [i, 0]);

  it('returns the full coords as a single segment when < 2 waypoints', () => {
    const result = splitGeometryAtWaypoints(line, [[0, 0]]);
    expect(result).toEqual([line]);
  });

  it('returns the full coords for a single-point geometry', () => {
    const result = splitGeometryAtWaypoints([[5, 5]], [[0, 0], [9, 0]]);
    expect(result).toEqual([[[5, 5]]]);
  });

  it('splits into two segments at one intermediate waypoint', () => {
    const waypoints: [number, number][] = [[0, 0], [5, 0], [9, 0]];
    const segments = splitGeometryAtWaypoints(line, waypoints);
    expect(segments).toHaveLength(2);
    // First segment: index 0 through 5 (inclusive)
    expect(segments[0][0]).toEqual([0, 0]);
    expect(segments[0][segments[0].length - 1]).toEqual([5, 0]);
    // Second segment: index 5 through 9 (inclusive)
    expect(segments[1][0]).toEqual([5, 0]);
    expect(segments[1][segments[1].length - 1]).toEqual([9, 0]);
  });

  it('splits into three segments at two intermediate waypoints', () => {
    const waypoints: [number, number][] = [[0, 0], [3, 0], [7, 0], [9, 0]];
    const segments = splitGeometryAtWaypoints(line, waypoints);
    expect(segments).toHaveLength(3);
  });

  it('handles two-waypoint case (start and end only, no intermediate)', () => {
    const waypoints: [number, number][] = [[0, 0], [9, 0]];
    const segments = splitGeometryAtWaypoints(line, waypoints);
    // No intermediate waypoints → single segment from start to end
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual(line);
  });

  it('finds nearest point when waypoint is not exactly on the line', () => {
    // Waypoint at [5, 0.001] — slightly off but closest to [5, 0]
    const waypoints: [number, number][] = [[0, 0], [5, 0.001], [9, 0]];
    const segments = splitGeometryAtWaypoints(line, waypoints);
    expect(segments).toHaveLength(2);
    expect(segments[0][segments[0].length - 1]).toEqual([5, 0]);
  });

  it('handles consecutive waypoints at same point', () => {
    const waypoints: [number, number][] = [[0, 0], [5, 0], [5, 0], [9, 0]];
    const segments = splitGeometryAtWaypoints(line, waypoints);
    expect(segments).toHaveLength(3);
    // Middle segment should contain just the single shared point
    expect(segments[1]).toHaveLength(1);
    expect(segments[1][0]).toEqual([5, 0]);
  });
});

describe('computeStatus', () => {
  const today = '2026-03-23';

  it('returns "planned" when no start date', () => {
    expect(computeStatus('', '', today)).toBe('planned');
  });

  it('returns "planned" when start date is in the future', () => {
    expect(computeStatus('2026-04-01', '', today)).toBe('planned');
  });

  it('returns "active" when start date is today or in the past, no end date', () => {
    expect(computeStatus('2026-03-23', '', today)).toBe('active');
    expect(computeStatus('2026-01-01', '', today)).toBe('active');
  });

  it('returns "completed" when end date is today or in the past', () => {
    expect(computeStatus('2026-01-01', '2026-03-23', today)).toBe('completed');
    expect(computeStatus('2026-01-01', '2026-02-15', today)).toBe('completed');
  });

  it('returns "active" when end date is in the future', () => {
    expect(computeStatus('2026-01-01', '2026-12-31', today)).toBe('active');
  });
});

describe('formatDistance (DistanceUnitContext logic)', () => {
  it('formats in kilometers', () => {
    expect(formatDistanceKm(100, 1)).toBe('100.0 km');
    expect(formatDistanceKm(0.5, 2)).toBe('0.50 km');
    expect(formatDistanceKm(1234.567, 0)).toBe('1235 km');
  });

  it('formats in miles with conversion factor', () => {
    expect(formatDistanceMi(100, 1)).toBe('62.1 mi');
    expect(formatDistanceMi(1, 2)).toBe('0.62 mi');
    expect(formatDistanceMi(0, 1)).toBe('0.0 mi');
  });

  it('uses default decimal of 1', () => {
    expect(formatDistanceKm(42.195)).toBe('42.2 km');
    expect(formatDistanceMi(42.195)).toBe('26.2 mi');
  });
});

describe('integration: updateDistances then applyDirectionsDistances', () => {
  it('API distances overwrite haversine estimates', () => {
    const wps = updateDistances([
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
      makeWaypoint({ id: 'c', coordinates: BERLIN }),
    ]);

    // Haversine leg 1 ≈ 430 km
    expect(wps[1].distanceFromPrevious).toBeGreaterThan(420);

    // API says road distance is 500 km for leg 1
    const withApi = applyDirectionsDistances(wps, [500, 650], [18000, 21600]);
    expect(withApi[1].distanceFromPrevious).toBe(500);
    expect(withApi[2].distanceFromPrevious).toBe(650);
    expect(withApi[2].cumulativeDistance).toBe(1150);
  });

  it('totalDistance calculation uses API distances through cumulative chain', () => {
    const wps = updateDistances([
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
    ]);
    const withApi = applyDirectionsDistances(wps, [500]);
    const total = computeTotalDistance(withApi, false, null);
    expect(total).toBe(500);
  });

  it('round-trip totalDistance adds return leg from API', () => {
    const wps = updateDistances([
      makeWaypoint({ id: 'a', coordinates: PARIS }),
      makeWaypoint({ id: 'b', coordinates: AMSTERDAM }),
      makeWaypoint({ id: 'c', coordinates: BERLIN }),
    ]);
    const withApi = applyDirectionsDistances(wps, [500, 650]);
    // directionsLegDistances[2] = return leg distance
    const total = computeTotalDistance(withApi, true, [500, 650, 1050]);
    expect(total).toBe(1150 + 1050); // cumulative + return
  });
});

describe('route mode edge cases', () => {
  it('single leg with non-straight mode returns that mode', () => {
    expect(determineRouteMode(['trail'], 'straight')).toBe('trail');
  });

  it('three identical legs return the shared mode', () => {
    expect(determineRouteMode(['cycling', 'cycling', 'cycling'], 'walking')).toBe('cycling');
  });

  it('mixed always wins over consistent fallback', () => {
    expect(determineRouteMode(['walking', 'driving'], 'walking')).toBe('mixed');
  });
});
