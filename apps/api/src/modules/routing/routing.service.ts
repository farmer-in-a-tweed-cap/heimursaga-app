import { Injectable } from '@nestjs/common';

import { Logger } from '@/modules/logger';

interface RouteLocation {
  lat: number;
  lon: number;
}

export interface RouteObstacle {
  lat: number;
  lon: number;
  type: 'dam' | 'weir' | 'waterfall' | 'lock_gate' | 'sluice_gate' | 'rapids';
  name: string | null;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lng, lat][]
  legDistances: number[]; // km per leg
  legDurations: number[]; // seconds per leg
  totalDistance: number; // km
  totalDuration: number; // seconds
  snapDistances: number[]; // meters — how far each input was snapped
  flowDirection?: 'downstream' | 'upstream' | 'mixed';
  upstreamFraction?: number; // 0-1, fraction of route distance that is upstream
  obstacles?: RouteObstacle[]; // waterway obstacles detected along route
}

/**
 * Decode Valhalla's encoded polyline (6-digit precision).
 * Returns array of [lng, lat] pairs to match Mapbox/GeoJSON convention.
 */
function decodePolyline6(encoded: string): [number, number][] {
  if (!encoded) return [];
  const factor = 1e6;
  const result: [number, number][] = [];
  let lat = 0;
  let lng = 0;
  let i = 0;

  while (i < encoded.length) {
    let shift = 0;
    let value = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      value |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += value & 1 ? ~(value >> 1) : value >> 1;

    shift = 0;
    value = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      value |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += value & 1 ? ~(value >> 1) : value >> 1;

    result.push([lng / factor, lat / factor]);
  }

  return result;
}

@Injectable()
export class RoutingService {
  private apiKey: string | null;

  constructor(private logger: Logger) {
    this.apiKey = process.env.STADIA_API_KEY || null;
    if (!this.apiKey) {
      this.logger.warn(
        'STADIA_API_KEY not configured — trail routing will be unavailable',
      );
    }
  }

  async getTrailRoute(locations: RouteLocation[]): Promise<RouteResult> {
    if (!this.apiKey) {
      throw new Error('Trail routing is not configured');
    }

    if (locations.length < 2) {
      throw new Error('At least 2 locations are required');
    }

    // Valhalla supports up to 50 locations per request — chunk if needed
    const MAX_LOCATIONS = 50;
    if (locations.length <= MAX_LOCATIONS) {
      return this.fetchValhallaRoute(locations);
    }

    // Chunk with overlap (same pattern as Mapbox chunking in frontend)
    let allCoordinates: [number, number][] = [];
    let allLegDistances: number[] = [];
    let allLegDurations: number[] = [];
    let allSnapDistances: number[] = [];

    for (let i = 0; i < locations.length - 1; i += MAX_LOCATIONS - 1) {
      const chunk = locations.slice(
        i,
        Math.min(i + MAX_LOCATIONS, locations.length),
      );
      if (chunk.length < 2) break;

      const result = await this.fetchValhallaRoute(chunk);

      if (allCoordinates.length > 0) {
        allCoordinates = allCoordinates.concat(result.coordinates.slice(1));
        allSnapDistances.push(...result.snapDistances.slice(1));
      } else {
        allCoordinates = result.coordinates;
        allSnapDistances = result.snapDistances;
      }
      allLegDistances = allLegDistances.concat(result.legDistances);
      allLegDurations = allLegDurations.concat(result.legDurations);
    }

    const totalDistance = allLegDistances.reduce((a, b) => a + b, 0);
    const totalDuration = allLegDurations.reduce((a, b) => a + b, 0);

    return {
      coordinates: allCoordinates,
      legDistances: allLegDistances,
      legDurations: allLegDurations,
      totalDistance,
      totalDuration,
      snapDistances: allSnapDistances,
    };
  }

  private async fetchValhallaRoute(
    locations: RouteLocation[],
  ): Promise<RouteResult> {
    const body = {
      locations: locations.map((loc) => ({
        lat: loc.lat,
        lon: loc.lon,
        type: 'break',
        search_cutoff: 200,
      })),
      costing: 'pedestrian',
      costing_options: {
        pedestrian: {
          use_tracks: 1.0,
          walkway_factor: 0.8,
          driveway_factor: 10.0,
          alley_factor: 5.0,
          max_hiking_difficulty: 3,
          walking_speed: 5.1,
        },
      },
      units: 'kilometers',
    };

    const url = `https://api.stadiamaps.com/route/v1?api_key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(
          `Valhalla API error ${response.status}: ${errorText}`,
        );

        if (response.status === 400) {
          // Parse Valhalla error codes for user-friendly messages
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error_code === 171 || errorData.error_code === 2010) {
              throw new Error(
                'No trail route found — one or more waypoints may be too far from any trail or path',
              );
            }
          } catch (e) {
            if (e instanceof Error && e.message.startsWith('No trail')) throw e;
          }
        }

        throw new Error(`Trail routing failed (${response.status})`);
      }

      const data = await response.json();
      return this.parseValhallaResponse(data, locations);
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseValhallaResponse(
    data: any,
    inputLocations: RouteLocation[],
  ): RouteResult {
    const trip = data.trip;
    if (!trip?.legs?.length) {
      throw new Error('No trail route found between these waypoints');
    }

    // Decode all leg shapes and merge
    let allCoordinates: [number, number][] = [];
    const legDistances: number[] = [];
    const legDurations: number[] = [];

    for (const leg of trip.legs) {
      if (!leg.shape || !leg.summary) {
        throw new Error('Malformed response from routing API');
      }
      const coords = decodePolyline6(leg.shape);
      if (allCoordinates.length > 0) {
        allCoordinates = allCoordinates.concat(coords.slice(1));
      } else {
        allCoordinates = coords;
      }
      legDistances.push(leg.summary.length); // already in km (we requested units: km)
      legDurations.push(leg.summary.time); // seconds
    }

    // Calculate snap distances from input locations to matched locations
    const snapDistances: number[] = [];
    if (trip.locations) {
      for (
        let i = 0;
        i < inputLocations.length && i < trip.locations.length;
        i++
      ) {
        const input = inputLocations[i];
        const matched = trip.locations[i];
        const dist = haversineMeters(
          input.lat,
          input.lon,
          matched.lat,
          matched.lon,
        );
        snapDistances.push(dist);
      }
    }

    return {
      coordinates: allCoordinates,
      legDistances,
      legDurations,
      totalDistance:
        trip.summary?.length ?? legDistances.reduce((a, b) => a + b, 0),
      totalDuration:
        trip.summary?.time ?? legDurations.reduce((a, b) => a + b, 0),
      snapDistances,
    };
  }
}

/** Haversine distance in meters between two points */
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
