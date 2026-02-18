import { Injectable } from '@nestjs/common';

import { getCountryCodeFromCoordinates } from '@/lib/geocoding';
import {
  resolveExpeditionLocations,
  ResolvedLocation,
} from '@/lib/resolve-expedition-location';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

interface ExpeditionCondition {
  expeditionId: string;
  expeditionTitle: string;
  explorerUsername: string;
  explorerPicture?: string;
  category?: string;
  region?: string;
  locationName: string;
  countryCode?: string;
  lat: number;
  lon: number;
  localTime: string;
  timezone: string;
  tempC: number;
  tempF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  condition: string;
  conditionIcon: string;
  windKph: number;
  windMph: number;
  windDir: string;
  humidity: number;
  uvIndex: number;
  visibilityKm: number;
  pressureMb: number;
  lastUpdated: string;
}

interface ConditionsSummary {
  activeExpeditions: number;
  countries: number;
  tempRangeC: { min: number; max: number };
  tempRangeF: { min: number; max: number };
}

export interface ConditionsResponse {
  conditions: ExpeditionCondition[];
  summary: ConditionsSummary;
  cachedAt: string;
}

interface WeatherApiResponse {
  location: {
    localtime: string;
    tz_id: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    feelslike_c: number;
    feelslike_f: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_kph: number;
    wind_mph: number;
    wind_dir: string;
    humidity: number;
    uv: number;
    vis_km: number;
    pressure_mb: number;
    last_updated: string;
  };
}

export interface ActivityPulseResponse {
  activeExplorers: number;
  activeExpeditions: number;
  newEntriesThisWeek: number;
  newExpeditionsThisWeek: number;
  totalDistanceKm: number;
  countriesReached: number;
  countryFlags: string[];
  cachedAt: string;
}

