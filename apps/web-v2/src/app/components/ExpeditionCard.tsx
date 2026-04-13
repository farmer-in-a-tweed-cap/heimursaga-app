'use client';

import { useRef, useEffect } from "react";
import { MapPin, DollarSign, Bookmark, Loader2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { RadialProgress } from "@/app/components/ui/radial-progress";
import { Progress } from "@/app/components/ui/progress";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { useAuth } from "@/app/context/AuthContext";
import { useProFeatures } from "@/app/hooks/useProFeatures";
import { useDistanceUnit } from "@/app/context/DistanceUnitContext";
import { useTheme } from "@/app/context/ThemeContext";
import { useMapLayer, getMapStyle, getLineCasingColor, applyNauticalOverlay } from "@/app/context/MapLayerContext";
import { formatDate } from "@/app/utils/dateFormat";
import { formatDuration } from "@/app/utils/formatDuration";

interface Waypoint {
  id: string;
  title: string;
  location: string;
  coords: { lat: number; lng: number };
  date: string;
  status: 'completed' | 'current' | 'planned';
  notes?: string;
}

interface JournalEntry {
  id: string;
  title: string;
  date: string;
  location: string;
  coords: { lat: number; lng: number };
  type: 'standard' | 'photo' | 'video' | 'data' | 'waypoint';
}

interface ExpeditionCardProps {
  id: string;
  title: string;
  explorer: string;
  description: string;
  imageUrl: string;
  location?: string; // Deprecated - use currentLocationSource/Id
  coordinates?: string; // Deprecated - use currentLocationSource/Id
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  waypoints?: Waypoint[];
  journalEntriesArray?: JournalEntry[];
  startDate: string;
  endDate: string | null;
  journalEntries: number;
  fundingGoal: number;
  fundingCurrent: number;
  fundingPercentage: number;
  backers: number;
  distance?: number;
  waypointsCount?: number;
  status: "active" | "completed" | "planned" | "cancelled";
  region?: string;
  locationName?: string;
  terrain: string;
  averageSpeed: number;
  visibility?: 'public' | 'off-grid' | 'private';
  sponsorshipsEnabled?: boolean;
  /** Whether the expedition creator has an Explorer Pro account (required for sponsorships) */
  explorerIsPro?: boolean;
  /** Whether the explorer's Stripe Connect account is verified and ready to receive payments */
  stripeConnected?: boolean;
  isBookmarked?: boolean;
  isBookmarkLoading?: boolean;
  isBlueprint?: boolean;
  mode?: string;
  adoptionsCount?: number;
  averageRating?: number;
  ratingsCount?: number;
  elevationMinM?: number;
  elevationMaxM?: number;
  estimatedDurationH?: number;
  /** Waypoint coordinates for static map (blueprints) */
  waypointCoords?: Array<{ lat: number; lng: number }>;
  onViewJournal?: () => void;
  onSupport?: () => void;
  onBookmark?: () => void;
  onViewExplorer?: () => void;
  onAdopt?: () => void;
}

export function ExpeditionCard({
  title,
  explorer,
  description,
  imageUrl,
  location,
  coordinates,
  currentLocationSource,
  currentLocationId,
  waypoints = [],
  journalEntriesArray = [],
  startDate,
  endDate,
  journalEntries,
  fundingGoal,
  fundingCurrent,
  fundingPercentage,
  backers,
  distance,
  waypointsCount = 0,
  status,
  region,
  locationName,
  sponsorshipsEnabled = true,
  explorerIsPro = false,
  stripeConnected = false,
  isBookmarked = false,
  isBookmarkLoading = false,
  isBlueprint = false,
  mode,
  adoptionsCount = 0,
  averageRating,
  ratingsCount = 0,
  elevationMinM,
  elevationMaxM,
  estimatedDurationH,
  waypointCoords = [],
  onViewJournal,
  onSupport,
  onBookmark,
  onViewExplorer,
  onAdopt,
}: ExpeditionCardProps) {
  const { isAuthenticated, user } = useAuth();
  const { canAdoptBlueprints } = useProFeatures();
  const { unit: distanceUnit, distanceLabel } = useDistanceUnit();
  const { theme } = useTheme();
  const { mapLayer, nauticalOverlay } = useMapLayer();
  const router = useRouter();

  const MODE_LABELS: Record<string, string> = {
    hike: 'HIKE', paddle: 'PADDLE', bike: 'BIKE',
    sail: 'SAIL', drive: 'DRIVE', mixed: 'MIXED',
  };

  // Sponsorship UI only shows if explorer is Pro AND sponsorships are enabled AND Stripe Connect is verified
  const showSponsorshipSection = !isBlueprint && explorerIsPro && sponsorshipsEnabled && stripeConnected;

  // Blueprint route map (real Mapbox GL instance, non-interactive)
  const blueprintMapRef = useRef<HTMLDivElement>(null);
  const blueprintMapInstanceRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!isBlueprint || waypointCoords.length === 0 || !blueprintMapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (!token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: blueprintMapRef.current,
      style: getMapStyle(mapLayer, theme),
      center: [waypointCoords[0].lng, waypointCoords[0].lat],
      zoom: 10,
      interactive: false,
      attributionControl: false,
      projection: 'mercator',
    });

    blueprintMapInstanceRef.current = map;

    map.on('error', (e) => {
      if (e.error?.message?.includes('evaluated to null')) return;
    });

    map.on('load', () => {
      applyNauticalOverlay(map, nauticalOverlay);
      const casingColor = getLineCasingColor(mapLayer, theme);
      const routeCoordinates = waypointCoords.map(c => [c.lng, c.lat] as [number, number]);

      // Route line — matches detail page fallback (no directions route)
      if (routeCoordinates.length >= 2) {
        map.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: routeCoordinates },
          },
        });
        map.addLayer({
          id: 'route-line-casing',
          type: 'line',
          source: 'route-line',
          paint: { 'line-color': casingColor, 'line-width': 7, 'line-opacity': 0.3 },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: { 'line-color': '#999999', 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': [2, 2] },
        });
      }

      // Waypoint markers — same styling as detail page unconverted waypoints
      waypointCoords.forEach((c, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === waypointCoords.length - 1 && waypointCoords.length > 1;

        const wrapper = document.createElement('div');

        if (isStart || isEnd) {
          // Start/end — diamond marker
          const diamond = document.createElement('div');
          Object.assign(diamond.style, {
            width: '30px', height: '30px',
            backgroundColor: isStart ? '#ac6d46' : '#4676ac',
            border: '3px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: 'rotate(45deg)',
          });
          const label = document.createElement('span');
          Object.assign(label.style, {
            transform: 'rotate(-45deg)', color: 'white',
            fontWeight: 'bold', fontSize: '13px', lineHeight: '1',
          });
          label.textContent = isStart ? 'S' : 'E';
          diamond.appendChild(label);
          wrapper.appendChild(diamond);
        } else {
          // Intermediate — gray circle
          Object.assign(wrapper.style, {
            width: '22px', height: '22px', borderRadius: '50%',
            backgroundColor: '#616161', border: '2px solid white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          });
          const circleLabel = document.createElement('span');
          Object.assign(circleLabel.style, {
            color: 'white', fontWeight: 'bold', fontSize: '10px', lineHeight: '1',
          });
          circleLabel.textContent = String(idx + 1);
          wrapper.appendChild(circleLabel);
        }

        new mapboxgl.Marker(wrapper).setLngLat([c.lng, c.lat]).addTo(map);
      });

      // Fit bounds to show all waypoints
      const bounds = waypointCoords.reduce(
        (b, c) => b.extend([c.lng, c.lat]),
        new mapboxgl.LngLatBounds([waypointCoords[0].lng, waypointCoords[0].lat], [waypointCoords[0].lng, waypointCoords[0].lat])
      );
      map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 });
    });

    return () => {
      map.remove();
      blueprintMapInstanceRef.current = null;
    };
  }, [isBlueprint, waypointCoords, theme, mapLayer, nauticalOverlay]);

  // Helper to get current location from waypoints/entries
  const getCurrentLocation = () => {
    if (currentLocationSource && currentLocationId) {
      if (currentLocationSource === 'waypoint') {
        const waypoint = waypoints.find(w => w.id === currentLocationId);
        if (waypoint) {
          return {
            location: waypoint.location,
            coordinates: `${waypoint.coords.lat.toFixed(4)}°N, ${waypoint.coords.lng.toFixed(4)}°E`,
          };
        }
      } else {
        const entry = journalEntriesArray.find(e => e.id === currentLocationId);
        if (entry) {
          return {
            location: entry.location,
            coordinates: `${entry.coords.lat.toFixed(4)}°N, ${entry.coords.lng.toFixed(4)}°E`,
          };
        }
      }
    }
    
    // Fallback to legacy props
    return {
      location: location || locationName || region || 'Location not set',
      coordinates: coordinates || '',
    };
  };

  const currentLocation = getCurrentLocation();
  const statusColors: Record<string, string> = {
    active: "bg-[#ac6d46]",
    completed: "bg-[#616161]",
    planned: "bg-[#4676ac]",
    cancelled: "bg-[#994040]",
  };

  const statusHex: Record<string, string> = {
    active: "#ac6d46",
    completed: "#616161",
    planned: "#4676ac",
    cancelled: "#994040",
  };

  const statusLabels: Record<string, string> = {
    active: "ACTIVE EXPEDITION",
    completed: "COMPLETED EXPEDITION",
    planned: "PLANNED EXPEDITION",
    cancelled: "CANCELLED EXPEDITION",
  };

  // Status-aware date stats
  const now = Date.now();
  const startMs = startDate ? new Date(startDate).getTime() : null;
  const endMs = endDate ? new Date(endDate).getTime() : null;
  const totalPlannedDays = startMs && endMs ? Math.max(1, Math.ceil((endMs - startMs) / 86400000)) : null;

  const dateStats = (() => {
    if (status === 'completed') {
      return {
        gridLabel: 'Duration:',
        gridValue: totalPlannedDays ? `${totalPlannedDays}d` : 'N/A',
        row2Left: { label: 'Duration:', value: totalPlannedDays ? `${totalPlannedDays}d` : 'N/A' },
        row2Right: null,
        progress: 100,
      };
    }
    if (status === 'active') {
      const daysActive = startMs ? Math.max(1, Math.ceil((now - startMs) / 86400000)) : 0;
      const remaining = endMs ? Math.max(0, Math.ceil((endMs - now) / 86400000)) : null;
      const total = totalPlannedDays ?? (remaining != null ? daysActive + remaining : null);
      const pct = total && total > 0 ? Math.min((daysActive / total) * 100, 100) : 0;
      return {
        gridLabel: 'Days Active:',
        gridValue: String(daysActive),
        row2Left: { label: 'Remaining:', value: remaining != null ? `${remaining}d` : '∞' },
        row2Right: { label: 'Total:', value: total ? `${total}d` : 'N/A' },
        progress: pct,
      };
    }
    // planned (or cancelled)
    const startsIn = startMs ? Math.max(0, Math.ceil((startMs - now) / 86400000)) : null;
    return {
      gridLabel: 'Starts In:',
      gridValue: startsIn != null ? `${startsIn}d` : 'TBD',
      row2Left: { label: 'Starts In:', value: startsIn != null ? `${startsIn}d` : 'TBD' },
      row2Right: { label: 'Duration:', value: totalPlannedDays ? `${totalPlannedDays}d` : 'TBD' },
      progress: 0,
    };
  })();

  const isFullyFunded = fundingPercentage >= 100;

  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col overflow-hidden h-full w-full max-w-lg">
      {/* Header: Status Bar */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 ${isBlueprint ? 'bg-[#598636]' : statusColors[status]}`} />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            {isBlueprint ? 'EXPEDITION BLUEPRINT' : statusLabels[status]}
          </span>
        </div>
        {mode && (
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: isBlueprint ? '#598636' : (statusHex[status] || '#616161') }}
          >
            {MODE_LABELS[mode] || mode.toUpperCase()}
          </span>
        )}
      </div>

      {/* Section: Hero Image / Route Map */}
      <div className="relative h-56 overflow-hidden border-b-2 border-[#202020] dark:border-[#616161]">
        {isBlueprint ? (
          <div ref={blueprintMapRef} className="h-full w-full [&_.mapboxgl-ctrl-logo]:!hidden [&_.mapboxgl-ctrl-attrib]:!hidden" />
        ) : (
          <ImageWithFallback
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        )}
        {(locationName || region) && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#202020]/90 px-4 py-2.5 text-white">
            <div className="flex items-center gap-2 text-xs font-mono">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-2">{locationName || region}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section: Title & Explorer */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-4 py-4 bg-white dark:bg-[#202020]">
        <h3 className="font-serif font-bold text-lg leading-tight dark:text-[#e5e5e5] mb-2 line-clamp-2">{title}</h3>
        <p className="text-sm font-mono mb-3">
          <span className="text-[#616161] dark:text-[#b5bcc4]">{isBlueprint ? 'Guide: ' : 'Explorer: '}</span>
          <button
            onClick={onViewExplorer}
            className={`transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none ${
              isBlueprint
                ? 'text-[#598636] hover:text-[#4676ac] focus-visible:ring-[#598636]'
                : 'text-[#ac6d46] hover:text-[#4676ac] dark:text-[#ac6d46] dark:hover:text-[#4676ac] focus-visible:ring-[#ac6d46]'
            }`}
          >
            {explorer}
          </button>
        </p>
        <p className="text-sm font-serif text-[#202020] dark:text-[#e5e5e5] line-clamp-3" style={{ lineHeight: 1.75 }}>{description}</p>
      </div>

      {/* Section: Key Stats Grid */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs">
          {isBlueprint ? (
            <>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Rating:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">
                  {ratingsCount > 0 ? (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#ac6d46] text-[#ac6d46]" />
                      {(averageRating || 0).toFixed(1)}
                      <span className="font-normal text-xs text-[#616161] dark:text-[#b5bcc4]">({ratingsCount})</span>
                    </span>
                  ) : (
                    <span className="text-[#b5bcc4] dark:text-[#616161]">No reviews</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Launches:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{adoptionsCount}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Waypoints:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{waypointsCount}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Distance ({distanceLabel}):</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{Math.round(distanceUnit === 'mi' ? (distance || 0) * 0.621371 : (distance || 0)).toLocaleString()}</div>
              </div>
              {elevationMinM != null && elevationMaxM != null && (
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Elev. Range ({distanceUnit === 'mi' ? 'ft' : 'm'}):</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">
                  {distanceUnit === 'mi'
                    ? `${Math.round(elevationMinM * 3.28084).toLocaleString()}–${Math.round(elevationMaxM * 3.28084).toLocaleString()}`
                    : `${Math.round(elevationMinM).toLocaleString()}–${Math.round(elevationMaxM).toLocaleString()}`
                  }
                </div>
              </div>
              )}
              {estimatedDurationH != null && (
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Travel Time:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{formatDuration(estimatedDurationH)}</div>
              </div>
              )}
            </>
          ) : (
            <>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">{dateStats.gridLabel}</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{dateStats.gridValue}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Distance ({distanceLabel}):</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{Math.round(distanceUnit === 'mi' ? (distance || 0) * 0.621371 : (distance || 0)).toLocaleString()}</div>
              </div>
              {elevationMinM != null && elevationMaxM != null && (
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Elev. Range ({distanceUnit === 'mi' ? 'ft' : 'm'}):</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">
                  {distanceUnit === 'mi'
                    ? `${Math.round(elevationMinM * 3.28084).toLocaleString()}–${Math.round(elevationMaxM * 3.28084).toLocaleString()}`
                    : `${Math.round(elevationMinM).toLocaleString()}–${Math.round(elevationMaxM).toLocaleString()}`
                  }
                </div>
              </div>
              )}
              {estimatedDurationH != null && (
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Travel Time:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{formatDuration(estimatedDurationH)}</div>
              </div>
              )}
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Journal Entries:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{journalEntries || 0}</div>
              </div>
              {showSponsorshipSection && (
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-0.5">Sponsors:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{backers || 0}</div>
              </div>
              )}
            </>
          )}
        </div>
      </div>

      {isBlueprint ? (
        /* Blueprint: description fill area */
        <div className="px-4 py-4 flex-1 flex items-center bg-white dark:bg-[#202020]">
          <div className="font-mono text-xs text-[#616161] dark:text-[#b5bcc4]" style={{ lineHeight: 1.75 }}>
            Pre-planned expedition route. Launch your own expedition from this blueprint with a proven route.
          </div>
        </div>
      ) : (
        <>
          {/* Section: Timeline Progress — bar + header */}
          <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold font-mono dark:text-[#e5e5e5]">
                {status === 'completed' ? 'EXPEDITION COMPLETE' : 'TIMELINE'}
              </span>
              <span className="font-mono text-sm font-bold text-[#4676ac]">
                {Math.round(dateStats.progress)}%
              </span>
            </div>
            <Progress
              value={dateStats.progress}
              indicatorColor="bg-[#4676ac]"
              className="mb-3 h-2.5"
            />
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="text-[#616161] dark:text-[#b5bcc4]">
                <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{startDate ? (formatDate(startDate) || startDate) : 'TBD'}</span> — <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{endDate ? (formatDate(endDate) || endDate) : 'Ongoing'}</span>
              </div>
              {totalPlannedDays && (
                <div className="text-[#616161] dark:text-[#b5bcc4]">
                  Duration: <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{totalPlannedDays}d</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Funding Status — grid + radial */}
          {showSponsorshipSection ? (
            <div className={`px-4 py-3 flex-1 flex items-center ${
              isFullyFunded
                ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]'
                : 'bg-white dark:bg-[#202020]'
            }`}>
              <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs">
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">Raised:</div>
                    <div className={`font-bold text-sm ${isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'}`}>
                      ${(fundingCurrent || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">Goal:</div>
                    <div className={`font-bold text-sm ${isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'}`}>
                      {fundingGoal ? `$${fundingGoal.toLocaleString()}` : 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">Sponsors:</div>
                    <div className={`font-bold text-sm ${isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'}`}>
                      {backers || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">Remaining:</div>
                    <div className={`font-bold text-sm ${isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'dark:text-[#e5e5e5]'}`}>
                      ${Math.max(0, (fundingGoal || 0) - (fundingCurrent || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div>
                  <RadialProgress
                    value={Math.min(fundingPercentage || 0, 100)}
                    size={85}
                    strokeWidth={7}
                    color={isFullyFunded ? '#616161' : '#ac6d46'}
                    centerContent={
                      <div className="text-center">
                        <div className={`text-lg font-bold font-mono ${
                          isFullyFunded ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#ac6d46]'
                        }`}>
                          {(fundingPercentage || 0).toFixed(0)}%
                        </div>
                        <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          Funded
                        </div>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-4 flex-1 flex items-center bg-white dark:bg-[#202020]">
              <div className="font-mono text-xs text-[#616161] dark:text-[#b5bcc4]">
                Self-funded expedition. Explorer is not accepting sponsorships for this journey.
              </div>
            </div>
          )}
        </>
      )}

      {/* Section: Actions */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 mt-auto">
        <div className="flex items-center justify-center gap-2">
          {isBlueprint ? (
            <>
              {user?.username !== explorer && (!isAuthenticated || canAdoptBlueprints) && (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
                    } else {
                      onAdopt?.();
                    }
                  }}
                  className="flex-1 px-4 py-2 text-xs font-bold bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap"
                >
                  LAUNCH
                </button>
              )}
              <button
                onClick={onViewJournal}
                className="flex-1 px-4 py-2 text-xs font-bold transition-all whitespace-nowrap active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]"
              >
                VIEW BLUEPRINT
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onViewJournal}
                className="flex-1 px-4 py-2 text-xs font-bold bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap"
              >
                VIEW EXPEDITION
              </button>
              {showSponsorshipSection && status !== 'completed' && user?.username !== explorer && (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
                    } else {
                      onSupport?.();
                    }
                  }}
                  className="flex-1 px-4 py-2 text-xs font-bold transition-all whitespace-nowrap active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]"
                >
                  SPONSOR
                </button>
              )}
            </>
          )}
          {/* Bookmark button - Hidden when not authenticated */}
          {isAuthenticated && (
            <button
              onClick={onBookmark}
              disabled={isBookmarkLoading}
              className={`px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                isBookmarked
                  ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                  : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
              }`}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              {isBookmarkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}