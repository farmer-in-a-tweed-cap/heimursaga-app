import { Injectable } from '@nestjs/common';

import { getCountryCodeFromCoordinates } from '@/lib/geocoding';
import {
  ResolvedLocation,
  resolveExpeditionLocations,
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

export interface RegionReportResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localTime: string;
    timezone: string;
  };
  elevation: number;
  current: {
    tempC: number;
    tempF: number;
    feelsLikeC: number;
    feelsLikeF: number;
    condition: string;
    conditionIcon: string;
    windKph: number;
    windMph: number;
    windDir: string;
    gustKph: number;
    gustMph: number;
    humidity: number;
    uvIndex: number;
    visibilityKm: number;
    pressureMb: number;
    precipMm: number;
    cloudCover: number;
  };
  astronomy: {
    sunrise: string;
    sunset: string;
    moonPhase: string;
    moonIllumination: number;
  };
  forecast: {
    maxTempC: number;
    maxTempF: number;
    minTempC: number;
    minTempF: number;
    chanceOfRain: number;
    chanceOfSnow: number;
    totalPrecipMm: number;
  };
  climate: { zone: string; description: string };
  nearbyParks: Array<{
    name: string;
    type: string;
    distanceKm: number;
  }>;
  nearbyPeaks: Array<{
    name: string;
    elevationM: number;
    distanceKm: number;
  }>;
  nearbyExpeditions: Array<{
    id: string;
    title: string;
    explorerUsername: string;
    distanceKm: number;
  }>;
  cachedAt: string;
}