const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const STATS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function haversineKm(coord1: number[], coord2: number[]): number {
  const R = 6371;
  const toRad = Math.PI / 180;
  const dLat = (coord2[1] - coord1[1]) * toRad;
  const dLon = (coord2[0] - coord1[0]) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1[1] * toRad) *
      Math.cos(coord2[1] * toRad) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class WeatherService {
  private cachedConditions: ConditionsResponse | null = null;
  private cacheTimestamp = 0;
  private isFetching = false;

  private cachedStats: ActivityPulseResponse | null = null;
  private statsCacheTimestamp = 0;
  private isStatsRefreshing = false;

  constructor(
    private logger: Logger,
    private prisma: PrismaService,
  ) {}

  async getConditions(): Promise<ConditionsResponse> {
    const now = Date.now();
    const isStale = now - this.cacheTimestamp > CACHE_TTL_MS;

    // Return cached data if fresh
    if (this.cachedConditions && !isStale) {
      return this.cachedConditions;
    }

    // Stale-while-revalidate: return stale data but trigger background refresh
    if (this.cachedConditions && isStale && !this.isFetching) {
      this.refreshConditions().catch((err) =>
        this.logger.error(`Background weather refresh failed: ${err.message}`),
      );
      return this.cachedConditions;
    }

    // No cached data — block and fetch
    if (!this.cachedConditions) {
      await this.refreshConditions();
    }

    return (
      this.cachedConditions || {
        conditions: [],
        summary: {
          activeExpeditions: 0,
          countries: 0,
          tempRangeC: { min: 0, max: 0 },
          tempRangeF: { min: 0, max: 0 },
        },
        cachedAt: new Date().toISOString(),
      }
    );
  }

  async refreshConditions(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        this.logger.warn(
          'WEATHER_API_KEY not configured, skipping weather fetch',
        );
        return;
      }

      // Query active public expeditions with public current locations
      const expeditions = await this.prisma.expedition.findMany({
        where: {
          status: 'active',
          deleted_at: null,
          visibility: 'public',
          current_location_type: { not: null },
          current_location_visibility: 'public',
        },
        select: {
          public_id: true,
          title: true,
          category: true,
          region: true,
          current_location_type: true,
          current_location_id: true,
          author: {
            select: {
              username: true,
              profile: {
                select: {
                  name: true,
                  picture: true,
                },
              },
            },
          },
        },
      });

      if (expeditions.length === 0) {
        this.cachedConditions = {
          conditions: [],
          summary: {
            activeExpeditions: 0,
            countries: 0,
            tempRangeC: { min: 0, max: 0 },
            tempRangeF: { min: 0, max: 0 },
          },
          cachedAt: new Date().toISOString(),
        };
        this.cacheTimestamp = Date.now();
        return;
      }

      // Batch-resolve locations
      const references = expeditions
        .filter((e) => e.current_location_type && e.current_location_id)
        .map((e) => ({
          type: e.current_location_type!,
          id: e.current_location_id!,
        }));

      const locationMap = await resolveExpeditionLocations(
        this.prisma,
        references,
      );

      // Fetch weather per location
      const conditions: ExpeditionCondition[] = [];

      for (const exp of expeditions) {
        if (!exp.current_location_type || !exp.current_location_id) continue;

        const locKey = `${exp.current_location_type}:${exp.current_location_id}`;
        const location = locationMap.get(locKey);
        if (!location) continue;

        try {
          const weather = await this.fetchWeather(
            apiKey,
            location.lat,
            location.lon,
          );
          if (!weather) continue;

          // Get country code from resolved location or via reverse geocoding
          let countryCode = location.countryCode || undefined;
          if (!countryCode) {
            countryCode =
              (await getCountryCodeFromCoordinates(
                location.lat,
                location.lon,
              )) || undefined;
          }

          conditions.push({
            expeditionId: exp.public_id,
            expeditionTitle: exp.title,
            explorerUsername: exp.author.username,
            explorerPicture: exp.author.profile?.picture || undefined,
            category: exp.category || undefined,
            region: exp.region || undefined,
            locationName: location.name,
            countryCode,
            lat: location.lat,
            lon: location.lon,
            localTime: weather.location.localtime,
            timezone: weather.location.tz_id,
            tempC: weather.current.temp_c,
            tempF: weather.current.temp_f,
            feelsLikeC: weather.current.feelslike_c,
            feelsLikeF: weather.current.feelslike_f,
            condition: weather.current.condition.text,
            conditionIcon: weather.current.condition.icon,
            windKph: weather.current.wind_kph,
            windMph: weather.current.wind_mph,
            windDir: weather.current.wind_dir,
            humidity: weather.current.humidity,
            uvIndex: weather.current.uv,
            visibilityKm: weather.current.vis_km,
            pressureMb: weather.current.pressure_mb,
            lastUpdated: weather.current.last_updated,
          });

          // 100ms delay between API calls
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          this.logger.error(
            `Weather fetch failed for expedition ${exp.public_id}: ${err.message}`,
          );
        }
      }

      // Build summary
      const countryCodes = new Set(
        conditions
          .map((c) => c.countryCode)
          .filter((c): c is string => !!c),
      );
      const temps = conditions.map((c) => c.tempC);
      const tempsF = conditions.map((c) => c.tempF);

      const summary: ConditionsSummary = {
        activeExpeditions: conditions.length,
        countries: countryCodes.size,
        tempRangeC: {
          min: temps.length ? Math.min(...temps) : 0,
          max: temps.length ? Math.max(...temps) : 0,
        },
        tempRangeF: {
          min: tempsF.length ? Math.min(...tempsF) : 0,
          max: tempsF.length ? Math.max(...tempsF) : 0,
        },
      };

      this.cachedConditions = {
        conditions,
        summary,
        cachedAt: new Date().toISOString(),
      };
      this.cacheTimestamp = Date.now();
    } finally {
      this.isFetching = false;
    }
  }

  async getStats(): Promise<ActivityPulseResponse> {
    const now = Date.now();
    const isStale = now - this.statsCacheTimestamp > STATS_CACHE_TTL_MS;

    if (this.cachedStats && !isStale) {
      return this.cachedStats;
    }

    if (this.cachedStats && isStale && !this.isStatsRefreshing) {
      this.refreshStats().catch((err) =>
        this.logger.error(`Background stats refresh failed: ${err.message}`),
      );
      return this.cachedStats;
    }

    if (!this.cachedStats) {
      await this.refreshStats();
    }

    return (
      this.cachedStats || {
        activeExplorers: 0,
        activeExpeditions: 0,
        newEntriesThisWeek: 0,
        newExpeditionsThisWeek: 0,
        totalDistanceKm: 0,
        countriesReached: 0,
        countryFlags: [],
        cachedAt: new Date().toISOString(),
      }
    );
  }

  async refreshStats(): Promise<void> {
    if (this.isStatsRefreshing) return;
    this.isStatsRefreshing = true;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 1. Active expeditions + distinct explorers
      const activeExpeditions = await this.prisma.expedition.findMany({
        where: {
          status: 'active',
          deleted_at: null,
          visibility: 'public',
        },
        select: { author_id: true, route_geometry: true },
      });

      const activeExplorers = new Set(activeExpeditions.map((e) => e.author_id))
        .size;

      // 2. New entries this week
      const newEntriesThisWeek = await this.prisma.entry.count({
        where: {
          created_at: { gte: sevenDaysAgo },
          deleted_at: null,
          visibility: 'public',
        },
      });

      // 3. New expeditions this week
      const newExpeditionsThisWeek = await this.prisma.expedition.count({
        where: {
          created_at: { gte: sevenDaysAgo },
          deleted_at: null,
          visibility: 'public',
        },
      });

      // 4. Total distance from route_geometry across all public non-deleted expeditions
      let totalDistanceKm = 0;
      const expeditionsWithRoutes = await this.prisma.expedition.findMany({
        where: {
          deleted_at: null,
          visibility: 'public',
          route_geometry: { not: null },
        },
        select: { route_geometry: true },
      });

      for (const exp of expeditionsWithRoutes) {
        if (!exp.route_geometry) continue;
        try {
          const coords: number[][] = JSON.parse(exp.route_geometry);
          if (coords.length >= 2) {
            for (let i = 1; i < coords.length; i++) {
              totalDistanceKm += haversineKm(coords[i - 1], coords[i]);
            }
          }
        } catch {
          // Skip malformed geometry
        }
      }

      // 5. Country codes from public entries
      const countryGroups = await this.prisma.entry.groupBy({
        by: ['country_code'],
        where: {
          deleted_at: null,
          visibility: 'public',
          country_code: { not: null },
        },
      });

      const countryFlags = countryGroups
        .map((g) => g.country_code)
        .filter((c): c is string => !!c)
        .slice(0, 20);

      this.cachedStats = {
        activeExplorers,
        activeExpeditions: activeExpeditions.length,
        newEntriesThisWeek,
        newExpeditionsThisWeek,
        totalDistanceKm: Math.round(totalDistanceKm),
        countriesReached: countryFlags.length,
        countryFlags,
        cachedAt: new Date().toISOString(),
      };
      this.statsCacheTimestamp = Date.now();
    } catch (err) {
      this.logger.error(`Stats refresh failed: ${err.message}`);
    } finally {
      this.isStatsRefreshing = false;
    }
  }

  private async fetchWeather(
    apiKey: string,
    lat: number,
    lon: number,
  ): Promise<WeatherApiResponse | null> {
    try {
      const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lon}`;
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(
          `WeatherAPI error: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      return (await response.json()) as WeatherApiResponse;
    } catch (err) {
      this.logger.error(`WeatherAPI fetch error: ${err.message}`);
      return null;
    }
  }
}
