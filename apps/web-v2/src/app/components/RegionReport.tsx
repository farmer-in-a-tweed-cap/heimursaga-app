import { useState, useEffect, useRef, useCallback } from 'react';

import { useAuth } from '@/app/context/AuthContext';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import {
  weatherApi,
  explorerApi,
  type ActivityPulseResponse,
  type RegionReportResponse,
} from '@/app/services/api';

import { CountryFlag } from './CountryFlag';

// ─── Helpers ────────────────────────────────────────────────────────────────

function uvLabel(uv: number): string {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

/** Parse 12h time string (e.g. "06:45 PM") to minutes since midnight */
function parse12hToMinutes(time: string): number | null {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

/**
 * Calculate daylight remaining purely from the location's local time strings
 * (no JS Date conversion needed — both values are in the same location timezone).
 * localTime format: "2024-01-15 14:30"
 * sunset format: "06:45 PM"
 */
function daylightRemaining(sunset: string, localTime: string): string {
  try {
    const sunsetMins = parse12hToMinutes(sunset);
    if (sunsetMins == null) return '--';

    // Extract HH:MM from localTime "YYYY-MM-DD HH:MM"
    const timePart = localTime.split(' ')[1];
    if (!timePart) return '--';
    const [h, m] = timePart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '--';
    const nowMins = h * 60 + m;

    const diff = sunsetMins - nowMins;
    if (diff <= 0) return 'After sunset';
    const diffH = Math.floor(diff / 60);
    const diffM = diff % 60;
    return `${diffH}h ${diffM}m left`;
  } catch {
    return '--';
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4 hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all">
      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-mono">
        {label}
      </div>
      <div className="text-2xl font-medium text-[#202020] dark:text-[#e5e5e5] mb-1">
        {value}
      </div>
      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
        {detail}
      </div>
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4 animate-pulse">
      <div className="h-3 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-2 rounded" />
      <div className="h-7 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-2 rounded" />
      <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
        <div className="h-3 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a] rounded" />
      </div>
    </div>
  );
}

// ─── Page 1: Live Exploration Pulse ─────────────────────────────────────────

function PulsePage({
  data,
  formatDistance,
}: {
  data: ActivityPulseResponse | null;
  formatDistance: (km: number, decimals?: number) => string;
}) {
  if (!data) {
    return (
      <>
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </>
    );
  }

  return (
    <>
      <StatTile
        label="ACTIVE NOW"
        value={data.activeExplorers}
        detail={
          data.activeExpeditions === 1
            ? `${data.activeExplorers} explorer in the field`
            : `${data.activeExpeditions} expedition${data.activeExpeditions !== 1 ? 's' : ''} live`
        }
      />
      <StatTile
        label="NEW THIS WEEK"
        value={data.newEntriesThisWeek}
        detail={
          data.newExpeditionsThisWeek > 0
            ? `entries, +${data.newExpeditionsThisWeek} expedition${data.newExpeditionsThisWeek !== 1 ? 's' : ''}`
            : 'entries this week'
        }
      />
      <StatTile
        label="DISTANCE LOGGED"
        value={formatDistance(data.totalDistanceKm, 0)}
        detail={`Across ${data.activeExpeditions} route${data.activeExpeditions !== 1 ? 's' : ''}`}
      />
      <StatTile
        label="GLOBAL REACH"
        value={data.countriesReached}
        detail={
          data.countryFlags.length > 0 ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              {data.countryFlags.slice(0, 8).map((code) => (
                <CountryFlag
                  key={code}
                  code={code}
                  className="w-5 h-auto inline-block"
                />
              ))}
              {data.countryFlags.length > 8 && (
                <span className="text-[#616161] dark:text-[#b5bcc4]">
                  +{data.countryFlags.length - 8}
                </span>
              )}
            </span>
          ) : (
            'Countries reached'
          )
        }
      />
    </>
  );
}

// ─── Page 2: Conditions ─────────────────────────────────────────────────────

function ConditionsPage({
  data,
  useMetric,
}: {
  data: RegionReportResponse;
  useMetric: boolean;
}) {
  const c = data.current;
  const a = data.astronomy;
  const f = data.forecast;

  return (
    <>
      <StatTile
        label="CONDITIONS"
        value={useMetric ? `${c.tempC}°C` : `${c.tempF}°F`}
        detail={
          <span>
            Feels {useMetric ? `${c.feelsLikeC}°C` : `${c.feelsLikeF}°F`}
            {' · '}
            {c.condition}
            {' · '}
            {c.cloudCover}% cloud
          </span>
        }
      />
      <StatTile
        label="WIND & VISIBILITY"
        value={
          useMetric
            ? `${c.windKph} km/h ${c.windDir}`
            : `${c.windMph} mph ${c.windDir}`
        }
        detail={
          <span>
            Gusts {useMetric ? `${c.gustKph} km/h` : `${c.gustMph} mph`}
            {' · '}
            Vis {useMetric ? `${c.visibilityKm} km` : `${(c.visibilityKm * 0.621371).toFixed(1)} mi`}
          </span>
        }
      />
      <StatTile
        label="ATMOSPHERE"
        value={`${c.humidity}%`}
        detail={
          <span>
            UV {c.uvIndex} ({uvLabel(c.uvIndex)})
            {' · '}
            {c.pressureMb} mb
            {' · '}
            {f.chanceOfRain}% rain
          </span>
        }
      />
      <StatTile
        label="DAYLIGHT"
        value={a.sunrise}
        detail={
          <span>
            Sunset {a.sunset}
            {' · '}
            {daylightRemaining(a.sunset, data.location.localTime)}
            {' · '}
            {a.moonPhase}
          </span>
        }
      />
    </>
  );
}

// ─── Page 3: Terrain & Geography ────────────────────────────────────────────

function TerrainPage({
  data,
  formatDistance,
  useMetric,
}: {
  data: RegionReportResponse;
  formatDistance: (km: number, decimals?: number) => string;
  useMetric: boolean;
}) {
  const highestPeak = data.nearbyPeaks[0];
  const nearestPark = data.nearbyParks[0];
  const nearestExp = data.nearbyExpeditions[0];

  const formatElev = (m: number) =>
    useMetric
      ? `${m.toLocaleString()} m`
      : `${Math.round(m * 3.28084).toLocaleString()} ft`;

  return (
    <>
      <StatTile
        label="ELEVATION"
        value={formatElev(data.elevation)}
        detail={
          highestPeak ? (
            <span>
              {highestPeak.name} ({formatElev(highestPeak.elevationM)}) ·{' '}
              {formatDistance(highestPeak.distanceKm, 0)} away
            </span>
          ) : (
            'No major peaks nearby'
          )
        }
      />
      <StatTile
        label="CLIMATE ZONE"
        value={data.climate.zone}
        detail={data.climate.description}
      />
      <StatTile
        label="PARKS & RESERVES"
        value={data.nearbyParks.length}
        detail={
          nearestPark ? (
            <span>
              {nearestPark.name} · {formatDistance(nearestPark.distanceKm, 0)}
            </span>
          ) : (
            useMetric ? 'None within 150 km' : 'None within 93 mi'
          )
        }
      />
      <StatTile
        label="NEARBY EXPEDITIONS"
        value={data.nearbyExpeditions.length}
        detail={
          nearestExp ? (
            <span>
              {nearestExp.title} · @{nearestExp.explorerUsername}
            </span>
          ) : (
            useMetric ? 'None within 500 km' : 'None within 310 mi'
          )
        }
      />
    </>
  );
}

// ─── Location Prompt ────────────────────────────────────────────────────────

function LocationPrompt() {
  return (
    <div className="col-span-2 md:col-span-4 text-center py-6">
      <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-2">
        Enable location or update your profile to see regional field conditions.
      </p>
      <a
        href="/settings"
        className="text-xs text-[#4676ac] hover:text-[#365a87] font-mono"
      >
        UPDATE PROFILE →
      </a>
    </div>
  );
}

// ─── Page Dots ──────────────────────────────────────────────────────────────

function PageDots({
  total,
  active,
  onSelect,
}: {
  total: number;
  active: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`w-2 h-2 rounded-full transition-all ${
            i === active
              ? 'bg-[#ac6d46] scale-110'
              : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] hover:bg-[#616161]'
          }`}
          aria-label={`Page ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const AUTO_ROTATE_MS = 10_000;
const REFRESH_MS = 15 * 60 * 1000;

export function RegionReport() {
  const { user, isAuthenticated } = useAuth();
  const { formatDistance, unit } = useDistanceUnit();
  const useMetric = unit === 'km';

  // Data state
  const [pulseData, setPulseData] = useState<ActivityPulseResponse | null>(null);
  const [regionData, setRegionData] = useState<RegionReportResponse | null>(null);
  const [locationQuery, setLocationQuery] = useState<string | null>(null);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null); // null = resolving
  const [error, setError] = useState(false);

  // Ticker state
  const [activePage, setActivePage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalPages = hasLocation ? 3 : 1;

  // ── Location resolution ─────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const resolveLocation = async () => {
      // 1. Browser geolocation
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 300000,
          });
        });
        if (!cancelled) {
          setLocationQuery(`${pos.coords.latitude},${pos.coords.longitude}`);
          setHasLocation(true);
          return;
        }
      } catch {
        // Geolocation denied or timed out
      }

      // 2. Active expedition location from profile
      if (isAuthenticated && user?.username) {
        try {
          const profile = await explorerApi.getByUsername(user.username);
          if (!cancelled && profile.activeExpeditionLocation) {
            const { lat, lon } = profile.activeExpeditionLocation;
            setLocationQuery(`${lat},${lon}`);
            setHasLocation(true);
            return;
          }
          // 3. "Lives in" location
          if (!cancelled && profile.locationLives) {
            setLocationQuery(profile.locationLives);
            setHasLocation(true);
            return;
          }
        } catch {
          // Profile fetch failed
        }
      }

      if (!cancelled) {
        setHasLocation(false);
      }
    };

    resolveLocation();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.username]);

  // ── Fetch pulse data (always) ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchPulse = async () => {
      try {
        const result = await weatherApi.getStats();
        if (!cancelled) setPulseData(result);
      } catch {
        // Pulse fetch failed silently
      }
    };

    fetchPulse();
    const interval = setInterval(fetchPulse, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── Fetch region data (when location available) ─────────────────────────

  useEffect(() => {
    if (!locationQuery) return;
    let cancelled = false;

    const fetchRegion = async () => {
      try {
        const result = await weatherApi.getRegionReport(locationQuery);
        if (!cancelled) {
          setRegionData(result);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    fetchRegion();
    const interval = setInterval(fetchRegion, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [locationQuery]);

  // ── Auto-rotation ───────────────────────────────────────────────────────

  const goToPage = useCallback(
    (page: number) => {
      setTransitioning(true);
      setTimeout(() => {
        setActivePage(page);
        setTransitioning(false);
      }, 150);
    },
    [],
  );

  useEffect(() => {
    if (totalPages <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setActivePage((prev) => (prev + 1) % totalPages);
        setTransitioning(false);
      }, 150);
    }, AUTO_ROTATE_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalPages, isHovered]);

  const handleDotClick = useCallback(
    (idx: number) => {
      goToPage(idx);
      // Reset timer
      if (timerRef.current) clearInterval(timerRef.current);
      if (totalPages > 1 && !isHovered) {
        timerRef.current = setInterval(() => {
          setTransitioning(true);
          setTimeout(() => {
            setActivePage((prev) => (prev + 1) % totalPages);
            setTransitioning(false);
          }, 150);
        }, AUTO_ROTATE_MS);
      }
    },
    [goToPage, totalPages, isHovered],
  );

  // Clamp activePage to valid range (derived, no effect needed)
  const currentPage = activePage >= totalPages ? 0 : activePage;

  // ── Header info ─────────────────────────────────────────────────────────

  const locationName = regionData
    ? [regionData.location.name, regionData.location.region, regionData.location.country]
        .filter(Boolean)
        .join(', ')
    : locationQuery || '';
  const coordsDisplay = regionData
    ? `${regionData.location.lat.toFixed(2)}°, ${regionData.location.lon.toFixed(2)}°`
    : '';

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-sm font-bold dark:text-[#e5e5e5] shrink-0">
            REGIONAL FIELD REPORT
          </h3>
          {locationName && (
            <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono truncate hidden sm:inline">
              {locationName}
            </span>
          )}
          {coordsDisplay && (
            <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono hidden md:inline">
              [{coordsDisplay}]
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <PageDots
            total={totalPages}
            active={currentPage}
            onSelect={handleDotClick}
          />
        )}
      </div>

      {/* Tile Grid with crossfade */}
      <div
        className={`grid grid-cols-2 md:grid-cols-4 gap-4 transition-all duration-300 ${
          transitioning
            ? 'opacity-0 translate-y-1'
            : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Page order with location: Conditions → Terrain → Pulse */}
        {/* Without location: Pulse only */}
        {hasLocation && currentPage === 0 && regionData && (
          <ConditionsPage data={regionData} useMetric={useMetric} />
        )}

        {hasLocation && currentPage === 1 && regionData && (
          <TerrainPage data={regionData} formatDistance={formatDistance} useMetric={useMetric} />
        )}

        {/* Pulse is page 2 with location, page 0 without */}
        {((hasLocation && currentPage === 2) || (!hasLocation && currentPage === 0)) && (
          <PulsePage data={pulseData} formatDistance={formatDistance} />
        )}

        {/* Loading skeleton for conditions/terrain when region data loading */}
        {hasLocation && currentPage < 2 && !regionData && !error && (
          <>
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
            <SkeletonTile />
          </>
        )}

        {/* Error state for conditions/terrain pages */}
        {hasLocation && currentPage < 2 && error && (
          <div className="col-span-2 md:col-span-4 text-center py-4">
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
              Failed to load regional data. Retrying...
            </p>
          </div>
        )}

        {/* No-location prompt below pulse when no location */}
        {hasLocation === false && currentPage === 0 && isAuthenticated && (
          <LocationPrompt />
        )}
      </div>
    </div>
  );
}