const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const STATS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const REGION_WEATHER_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REGION_GEO_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface RegionCacheEntry {
  data: RegionReportResponse;
  weatherTimestamp: number;
  geoTimestamp: number;
}

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

  private regionCache = new Map<string, RegionCacheEntry>();

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
        conditions.map((c) => c.countryCode).filter((c): c is string => !!c),
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

  async getRegionReport(query: string): Promise<RegionReportResponse> {
    // Normalize cache key: round coords to 0.1° if numeric
    const cacheKey = this.normalizeRegionKey(query);
    const now = Date.now();
    const cached = this.regionCache.get(cacheKey);

    if (cached) {
      const weatherFresh =
        now - cached.weatherTimestamp < REGION_WEATHER_TTL_MS;
      const geoFresh = now - cached.geoTimestamp < REGION_GEO_TTL_MS;
      if (weatherFresh && geoFresh) {
        return cached.data;
      }
    }

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('WEATHER_API_KEY not configured');
    }

    // Parse coords for APIs that need them
    const coords = this.parseCoords(query);

    // Fetch all data in parallel
    const [
      weatherData,
      elevationData,
      overpassData,
      climateData,
      nearbyExpeditions,
    ] = await Promise.all([
      this.fetchRegionWeather(apiKey, query).catch((err) => {
        this.logger.error(`Region weather fetch failed: ${err.message}`);
        return null;
      }),
      coords
        ? this.fetchElevation(coords.lat, coords.lon).catch((err) => {
            this.logger.error(`Elevation fetch failed: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
      coords
        ? this.fetchOverpassData(coords.lat, coords.lon).catch((err) => {
            this.logger.error(`Overpass fetch failed: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
      coords
        ? this.fetchClimateZone(coords.lat, coords.lon).catch((err) => {
            this.logger.error(`Climate zone fetch failed: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
      coords
        ? this.fetchNearbyExpeditions(coords.lat, coords.lon).catch((err) => {
            this.logger.error(
              `Nearby expeditions fetch failed: ${err.message}`,
            );
            return [];
          })
        : Promise.resolve([]),
    ]);

    if (!weatherData) {
      throw new Error('Failed to fetch weather data for region report');
    }

    // Use coords from weather API response if we didn't have them
    const reportLat = coords?.lat ?? weatherData.location.lat;
    const reportLon = coords?.lon ?? weatherData.location.lon;

    // If we didn't have coords originally, fetch geo data now
    let elevation = elevationData;
    let overpass = overpassData;
    let climate = climateData;
    let expeditions = nearbyExpeditions;

    if (!coords && reportLat && reportLon) {
      const [elev, op, clim, exps] = await Promise.all([
        this.fetchElevation(reportLat, reportLon).catch(() => null),
        this.fetchOverpassData(reportLat, reportLon).catch(() => null),
        this.fetchClimateZone(reportLat, reportLon).catch(() => null),
        this.fetchNearbyExpeditions(reportLat, reportLon).catch(() => []),
      ]);
      elevation = elev;
      overpass = op;
      climate = clim;
      expeditions = exps;
    }

    const result: RegionReportResponse = {
      location: {
        name: weatherData.location.name,
        region: weatherData.location.region,
        country: weatherData.location.country,
        lat: reportLat,
        lon: reportLon,
        localTime: weatherData.location.localtime,
        timezone: weatherData.location.tz_id,
      },
      elevation: elevation ?? 0,
      current: {
        tempC: weatherData.current.temp_c,
        tempF: weatherData.current.temp_f,
        feelsLikeC: weatherData.current.feelslike_c,
        feelsLikeF: weatherData.current.feelslike_f,
        condition: weatherData.current.condition.text,
        conditionIcon: weatherData.current.condition.icon,
        windKph: weatherData.current.wind_kph,
        windMph: weatherData.current.wind_mph,
        windDir: weatherData.current.wind_dir,
        gustKph: weatherData.current.gust_kph,
        gustMph: weatherData.current.gust_mph,
        humidity: weatherData.current.humidity,
        uvIndex: weatherData.current.uv,
        visibilityKm: weatherData.current.vis_km,
        pressureMb: weatherData.current.pressure_mb,
        precipMm: weatherData.current.precip_mm,
        cloudCover: weatherData.current.cloud,
      },
      astronomy: weatherData.astronomy,
      forecast: weatherData.forecast,
      climate: climate ?? { zone: 'N/A', description: 'Unknown' },
      nearbyParks: overpass?.parks ?? [],
      nearbyPeaks: overpass?.peaks ?? [],
      nearbyExpeditions: expeditions,
      cachedAt: new Date().toISOString(),
    };

    this.regionCache.set(cacheKey, {
      data: result,
      weatherTimestamp: now,
      geoTimestamp:
        cached?.geoTimestamp && now - cached.geoTimestamp < REGION_GEO_TTL_MS
          ? cached.geoTimestamp
          : now,
    });

    return result;
  }

  private normalizeRegionKey(query: string): string {
    const coords = this.parseCoords(query);
    if (coords) {
      return `${(Math.round(coords.lat * 10) / 10).toFixed(1)},${(Math.round(coords.lon * 10) / 10).toFixed(1)}`;
    }
    return query.trim().toLowerCase();
  }

  private parseCoords(query: string): { lat: number; lon: number } | null {
    const parts = query.split(',').map((s) => s.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (
        !isNaN(lat) &&
        !isNaN(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
      ) {
        return { lat, lon };
      }
    }
    return null;
  }

  private async fetchRegionWeather(
    apiKey: string,
    query: string,
  ): Promise<{
    location: {
      name: string;
      region: string;
      country: string;
      lat: number;
      lon: number;
      localtime: string;
      tz_id: string;
    };
    current: {
      temp_c: number;
      temp_f: number;
      feelslike_c: number;
      feelslike_f: number;
      condition: { text: string; icon: string };
      wind_kph: number;
      wind_mph: number;
      wind_dir: string;
      gust_kph: number;
      gust_mph: number;
      humidity: number;
      uv: number;
      vis_km: number;
      pressure_mb: number;
      precip_mm: number;
      cloud: number;
    };
    astronomy: {
      sunrise: string;
      sunset: string;
      moonPhase: string;
      moonIllumination: number;
    };
    forecast: {
      maxTempC: number;
      maxTempF: number;
      minTempC: number;
      minTempF: number;
      chanceOfRain: number;
      chanceOfSnow: number;
      totalPrecipMm: number;
    };
  } | null> {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=1&aqi=no`;
    const response = await fetch(url);
    if (!response.ok) {
      this.logger.error(
        `WeatherAPI forecast error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const raw = await response.json();
    const forecastDay = raw.forecast?.forecastday?.[0];
    const astro = forecastDay?.astro;
    const day = forecastDay?.day;

    return {
      location: {
        name: raw.location.name,
        region: raw.location.region,
        country: raw.location.country,
        lat: raw.location.lat,
        lon: raw.location.lon,
        localtime: raw.location.localtime,
        tz_id: raw.location.tz_id,
      },
      current: {
        temp_c: raw.current.temp_c,
        temp_f: raw.current.temp_f,
        feelslike_c: raw.current.feelslike_c,
        feelslike_f: raw.current.feelslike_f,
        condition: {
          text: raw.current.condition.text,
          icon: raw.current.condition.icon,
        },
        wind_kph: raw.current.wind_kph,
        wind_mph: raw.current.wind_mph,
        wind_dir: raw.current.wind_dir,
        gust_kph: raw.current.gust_kph,
        gust_mph: raw.current.gust_mph,
        humidity: raw.current.humidity,
        uv: raw.current.uv,
        vis_km: raw.current.vis_km,
        pressure_mb: raw.current.pressure_mb,
        precip_mm: raw.current.precip_mm,
        cloud: raw.current.cloud,
      },
      astronomy: {
        sunrise: astro?.sunrise ?? '',
        sunset: astro?.sunset ?? '',
        moonPhase: astro?.moon_phase ?? '',
        moonIllumination: parseInt(astro?.moon_illumination ?? '0', 10),
      },
      forecast: {
        maxTempC: day?.maxtemp_c ?? 0,
        maxTempF: day?.maxtemp_f ?? 0,
        minTempC: day?.mintemp_c ?? 0,
        minTempF: day?.mintemp_f ?? 0,
        chanceOfRain: day?.daily_chance_of_rain ?? 0,
        chanceOfSnow: day?.daily_chance_of_snow ?? 0,
        totalPrecipMm: day?.totalprecip_mm ?? 0,
      },
    };
  }

  private async fetchElevation(
    lat: number,
    lon: number,
  ): Promise<number | null> {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.elevation?.[0] ?? null;
  }

  private async fetchOverpassData(
    lat: number,
    lon: number,
  ): Promise<{
    parks: Array<{ name: string; type: string; distanceKm: number }>;
    peaks: Array<{ name: string; elevationM: number; distanceKm: number }>;
  }> {
    const radiusM = 150000; // 150km
    const query = `
      [out:json][timeout:15];
      (
        relation["boundary"="national_park"](around:${radiusM},${lat},${lon});
        way["boundary"="national_park"](around:${radiusM},${lat},${lon});
        relation["leisure"="nature_reserve"](around:${radiusM},${lat},${lon});
        node["natural"="peak"]["ele"](around:${radiusM},${lat},${lon});
      );
      out center tags;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) return { parks: [], peaks: [] };

    const data = await response.json();
    const parks: Array<{ name: string; type: string; distanceKm: number }> = [];
    const peaks: Array<{
      name: string;
      elevationM: number;
      distanceKm: number;
    }> = [];

    for (const el of data.elements || []) {
      const name = el.tags?.name;
      if (!name) continue;

      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      if (elLat == null || elLon == null) continue;

      const dist = haversineKm([lon, lat], [elLon, elLat]);

      if (
        el.tags?.boundary === 'national_park' ||
        el.tags?.leisure === 'nature_reserve'
      ) {
        const type =
          el.tags?.boundary === 'national_park'
            ? 'National Park'
            : 'Nature Reserve';
        parks.push({ name, type, distanceKm: Math.round(dist * 10) / 10 });
      } else if (el.tags?.natural === 'peak' && el.tags?.ele) {
        const elevationM = parseFloat(el.tags.ele);
        if (!isNaN(elevationM)) {
          peaks.push({
            name,
            elevationM,
            distanceKm: Math.round(dist * 10) / 10,
          });
        }
      }
    }

    // Sort parks by distance, take top 5
    parks.sort((a, b) => a.distanceKm - b.distanceKm);
    // Sort peaks by elevation descending, take top 3
    peaks.sort((a, b) => b.elevationM - a.elevationM);

    return {
      parks: parks.slice(0, 5),
      peaks: peaks.slice(0, 3),
    };
  }

  private async fetchClimateZone(
    lat: number,
    lon: number,
  ): Promise<{ zone: string; description: string } | null> {
    const url = `http://climateapi.scottpinkelman.com/api/v1/location/${lat}/${lon}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const info = data.return_values?.[0];
    if (!info) return null;
    return {
      zone: info.koppen_geiger_zone ?? 'N/A',
      description: info.zone_description ?? 'Unknown',
    };
  }

  private async fetchNearbyExpeditions(
    lat: number,
    lon: number,
  ): Promise<
    Array<{
      id: string;
      title: string;
      explorerUsername: string;
      distanceKm: number;
    }>
  > {
    // Rough bounding box for 500km (~4.5 degrees)
    const degRange = 4.5;
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
        current_location_type: true,
        current_location_id: true,
        author: { select: { username: true } },
      },
    });

    if (expeditions.length === 0) return [];

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

    const results: Array<{
      id: string;
      title: string;
      explorerUsername: string;
      distanceKm: number;
    }> = [];

    for (const exp of expeditions) {
      if (!exp.current_location_type || !exp.current_location_id) continue;
      const locKey = `${exp.current_location_type}:${exp.current_location_id}`;
      const loc = locationMap.get(locKey);
      if (!loc) continue;

      // Quick bounding box filter
      if (
        Math.abs(loc.lat - lat) > degRange ||
        Math.abs(loc.lon - lon) > degRange
      )
        continue;

      const dist = haversineKm([lon, lat], [loc.lon, loc.lat]);
      if (dist <= 500) {
        results.push({
          id: exp.public_id,
          title: exp.title,
          explorerUsername: exp.author.username,
          distanceKm: Math.round(dist * 10) / 10,
        });
      }
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results.slice(0, 3);
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
