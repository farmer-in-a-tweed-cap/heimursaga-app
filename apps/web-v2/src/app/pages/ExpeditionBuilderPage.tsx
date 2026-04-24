'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
import { MapPin, Trash2, Upload, Info, X, Locate, Lock, Loader2, ChevronUp, ChevronDown, AlertTriangle, Search, Plus, RotateCw, Download } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { DatePicker } from '@/app/components/DatePicker';
import { ConfirmationModal } from '@/app/components/ConfirmationModal';
import { RouteImportModal } from '@/app/components/RouteImportModal';
import type { ImportedRoute } from '@/app/utils/routeFileParser';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useMapLayer, getMapStyle, getLineCasingColor, applyNauticalOverlay } from '@/app/context/MapLayerContext';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { toast } from 'sonner';
import { expeditionApi, entryApi, uploadApi, routingApi, type RouteObstacle } from '@/app/services/api';
import { formatDateTime } from '@/app/utils/dateFormat';
import { formatDuration } from '@/app/utils/formatDuration';
import { GEO_REGION_GROUPS } from '@/app/utils/geoRegions';
import { haversineFromLatLng } from '@/app/utils/haversine';

import { ROUTE_MODE_STYLES } from '@/app/utils/mapRouteDrawing';

import { createPOIGeocoder, searchAlongRoute, fetchPOICategories, retrievePOI, clearRouteSearchCache, clipRouteToBounds } from '@/app/utils/poiGeocoder';
import type { POIResult, POICategory } from '@/app/utils/poiGeocoder';
import { useBuilderDateHandlers } from '@/app/hooks/useBuilderDateHandlers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

type RouteMode = 'straight' | 'passage' | 'walking' | 'cycling' | 'driving' | 'trail' | 'waterway' | 'imported';

/** Returns true for route modes that don't need a directions API fetch (point-to-point straight lines). */
const isStraightLike = (mode: string) => mode === 'straight' || mode === 'passage';

/**
 * `imported` is a pseudo-mode used when a guide uploads a GPX/KML/GeoJSON file.
 * The leg's geometry is the raw trackline from the file — no routing API is
 * ever called for it. Treated as non-straight in render logic (so the stored
 * geometry is drawn verbatim) but excluded from any fetch path.
 */
const isImported = (mode: string) => mode === 'imported';
type WaterwayProfile = 'paddle' | 'motor';

/** Split a continuous route geometry at waypoint locations to get per-leg coordinate arrays. */
function splitGeometryAtWaypoints(
  fullCoords: number[][],
  waypointLngLats: [number, number][], // [lng, lat] for each waypoint
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
  travelTimeFromPrevious?: number; // seconds
  cumulativeTravelTime?: number; // seconds
  elevationM?: number; // metres above sea level, auto-fetched from Open Meteo on add
  entryIds: string[]; // entry public_ids linked to this waypoint
}

interface ExpeditionData {
  title: string;
  regions: string[];
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  visibility: 'public' | 'off-grid' | 'private';
}

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

// Module-scope constants (avoid re-allocation per render)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_COVER_SIZE = 25 * 1024 * 1024; // 25MB
const QUICK_PICK_IDS = [
  'restaurant', 'cafe', 'hotel', 'lodging', 'gas_station', 'grocery',
  'supermarket', 'pharmacy', 'hospital', 'campground', 'parking',
  'atm', 'post_office', 'drinking_water', 'laundry', 'bar',
];

/** Convert an ISO date string to YYYY-MM-DD format. */
function toDateString(d: string | Date | undefined | null): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

/** Aggregate per-segment distances/durations between waypoint indices. */
function aggregateLegs(
  legDistances: number[],
  legDurations: number[],
  waypointIndices: number[],
): { distances: number[]; durations: number[] } {
  const distances: number[] = [];
  const durations: number[] = [];
  for (let i = 0; i < waypointIndices.length - 1; i++) {
    let dist = 0;
    let dur = 0;
    for (let leg = waypointIndices[i]; leg < waypointIndices[i + 1]; leg++) {
      dist += legDistances[leg] ?? 0;
      dur += legDurations[leg] ?? 0;
    }
    distances.push(dist);
    durations.push(dur);
  }
  return { distances, durations };
}

/** Build snap-distance warnings for waypoints that were snapped far from their input location. */
function buildSnapWarnings(
  snapDists: number[],
  points: Array<{ name?: string }>,
  waypointIndices: number[] | undefined,
  threshold: number,
  label: string,
  isRoundTrip: boolean,
  formatDist: (km: number, dp: number) => string,
): string[] {
  const warnings: string[] = [];
  if (waypointIndices) {
    waypointIndices.forEach((wpIdx, i) => {
      if (wpIdx < snapDists.length && snapDists[wpIdx] > threshold) {
        const name = points[wpIdx]?.name || `Waypoint ${i + 1}`;
        warnings.push(`${name} is ${formatDist(snapDists[wpIdx] / 1000, 1)} from the nearest ${label}`);
      }
    });
  } else {
    const waypointCount = isRoundTrip ? snapDists.length - 1 : snapDists.length;
    for (let i = 0; i < waypointCount && i < points.length; i++) {
      if (snapDists[i] > threshold) {
        const name = points[i].name || `Waypoint ${i + 1}`;
        warnings.push(`${name} is ${formatDist(snapDists[i] / 1000, 1)} from the nearest ${label}`);
      }
    }
  }
  return warnings;
}

/** Stitch per-leg coordinate arrays into a single continuous geometry. */
function stitchLegCoords(legs: { coords: number[][] }[]): number[][] {
  return legs.reduce<number[][]>((acc, leg, i) =>
    i === 0 ? [...leg.coords] : [...acc, ...leg.coords.slice(1)], []);
}

export function ExpeditionBuilderPage() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { mapLayer, nauticalOverlay } = useMapLayer();
  const nauticalOverlayRef = useRef(nauticalOverlay);
  nauticalOverlayRef.current = nauticalOverlay;
  const { formatDistance, unit } = useDistanceUnit();
  const { isPro, isGuide, canCreateBlueprints: canCreateBlueprintsRaw } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const isEditMode = !!expeditionId;
  // When editing an existing expedition, respect the loaded row's type rather
  // than the user's account capabilities — a guide editing one of their own
  // standard (non-blueprint) expeditions must stay in expedition mode, and
  // editing a blueprint must stay in blueprint mode.
  const [loadedIsBlueprint, setLoadedIsBlueprint] = useState<boolean | null>(null);
  // In create mode: guides default to blueprint, `?mode=expedition` forces
  // standard. In edit mode: whatever the loaded expedition is.
  const canCreateBlueprints = isEditMode
    ? loadedIsBlueprint === true
    : canCreateBlueprintsRaw && searchParams?.get('mode') !== 'expedition';
  // Guides get a much higher waypoint description cap so they can document route details
  // (trailheads, hazards, campsites, etc.) when publishing blueprints, including content
  // imported from GPX/KML/GeoJSON files which often contain long trip reports.
  const waypointDescriptionMax = isGuide ? 4000 : 500;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const waypointsRef = useRef<Waypoint[]>([]);
  const routeOrderRef = useRef<string[]>([]);
  const expeditionEntriesRef = useRef<Array<{ id: string; title: string; date: string; place: string; coords: { lat: number; lng: number } }>>([]);
  const entryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const clusteredEntryRef = useRef<{ cleanup: () => void; recalculate: () => void; markers: mapboxgl.Marker[]; removeAllHighlights: () => void } | null>(null);
  const reorderNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionsAbortRef = useRef<AbortController | null>(null);
  const lastDirectionsCoordsRef = useRef<string>(''); // Fingerprint to prevent re-fetch loops
  const skipFitBoundsRef = useRef(false); // Skip fitBounds after geocoder/POI waypoint placement
  const addWaypointRef = useRef<((lat: number, lng: number, name: string, location: string) => void) | null>(null);
  const obstacleMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeSearchMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const routeSearchResultsRef = useRef<POIResult[]>([]);
  const perLegModesRef = useRef<RouteMode[]>([]);
  const perLegGeomsRef = useRef<number[][][]>([]);
  /** Per-leg routing cache: key encodes endpoints + mode so unchanged legs are reused. */
  const legCacheRef = useRef<{ key: string; coords: number[][]; distance: number; duration: number; obstacles?: RouteObstacle[] }[]>([]);
  const searchResultRef = useRef<{ lng: number; lat: number; name: string; address: string } | null>(null);
  const isRoundTripRef = useRef(false);
  const waterwayProfileRef = useRef<WaterwayProfile>('paddle');
  const directionsGeometryRef = useRef<[number, number][] | null>(null);
  const legModeAbortRef = useRef<AbortController | null>(null); // Per-leg mode change abort

  // Mobile detection — builder requires desktop
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [confirmingDeleteExpedition, setConfirmingDeleteExpedition] = useState(false);
  const [isDeletingExpedition, setIsDeletingExpedition] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Route item reorder
  const [routeOrder, setRouteOrder] = useState<string[]>([]); // persistent display order by ID
  const routeOrderInitializedRef = useRef(false); // true once routeOrder has been set from saved data
  const [movedWaypointId, setMovedWaypointId] = useState<string | null>(null);
  const movedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Route mode / Directions API state
  const [routeMode, setRouteMode] = useState<RouteMode>('straight');
  const [waterwayProfile, setWaterwayProfile] = useState<WaterwayProfile>('paddle');
  const [directionsGeometry, setDirectionsGeometry] = useState<[number, number][] | null>(null);
  const [directionsLegDistances, setDirectionsLegDistances] = useState<number[] | null>(null);
  const [directionsLegDurations, setDirectionsLegDurations] = useState<number[] | null>(null); // seconds per leg
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsProgress, setDirectionsProgress] = useState<string | null>(null);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [directionsWarnings, setDirectionsWarnings] = useState<string[]>([]);
  const [waterwayFlowDirection, setWaterwayFlowDirection] = useState<'downstream' | 'upstream' | 'mixed' | null>(null);
  const [waterwayUpstreamFraction, setWaterwayUpstreamFraction] = useState<number | null>(null);
  const [waterwayObstacles, setWaterwayObstacles] = useState<RouteObstacle[]>([]);
  const [perLegModes, setPerLegModes] = useState<RouteMode[]>([]); // empty = all legs use routeMode
  const [perLegGeometries, setPerLegGeometries] = useState<number[][][]>([]);
  const [expandedLegCard, setExpandedLegCard] = useState<number | null>(null);

  // Helper to keep ref in sync with state
  const setPerLegModesAndRef = useCallback((modes: RouteMode[]) => {
    perLegModesRef.current = modes;
    setPerLegModes(modes);
  }, []);
  const setPerLegGeomsAndRef = useCallback((geoms: number[][][]) => {
    perLegGeomsRef.current = geoms;
    setPerLegGeometries(geoms);
  }, []);

  // Route file import (guide-only)
  const [showRouteImportModal, setShowRouteImportModal] = useState(false);
  const [routeImportPending, setRouteImportPending] = useState<{
    file: File;
    distanceKm: number;
  } | null>(null);

  // Route search (Find Along Route) state
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const [routeSearchResults, setRouteSearchResults] = useState<POIResult[]>([]);
  const [routeSearchLoading, setRouteSearchLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<POICategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [routeSearchProximity, setRouteSearchProximity] = useState(5);

  const [expeditionData, setExpeditionData] = useState<ExpeditionData>({
    title: '',
    regions: [],
    description: '',
    category: '',
    startDate: '',
    endDate: '',
    visibility: 'public'
  });

  const [locationName, setLocationName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [countryName, setCountryName] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [locationAutoFilled, setLocationAutoFilled] = useState(false);
  const [locationManuallyEdited, setLocationManuallyEdited] = useState(false);
  const lastGeocodedCoords = useRef<string | null>(null);

  const [estimatedDurationH, setEstimatedDurationH] = useState<string>('');
  const [durationAutoFilled, setDurationAutoFilled] = useState(false);
  const [durationManuallyEdited, setDurationManuallyEdited] = useState(false);

  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [originalStartDate, setOriginalStartDate] = useState<string | null>(null);
  const [expeditionMode, setExpeditionMode] = useState<string>('');
  const [vesselName, setVesselName] = useState('');
  const [vesselType, setVesselType] = useState('');
  const [vesselLengthM, setVesselLengthM] = useState('');
  const [vesselDraftM, setVesselDraftM] = useState('');
  const [vesselCrewSize, setVesselCrewSize] = useState('');
  const [passageSpeedKn, setPassageSpeedKn] = useState('6');
  const [sponsorshipsEnabled, setSponsorshipsEnabled] = useState(false);
  const [sponsorshipGoal, setSponsorshipGoal] = useState<number | ''>('');
  // Guide-only: whether viewers/adopters of a published blueprint can download
  // the route as a GPX file. Owner can always export regardless.
  const [routeExportAllowed, setRouteExportAllowed] = useState(true);
  const [notesAccessThreshold, setNotesAccessThreshold] = useState<number | ''>('');
  const [notesVisibility, setNotesVisibility] = useState<'public' | 'sponsor'>('public');
  const [earlyAccessEnabled, setEarlyAccessEnabled] = useState(false);
  const [expectedDuration, setExpectedDuration] = useState('');
  const [currentLocationSource, setCurrentLocationSource] = useState<'waypoint' | 'entry'>('waypoint');
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [tags, setTags] = useState('');
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null); // Uploaded URL for API
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Auto-geocode location from first waypoint
  // Re-triggers when the first waypoint coordinates change (unless user manually edited)
  useEffect(() => {
    if (waypoints.length === 0) return;
    // Never overwrite a manually edited location
    if (locationManuallyEdited) return;

    const firstWp = waypoints[0];
    if (!firstWp?.coordinates?.lat || !firstWp?.coordinates?.lng) return;

    const { lat, lng } = firstWp.coordinates;
    // Round to ~11m precision to avoid re-geocoding on sub-pixel map drags
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (coordKey === lastGeocodedCoords.current) return;

    const controller = new AbortController();

    // Per-category rules: [importance score, max distance meters]
    const POINT_RULES: Record<string, [number, number]> = {
      volcano: [100, 5000], glacier: [95, 3000], mountain: [70, 2000],
      waterfall: [65, 200], hot_spring: [60, 200],
      lake: [50, 500], river: [45, 500], beach: [40, 300],
    };
    const AREA_RULES: Record<string, [number, number]> = {
      national_park: [100, 10000], national_forest: [90, 8000],
      state_park: [80, 5000], nature_reserve: [70, 1000],
    };

    const pickBest = (features: any[], rules: Record<string, [number, number]>) => {
      let best: { name: string; type: string; score: number } | null = null;
      for (const f of features) {
        const { name, distance, poi_category_ids } = f.properties || {};
        if (!name || distance == null) continue;
        let topCat = '';
        let catScore = 0;
        for (const cat of (poi_category_ids || [])) {
          const rule = rules[cat];
          if (!rule) continue;
          const [score, maxDist] = rule;
          if (distance > maxDist) continue;
          if (score > catScore) { catScore = score; topCat = cat; }
        }
        if (!catScore) continue;
        const finalScore = catScore - distance / 100;
        if (!best || finalScore > best.score) best = { name, type: topCat, score: finalScore };
      }
      return best;
    };

    const pointCats = Object.keys(POINT_RULES).join(',');
    const areaCats = Object.keys(AREA_RULES).join(',');

    // Tilequery: find named features AT the exact coordinates (rivers, mountains, lakes)
    const tilequeryPromise = fetch(
      `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=100&layers=natural_label&limit=5&access_token=${MAPBOX_TOKEN}`,
      { signal: controller.signal },
    ).then(r => r.ok ? r.json() : null).catch(() => null);

    const pointPromise = fetch(
      `https://api.mapbox.com/search/searchbox/v1/category/${pointCats}?proximity=${lng},${lat}&limit=10&access_token=${MAPBOX_TOKEN}`,
      { signal: controller.signal },
    ).then(r => r.json()).catch(() => null);

    const areaPromise = fetch(
      `https://api.mapbox.com/search/searchbox/v1/category/${areaCats}?proximity=${lng},${lat}&limit=5&access_token=${MAPBOX_TOKEN}`,
      { signal: controller.signal },
    ).then(r => r.json()).catch(() => null);

    const mapboxPromise = fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=locality,place,district,region,country&limit=1&access_token=${MAPBOX_TOKEN}`,
      { signal: controller.signal },
    ).then(r => r.json()).catch(() => null);

    Promise.all([tilequeryPromise, pointPromise, areaPromise, mapboxPromise]).then(async ([tileData, pointData, areaData, mapboxData]) => {
      // Standard land-based flow
      if (mapboxData?.features?.length) {
        const feature = mapboxData.features[0];

        let cc = '';
        let cn = '';
        let sp = '';

        if (feature.place_type?.includes('country')) {
          cc = (feature.properties?.short_code || '').toUpperCase();
          cn = feature.text || '';
        }
        if (feature.context) {
          for (const ctx of feature.context) {
            if (ctx.id?.startsWith('country.')) {
              cc = (ctx.short_code || '').toUpperCase();
              cn = ctx.text || '';
            } else if (ctx.id?.startsWith('region.')) {
              sp = ctx.text || '';
            }
          }
        }

        setCountryCode(cc);
        setCountryName(cn);
        setStateProvince(sp);

        // Tilequery: pick the closest named natural feature at the point
        let atPoint: { name: string; type: string } | null = null;
        if (tileData?.features?.length) {
          let bestDist = Infinity;
          for (const f of tileData.features) {
            const props = f.properties || {};
            const name = props.name || props.name_en;
            if (!name) continue;
            const dist = props.tilequery?.distance ?? 999;
            if (dist > 100) continue;
            if (dist < bestDist) {
              atPoint = { name, type: props.class || 'natural' };
              bestDist = dist;
            }
          }
        }

        const searchPoint = pointData ? pickBest(pointData.features || [], POINT_RULES) : null;
        const area = areaData ? pickBest(areaData.features || [], AREA_RULES) : null;

        // Tilequery result (feature the waypoint is ON) takes precedence
        const point = atPoint || searchPoint;

        const parts: string[] = [];
        if (point) parts.push(point.name);
        if (area && area.name !== point?.name) parts.push(area.name);

        if (parts.length > 0) {
          if (sp) parts.push(sp);
          if (cn) parts.push(cn);
          setLocationName(parts.join(', '));
        } else {
          setLocationName(feature.place_name || '');
        }
        setLocationAutoFilled(true);
        lastGeocodedCoords.current = coordKey;
        return;
      }

      // Open water fallback — no admin context from Mapbox geocoding
      // Confirm point is in water, then match against known water bodies
      try {
        const waterCheckRes = await fetch(
          `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=0&layers=water&limit=1&access_token=${MAPBOX_TOKEN}`,
          { signal: controller.signal },
        );
        const waterCheckData = waterCheckRes.ok ? await waterCheckRes.json() : null;
        if (!waterCheckData?.features?.length) return; // not in water

        // Known water body bounding boxes (specific → general)
        const WATER_BODIES: { name: string; bounds: [number, number, number, number] }[] = [
          { name: 'Gulf of Maine', bounds: [-71, 42, -65, 45.5] },
          { name: 'Chesapeake Bay', bounds: [-77, 36.5, -75.5, 39.5] },
          { name: 'Gulf of Mexico', bounds: [-98, 18, -80, 31] },
          { name: 'Gulf of California', bounds: [-115, 22, -107, 32] },
          { name: 'Puget Sound', bounds: [-123.5, 47, -122, 49] },
          { name: 'Gulf of St. Lawrence', bounds: [-67, 45.5, -56, 52] },
          { name: 'Hudson Bay', bounds: [-95, 51, -75, 63.5] },
          { name: 'Caribbean Sea', bounds: [-88, 9, -59, 22] },
          { name: 'English Channel', bounds: [-6, 48.5, 2, 51.5] },
          { name: 'Irish Sea', bounds: [-7, 51, -3, 55] },
          { name: 'North Sea', bounds: [-4, 51, 10, 62] },
          { name: 'Baltic Sea', bounds: [10, 53, 30, 66] },
          { name: 'Bay of Biscay', bounds: [-10, 43, -1, 48.5] },
          { name: 'Adriatic Sea', bounds: [12, 39.5, 20, 45.8] },
          { name: 'Aegean Sea', bounds: [22, 35, 28, 41] },
          { name: 'Tyrrhenian Sea', bounds: [9, 37.5, 16.5, 43.5] },
          { name: 'Mediterranean Sea', bounds: [-6, 30, 36.5, 46] },
          { name: 'Black Sea', bounds: [27, 40.5, 42, 47] },
          { name: 'Red Sea', bounds: [32, 12.5, 44, 30] },
          { name: 'Persian Gulf', bounds: [47, 23, 57, 31] },
          { name: 'Arabian Sea', bounds: [51, 5, 77, 25] },
          { name: 'Bay of Bengal', bounds: [77, 5, 100, 23] },
          { name: 'South China Sea', bounds: [100, 0, 121, 23] },
          { name: 'Sea of Japan', bounds: [127, 33, 142, 52] },
          { name: 'Coral Sea', bounds: [142, -26, 175, -10] },
          { name: 'Tasman Sea', bounds: [147, -47, 175, -28] },
          { name: 'Norwegian Sea', bounds: [-10, 62, 20, 72] },
          { name: 'North Atlantic Ocean', bounds: [-80, 0, 0, 72] },
          { name: 'South Atlantic Ocean', bounds: [-70, -60, 20, 0] },
          { name: 'North Pacific Ocean', bounds: [100, 0, -80, 65] },
          { name: 'South Pacific Ocean', bounds: [140, -60, -70, 0] },
          { name: 'Indian Ocean', bounds: [20, -60, 147, 30] },
          { name: 'Southern Ocean', bounds: [-180, -90, 180, -60] },
          { name: 'Arctic Ocean', bounds: [-180, 72, 180, 90] },
        ];

        let waterBodyName: string | null = null;
        for (const wb of WATER_BODIES) {
          const [minLon, minLat, maxLon, maxLat] = wb.bounds;
          if (minLon <= maxLon) {
            if (lng >= minLon && lng <= maxLon && lat >= minLat && lat <= maxLat) { waterBodyName = wb.name; break; }
          } else {
            if ((lng >= minLon || lng <= maxLon) && lat >= minLat && lat <= maxLat) { waterBodyName = wb.name; break; }
          }
        }

        // Try to find nearest country for context
        const countryRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&limit=1&access_token=${MAPBOX_TOKEN}`,
          { signal: controller.signal },
        );
        const countryData = countryRes.ok ? await countryRes.json() : null;
        const nearCountry = countryData?.features?.[0];
        const cc = nearCountry ? (nearCountry.properties?.short_code || '').toUpperCase() : '';
        const cn = nearCountry?.text || '';

        setCountryCode(cc);
        setCountryName(cn);
        setStateProvince('');

        if (waterBodyName) {
          const parts = [waterBodyName];
          if (cn) parts.push(cn);
          setLocationName(parts.join(', '));
        } else {
          setLocationName(cn ? `Open water, ${cn}` : 'Open water');
        }
        setLocationAutoFilled(true);
        lastGeocodedCoords.current = coordKey;
      } catch {
        // Silently fail — location just won't auto-detect
      }
    });

    return () => controller.abort();
  }, [waypoints, locationManuallyEdited]);

  // Auto-calculate estimated duration from route distance, elevation, and mode
  // Fetches elevation data from Open Meteo for Naismith-style ascent penalties
  useEffect(() => {
    if (durationManuallyEdited) return;
    if (waypoints.length < 2) {
      if (estimatedDurationH) {
        setEstimatedDurationH('');
        setDurationAutoFilled(false);
      }
      return;
    }

    const lastWp = waypoints[waypoints.length - 1];
    const distKm = lastWp?.cumulativeDistance || 0;
    if (distKm <= 0) return;

    const controller = new AbortController();
    const mode = expeditionMode || routeMode || 'hike';
    const sailSpeedKmh = parseFloat(passageSpeedKn) > 0 ? parseFloat(passageSpeedKn) / 0.539957 : 14.8;

    // Sail/paddle: skip elevation fetch — use distance-only calculation
    if (mode === 'sail' || mode === 'paddle') {
      const speed = mode === 'sail' ? sailSpeedKmh : 5;
      const hours = distKm / speed;
      if (hours > 0) {
        setEstimatedDurationH(String(Math.round(hours * 10) / 10));
        setDurationAutoFilled(true);
      }
      return;
    }

    const lats = waypoints.map(w => w.coordinates.lat).join(',');
    const lons = waypoints.map(w => w.coordinates.lng).join(',');

    fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`, {
      signal: controller.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (durationManuallyEdited) return;

        let gain = 0;
        const elevations: number[] = data?.elevation || [];
        if (elevations.length > 1) {
          for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) gain += diff;
          }
        }

        const speeds: Record<string, { base: number; ascentPenalty: number }> = {
          hike: { base: 4.5, ascentPenalty: 1.67 },
          bike: { base: 15, ascentPenalty: 3.33 },
          drive: { base: 50, ascentPenalty: 0 },
          mixed: { base: 4.5, ascentPenalty: 1.67 },
          walking: { base: 4.5, ascentPenalty: 1.67 },
          trail: { base: 4, ascentPenalty: 1.67 },
          cycling: { base: 15, ascentPenalty: 3.33 },
          driving: { base: 50, ascentPenalty: 0 },
          waterway: { base: 5, ascentPenalty: 0 },
        };
        const s = speeds[mode] || speeds.hike;
        const baseHours = distKm / s.base;
        const ascentHours = (gain / 1000) * s.ascentPenalty;
        const totalHours = baseHours + ascentHours;

        if (totalHours > 0) {
          setEstimatedDurationH(String(Math.round(totalHours * 10) / 10));
          setDurationAutoFilled(true);
        }
      })
      .catch(() => {
        // Fallback: distance-only calculation if elevation fetch fails
        if (durationManuallyEdited) return;
        const baseSpeeds: Record<string, number> = {
          hike: 4.5, bike: 15, drive: 50, mixed: 4.5,
          walking: 4.5, trail: 4, cycling: 15, driving: 50, waterway: 5,
        };
        const hours = distKm / (baseSpeeds[mode] || 4.5);
        if (hours > 0) {
          setEstimatedDurationH(String(Math.round(hours * 10) / 10));
          setDurationAutoFilled(true);
        }
      });

    return () => controller.abort();
  }, [waypoints, expeditionMode, routeMode, durationManuallyEdited]);

  // Auto-select default route mode based on expedition type
  useEffect(() => {
    const defaultModes: Record<string, RouteMode> = {
      sail: 'passage',
      paddle: 'waterway',
      hike: 'trail',
      bike: 'cycling',
      drive: 'driving',
    };
    const target = defaultModes[expeditionMode];
    if (target && routeMode !== target) {
      setRouteMode(target);
    }
  }, [expeditionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entries loaded from expedition (read-only context in builder)
  const [expeditionEntries, setExpeditionEntries] = useState<Array<{
    id: string; title: string; date: string; place: string;
    coords: { lat: number; lng: number };
  }>>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Draft / Autosave state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [existingDraft, setExistingDraft] = useState<any | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const isAutoSavingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Handle cover photo upload
  const handleCoverPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSubmitError('Invalid file type. Please use JPG, PNG, or WEBP');
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_COVER_SIZE) {
      setSubmitError('Cover photo must be less than 25MB');
      e.target.value = '';
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingCover(true);
    setSubmitError(null); // Clear any previous errors
    try {
      const response = await uploadApi.upload(file);
      setCoverPhotoUrl(response.original); // Store the server URL
    } catch {
      setSubmitError('Failed to upload cover photo');
      setCoverPhotoPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle expedition deletion
  const handleDeleteExpedition = async () => {
    if (!expeditionId) return;
    setIsDeletingExpedition(true);
    try {
      await expeditionApi.delete(expeditionId);
      toast.success('Expedition deleted');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete expedition');
    } finally {
      setIsDeletingExpedition(false);
    }
  };

  // Handle expedition creation/update
  const handleCreateExpedition = async (createFirstEntry = false) => {
    // --- Form validation (toast notifications) ---
    const errors: string[] = [];

    if (!expeditionData.title.trim()) {
      errors.push('Expedition title is required');
    }
    if (expeditionData.regions.length === 0) {
      errors.push('At least one region is required');
    }
    if (!expeditionData.description.trim()) {
      errors.push('Expedition description is required');
    }
    // Blueprints don't require dates or category
    if (!canCreateBlueprints) {
      if (!expeditionData.startDate) {
        errors.push('Start date is required');
      }
      if (!expeditionData.category) {
        errors.push('Category is required');
      }
    }
    if (!canCreateBlueprints && !coverPhotoUrl && !isEditMode) {
      errors.push('Cover photo is required');
    }
    if (!estimatedDurationH || Number(estimatedDurationH) <= 0) {
      errors.push('Travel time is required');
    }
    if (!expeditionMode) {
      errors.push('Expedition type is required');
    }
    // Blueprints require at least 2 waypoints
    if (canCreateBlueprints && waypoints.length < 2) {
      errors.push('Blueprints require at least 2 waypoints');
    }

    if (errors.length > 0) {
      errors.forEach(msg => toast.error(msg));
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        title: expeditionData.title,
        description: expeditionData.description,
        // Blueprints support Public + Off-Grid (not Private — adopters need to
        // discover them). Non-blueprint expeditions retain the full picker.
        visibility: canCreateBlueprints
          ? (expeditionData.visibility === 'off-grid' ? 'off-grid' : 'public')
          : expeditionData.visibility,
        status,
        startDate: canCreateBlueprints ? undefined : (expeditionData.startDate || undefined),
        endDate: canCreateBlueprints ? undefined : (expeditionData.endDate || undefined),
        coverImage: coverPhotoUrl || undefined,
        goal: canCreateBlueprints ? undefined : (sponsorshipsEnabled && sponsorshipGoal ? Number(sponsorshipGoal) : undefined),
        notesAccessThreshold: canCreateBlueprints ? undefined : (notesVisibility === 'sponsor' && notesAccessThreshold ? Number(notesAccessThreshold) : 0),
        notesVisibility: canCreateBlueprints ? undefined : notesVisibility,
        earlyAccessEnabled: canCreateBlueprints ? undefined : (sponsorshipsEnabled ? earlyAccessEnabled : false),
        isRoundTrip,
        category: canCreateBlueprints ? undefined : (expeditionData.category || undefined),
        region: expeditionData.regions.length > 0 ? expeditionData.regions.join(', ') : undefined,
        locationName: locationName || undefined,
        countryCode: countryCode || undefined,
        countryName: countryName || undefined,
        stateProvince: stateProvince || undefined,
        routeMode: (() => { const u = new Set(perLegModes); if (u.size > 1) return 'mixed'; const m = perLegModes[0] || routeMode; return !isStraightLike(m) ? m : (m === 'passage' ? 'passage' : null); })(),
        routeGeometry: perLegModes.some(m => !isStraightLike(m)) && directionsGeometry ? directionsGeometry : null,
        routeLegModes: new Set(perLegModes).size > 1 ? perLegModes : undefined,
        routeDistanceKm: totalDistance > 0 ? Math.round(totalDistance * 10) / 10 : undefined,
        routeObstacles: waterwayObstacles.length > 0 ? waterwayObstacles : null,
        routeExportAllowed: canCreateBlueprints ? routeExportAllowed : undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        isBlueprint: canCreateBlueprints ? true : undefined,
        mode: expeditionMode || undefined,
        vesselName: vesselName || undefined,
        vesselType: vesselType || undefined,
        vesselLengthM: vesselLengthM ? parseFloat(vesselLengthM) : undefined,
        vesselDraftM: vesselDraftM ? parseFloat(vesselDraftM) : undefined,
        vesselCrewSize: vesselCrewSize ? parseInt(vesselCrewSize) : undefined,
        estimatedDurationH: estimatedDurationH ? Number(estimatedDurationH) : undefined,
      };

      // Completed expeditions: only send allowed fields (title, description, cover, waypoints)
      const finalPayload = isCompletedExpedition
        ? { title: payload.title, description: payload.description, coverImage: payload.coverImage, routeGeometry: payload.routeGeometry }
        : payload;

      let expeditionPublicId: string;

      // Build waypoint payload in display order (routeItems), including entries
      const orderedWaypoints = routeItems
        .filter(item => item.kind === 'waypoint' || (item.kind === 'entry' && item.entry.coords?.lat != null))
        .map((item, i) => {
          if (item.kind === 'waypoint') {
            return {
              lat: item.waypoint.coordinates.lat,
              lon: item.waypoint.coordinates.lng,
              elevationM: item.waypoint.elevationM,
              title: item.waypoint.name || undefined,
              date: item.waypoint.date || undefined,
              description: item.waypoint.description || undefined,
              sequence: i,
              entryIds: item.waypoint.entryIds?.length > 0 ? item.waypoint.entryIds : undefined,
            };
          }
          // Entry as route item — create a waypoint at the entry's coordinates
          return {
            lat: item.entry.coords.lat,
            lon: item.entry.coords.lng,
            title: item.entry.title || undefined,
            date: item.entry.date || undefined,
            sequence: i,
            entryId: item.entry.id,
          };
        });

      if (isEditMode && expeditionId) {
        await expeditionApi.update(expeditionId, finalPayload);
        expeditionPublicId = expeditionId;
        await expeditionApi.syncWaypoints(expeditionId, orderedWaypoints);
      } else if (draftId) {
        // Publishing from a draft — update final state, sync waypoints, then publish
        expeditionPublicId = draftId;
        const { status: _status, ...draftPayload } = payload;
        await expeditionApi.update(draftId, draftPayload);
        await expeditionApi.syncWaypoints(draftId, orderedWaypoints);

        // Transition from draft to planned/active/completed
        await expeditionApi.publishDraft(draftId);
      } else {
        const result = await expeditionApi.create(payload);
        expeditionPublicId = (result as any).expeditionId || (result as any).id;

        if (orderedWaypoints.length > 0) {
          await expeditionApi.syncWaypoints(expeditionPublicId, orderedWaypoints);
        }

        // Blueprints are always created as drafts server-side (they must pass
        // publishDraftExpedition's validation gate). Clicking PUBLISH BLUEPRINT
        // in this branch means the user hit publish before autosave had a
        // chance to create a draftId, so explicitly transition to published
        // here to match the `else if (draftId)` flow above.
        if (canCreateBlueprints) {
          await expeditionApi.publishDraft(expeditionPublicId);
        }
      }

      if (createFirstEntry) {
        router.push(`/create-entry/${expeditionPublicId}`);
      } else {
        router.push(`/expedition/${expeditionPublicId}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to create expedition';
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Save blueprint as draft without publishing
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const handleSaveDraft = async () => {
    if (!canCreateBlueprints) return;

    setIsSavingDraft(true);
    setSubmitError(null);

    try {
      const payload = {
        title: expeditionData.title || 'Untitled Blueprint',
        description: expeditionData.description,
        visibility: (expeditionData.visibility === 'off-grid' ? 'off-grid' : 'public') as 'public' | 'off-grid',
        status: 'draft' as const,
        isRoundTrip,
        region: expeditionData.regions.length > 0 ? expeditionData.regions.join(', ') : undefined,
        locationName: locationName || undefined,
        countryCode: countryCode || undefined,
        countryName: countryName || undefined,
        stateProvince: stateProvince || undefined,
        routeMode: (() => { const u = new Set(perLegModes); if (u.size > 1) return 'mixed'; const m = perLegModes[0] || routeMode; return !isStraightLike(m) ? m : (m === 'passage' ? 'passage' : null); })(),
        routeGeometry: perLegModes.some(m => !isStraightLike(m)) && directionsGeometry ? directionsGeometry : null,
        routeLegModes: new Set(perLegModes).size > 1 ? perLegModes : undefined,
        routeDistanceKm: totalDistance > 0 ? Math.round(totalDistance * 10) / 10 : undefined,
        routeObstacles: waterwayObstacles.length > 0 ? waterwayObstacles : null,
        routeExportAllowed,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        isBlueprint: true,
        mode: expeditionMode || undefined,
        vesselName: vesselName || undefined,
        vesselType: vesselType || undefined,
        vesselLengthM: vesselLengthM ? parseFloat(vesselLengthM) : undefined,
        vesselDraftM: vesselDraftM ? parseFloat(vesselDraftM) : undefined,
        vesselCrewSize: vesselCrewSize ? parseInt(vesselCrewSize) : undefined,
        estimatedDurationH: estimatedDurationH ? Number(estimatedDurationH) : undefined,
      };

      const orderedWaypoints = routeItems
        .filter(item => item.kind === 'waypoint' || (item.kind === 'entry' && item.entry.coords?.lat != null))
        .map((item, i) => {
          if (item.kind === 'waypoint') {
            return {
              lat: item.waypoint.coordinates.lat,
              lon: item.waypoint.coordinates.lng,
              elevationM: item.waypoint.elevationM,
              title: item.waypoint.name || undefined,
              date: item.waypoint.date || undefined,
              description: item.waypoint.description || undefined,
              sequence: i,
              entryIds: item.waypoint.entryIds?.length > 0 ? item.waypoint.entryIds : undefined,
            };
          }
          return {
            lat: item.entry.coords.lat,
            lon: item.entry.coords.lng,
            title: item.entry.title || undefined,
            date: item.entry.date || undefined,
            sequence: i,
            entryId: item.entry.id,
          };
        });

      let savedId: string;

      if (isEditMode && expeditionId) {
        // Editing an existing blueprint
        await expeditionApi.update(expeditionId, payload);
        savedId = expeditionId;
        await expeditionApi.syncWaypoints(expeditionId, orderedWaypoints);
      } else if (draftId) {
        // Updating existing draft
        await expeditionApi.update(draftId, payload);
        savedId = draftId;
        await expeditionApi.syncWaypoints(draftId, orderedWaypoints);
      } else {
        // Creating new draft
        const result = await expeditionApi.create(payload);
        savedId = (result as any).expeditionId || (result as any).id;
        setDraftId(savedId);
        if (orderedWaypoints.length > 0) {
          await expeditionApi.syncWaypoints(savedId, orderedWaypoints);
        }
      }

      lastSavedContentRef.current = getContentSignature();
      setLastSaved(new Date());
      toast.success('Blueprint saved as draft');
    } catch (err: any) {
      const msg = err.message || 'Failed to save draft';
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Auto-compute status based on dates.
  // Completed/cancelled are explicit actions — never inferred from dates.
  const computeStatus = () => {
    if (serverStatus === 'completed') return 'completed';
    if (serverStatus === 'cancelled') return 'cancelled';

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (!expeditionData.startDate) return 'planned';

    if (expeditionData.startDate <= today) {
      return 'active';
    }

    return 'planned';
  };

  const status = computeStatus();
  const isCompletedExpedition = status === 'completed';

  // Disable sponsorships when status changes to completed
  useEffect(() => {
    if (status === 'completed') {
      setSponsorshipsEnabled(false);
    }
  }, [status]);

  const { handleStartDateChange, handleEndDateChange, handleDurationChange } =
    useBuilderDateHandlers(expeditionData, setExpeditionData, expectedDuration, setExpectedDuration);


  // Build a content signature string for change detection
  const getContentSignature = useCallback(() => {
    const wpSig = waypoints.map(w => `${w.coordinates.lat},${w.coordinates.lng},${w.name},${w.sequence}`).join('|');
    return JSON.stringify({
      ...expeditionData,
      coverPhotoUrl,
      sponsorshipsEnabled,
      sponsorshipGoal,
      notesAccessThreshold,
      notesVisibility,
      earlyAccessEnabled,
      isRoundTrip,
      routeMode,
      tags,
      wpSig,
      estimatedDurationH,
      routeOrderSig: routeOrder.join(','),
    });
  }, [expeditionData, coverPhotoUrl, sponsorshipsEnabled, sponsorshipGoal, notesAccessThreshold, notesVisibility, earlyAccessEnabled, isRoundTrip, routeMode, tags, waypoints, routeOrder, estimatedDurationH]);

  // Keep getContentSignature accessible via ref so async callbacks get latest version
  const getContentSignatureRef = useRef(getContentSignature);
  useEffect(() => {
    getContentSignatureRef.current = getContentSignature;
  }, [getContentSignature]);

  // Keep refs in sync with state
  useEffect(() => {
    waypointsRef.current = waypoints;
    routeOrderRef.current = routeOrder;
    expeditionEntriesRef.current = expeditionEntries;
    isRoundTripRef.current = isRoundTrip;
    waterwayProfileRef.current = waterwayProfile;
    directionsGeometryRef.current = directionsGeometry;
  }, [waypoints, routeOrder, expeditionEntries, isRoundTrip, waterwayProfile, directionsGeometry]);

  // Update distances when waypoints change
  const updateDistances = useCallback((points: Waypoint[]): Waypoint[] => {
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
        cumulativeDistance: cumulative
      };
    });
  }, []);

  /**
   * Guide-only: apply a parsed route file (GPX/KML/GeoJSON) to the builder.
   * Replaces the current waypoints + direction geometry, then sends the raw
   * file to the server for authoritative persistence if a draft/expedition
   * already exists. If there's no saved draft yet, the guide is prompted to
   * save the draft first — route_geometry needs a target expedition row.
   */
  const handleRouteImport = useCallback(
    async (route: ImportedRoute, file: File) => {
      // Convert parsed waypoints into the builder's Waypoint shape
      const imported: Waypoint[] = route.waypoints.map((w, i) => ({
        id: `waypoint-${crypto.randomUUID()}`,
        sequence: i,
        name: w.title || `Waypoint ${i + 1}`,
        type: i === 0 ? 'start' : i === route.waypoints.length - 1 ? 'end' : 'standard',
        coordinates: { lat: w.lat, lng: w.lon },
        location: '',
        date: '',
        description: w.description || '',
        entryIds: [],
      }));

      // Apply waypoints + order. Mark routeOrderInitializedRef so the downstream
      // routeOrder-sync effect doesn't clobber the order we just set.
      routeOrderInitializedRef.current = true;
      setWaypoints(updateDistances(imported));
      setRouteOrder(imported.map((w) => w.id));
      setSelectedWaypoint(null);
      setIsRoundTrip(false);

      const hasTrackline = route.trackPoints.length >= 2 && imported.length >= 2;

      if (hasTrackline) {
        // Mark every leg as 'imported' — a pseudo-mode that signals "this
        // geometry came from a file; don't touch it". The fetch effects and
        // per-leg fetchers both early-return for 'imported', so the stored
        // trackline is drawn verbatim and never clobbered by a routing API.
        const importedMode: RouteMode = 'imported';
        const legCount = imported.length - 1;
        const legModes: RouteMode[] = Array(legCount).fill(importedMode);

        // Use the imported trackline directly as directionsGeometry, then split
        // it at the waypoint positions so each leg has its own geometry segment.
        const trackCoords = route.trackPoints.map(
          (p) => [p[0], p[1]] as [number, number],
        );
        const wpLngLats = imported.map(
          (w) => [w.coordinates.lng, w.coordinates.lat] as [number, number],
        );
        const legGeoms = splitGeometryAtWaypoints(trackCoords, wpLngLats);

        // Compute per-leg distances from the split segments so the sidebar
        // shows the real trail distance, not straight-line between waypoints.
        const legDists = legGeoms.map((coords) => {
          let d = 0;
          for (let j = 1; j < coords.length; j++) {
            d += haversineFromLatLng(
              { lat: coords[j - 1][1], lng: coords[j - 1][0] },
              { lat: coords[j][1], lng: coords[j][0] },
            );
          }
          return d;
        });

        setRouteMode(importedMode);
        setPerLegModesAndRef(legModes);
        setPerLegGeomsAndRef(legGeoms);
        setDirectionsGeometry(trackCoords);
        directionsGeometryRef.current = trackCoords;
        setDirectionsLegDistances(legDists);
        setDirectionsLegDurations(null);
        setDirectionsError(null);
        setDirectionsWarnings([]);

        // Pre-populate the fingerprint so the debounced directions-fetch
        // effect's early-return fires and we DON'T overwrite the imported
        // trackline with a fresh Mapbox Directions API result.
        // Must match the format the effect computes at line ~2605.
        lastDirectionsCoordsRef.current =
          imported.map((w) => `${w.coordinates.lat},${w.coordinates.lng}`).join('|') +
          `::${legModes.join(',')}::false::${waterwayProfileRef.current}`;
      } else {
        // No trackline — fall back to straight-line segments between waypoints.
        setRouteMode('straight');
        setPerLegModesAndRef([]);
        setPerLegGeomsAndRef([]);
        setDirectionsGeometry(null);
        directionsGeometryRef.current = null;
      }

      toast.success(
        `Imported ${route.waypoints.length} waypoint${route.waypoints.length === 1 ? '' : 's'} from ${route.sourceFormat.toUpperCase()}${
          hasTrackline ? ` (${route.distanceKm.toFixed(1)} km trackline)` : ''
        }`,
      );

      // Persist authoritatively. If we already have a draft/expedition row, use
      // it. Otherwise auto-create a minimal draft so the trackline persists
      // without forcing the guide to manually save-then-reimport.
      let savedId = expeditionId || draftId;
      if (!savedId) {
        try {
          // Derive a title: prefer what the user has typed, fall back to the
          // route file's filename, then a generic placeholder.
          const fileBase = (file.name || '')
            .replace(/\.(gpx|kml|geojson|json)$/i, '')
            .trim();
          const draftTitle =
            expeditionData.title.trim() ||
            fileBase ||
            'Untitled Imported Blueprint';

          const createResult = await expeditionApi.create({
            title: draftTitle,
            description: expeditionData.description || undefined,
            visibility:
              expeditionData.visibility === 'off-grid' ? 'off-grid' : 'public',
            status: 'draft',
            isRoundTrip: false,
            region: expeditionData.regions.length
              ? expeditionData.regions.join(', ')
              : undefined,
            isBlueprint: canCreateBlueprints ? true : undefined,
            mode: expeditionMode || undefined,
          } as any);
          const newId = (createResult as any).expeditionId || (createResult as any).id;
          if (newId) {
            setDraftId(newId);
            savedId = newId;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Draft creation failed';
          toast.error(`Could not save draft for import: ${msg}`);
        }
      }

      if (savedId) {
        try {
          await expeditionApi.importRoute(savedId, file);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Import failed';
          toast.error(`Server import failed: ${msg}`);
        }
      } else {
        // Fallback — couldn't create a draft. Stash the file so a subsequent
        // save can still pick it up.
        setRouteImportPending({ file, distanceKm: route.distanceKm });
      }
    },
    [
      canCreateBlueprints,
      draftId,
      expeditionData.description,
      expeditionData.regions,
      expeditionData.title,
      expeditionData.visibility,
      expeditionId,
      expeditionMode,
      setPerLegModesAndRef,
      setPerLegGeomsAndRef,
      updateDistances,
    ],
  );

  // Download the current expedition's route as a GPX file. Only works once the
  // expedition has been saved on the server (either in edit mode or after the
  // first autosave has created a draftId), since the export reads from the DB.
  const [isExportingGpx, setIsExportingGpx] = useState(false);
  const handleExportGpx = useCallback(async () => {
    const savedId = expeditionId || draftId;
    if (!savedId) {
      toast.info('Save this expedition first, then export the route.');
      return;
    }
    setIsExportingGpx(true);
    try {
      await expeditionApi.exportRouteGpx(savedId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(msg);
    } finally {
      setIsExportingGpx(false);
    }
  }, [expeditionId, draftId]);

  // Validate and format a coordinate for the Mapbox API
  const formatCoord = (lng: number, lat: number): string => {
    const lngNum = Number(lng);
    const latNum = Number(lat);
    if (!isFinite(lngNum) || !isFinite(latNum)) {
      throw new Error('Invalid coordinates detected');
    }
    if (lngNum < -180 || lngNum > 180 || latNum < -90 || latNum > 90) {
      throw new Error('Coordinates out of range');
    }
    return `${lngNum.toFixed(6)},${latNum.toFixed(6)}`;
  };

  // Format seconds into human-readable travel time
  const formatTravelTime = (seconds: number): string => {
    if (seconds < 60) return '< 1 min';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Build a descriptive error from a Mapbox Directions API response
  const describeDirectionsError = (data: any, points: Array<{ name?: string }>, profile: string): string => {
    const modeName = profile === 'walking' ? 'walking/hiking' : profile;

    // Identify waypoints that couldn't be snapped to the road/trail network
    if (data.code === 'NoSegment' || data.code === 'NoRoute') {
      const badWaypoints: string[] = [];
      if (data.waypoints) {
        data.waypoints.forEach((wp: any, i: number) => {
          // null waypoint = completely unsnappable (e.g., in water)
          // large distance = far from any road/trail
          if (wp === null || (wp.distance && wp.distance > 1000)) {
            const idx = i < points.length ? i : points.length - 1;
            badWaypoints.push(points[idx]?.name || `Stop ${idx + 1}`);
          }
        });
      }

      if (badWaypoints.length > 0) {
        return `No ${modeName} route found — ${badWaypoints.join(', ')} ${badWaypoints.length === 1 ? 'is' : 'are'} not reachable (may be in water or far from any ${modeName} path)`;
      }

      if (data.code === 'NoSegment') {
        return `One or more waypoints could not be matched to a ${modeName} path — they may be in water, on private land, or in an area without ${modeName} infrastructure`;
      }

      return `No ${modeName} route exists between these waypoints — they may be separated by water, borders, or terrain without ${modeName} access`;
    }

    return data.message || `No ${modeName} route found between waypoints`;
  };

  // Fetch a single leg route between two points with a given mode
  const fetchSingleLegRoute = async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    mode: RouteMode,
    signal?: AbortSignal,
  ): Promise<{ coords: [number, number][]; distance: number; duration: number; obstacles?: RouteObstacle[] }> => {
    if (isStraightLike(mode)) {
      const dist = haversineFromLatLng(from, to);
      return { coords: [[from.lng, from.lat], [to.lng, to.lat]], distance: dist, duration: 0 };
    }
    if (isImported(mode)) {
      // `imported` legs must NEVER be refetched — the geometry came from a
      // user-uploaded file and there is no API to reconstruct it. Callers
      // should have short-circuited before reaching here; if one slips
      // through (e.g. cache miss path), fall back to a straight line so the
      // app keeps rendering rather than crashing.
      const dist = haversineFromLatLng(from, to);
      return { coords: [[from.lng, from.lat], [to.lng, to.lat]], distance: dist, duration: 0 };
    }
    if (mode === 'trail') {
      const result = await routingApi.trail([{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }], { signal });
      return { coords: result.coordinates, distance: result.totalDistance, duration: result.totalDuration };
    }
    if (mode === 'waterway') {
      const profile = waterwayProfileRef.current === 'paddle' ? 'canoe' as const : 'motorboat' as const;
      const result = await routingApi.waterwayStream(
        [{ lat: from.lat, lon: from.lng }, { lat: to.lat, lon: to.lng }],
        profile,
        (evt) => {
          const pct = evt.total > 0 ? ` (${evt.current}/${evt.total})` : '';
          setDirectionsProgress(`${evt.step}${pct}`);
        },
        { signal },
      );
      setDirectionsProgress(null);
      return { coords: result.coordinates, distance: result.totalDistance, duration: result.totalDuration, obstacles: result.obstacles };
    }
    // Mapbox Directions (walking, cycling, driving)
    const coordString = `${formatCoord(from.lng, from.lat)};${formatCoord(to.lng, to.lat)}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${coordString}?geometries=geojson&overview=full&radiuses=200;200&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url, { signal });
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      throw new Error(`No ${mode} route found for this leg`);
    }
    return {
      coords: data.routes[0].geometry.coordinates,
      distance: (data.routes[0].legs[0]?.distance ?? 0) / 1000,
      duration: data.routes[0].legs[0]?.duration ?? 0,
    };
  };

  // Build a cache key for a single leg (endpoints + mode)
  const legCacheKey = (from: { lat: number; lng: number }, to: { lat: number; lng: number }, mode: string) =>
    `${from.lat},${from.lng}|${to.lat},${to.lng}|${mode}`;

  // Fetch legs incrementally — reuse cached results for unchanged legs
  const fetchMixedRoute = async (
    points: Array<{ coordinates: { lat: number; lng: number }; name?: string }>,
    inputModes: RouteMode[],
  ) => {
    if (points.length < 2) return;
    if (directionsAbortRef.current) directionsAbortRef.current.abort();
    const abortController = new AbortController();
    directionsAbortRef.current = abortController;
    const hasSlowLeg = inputModes.some(m => m === 'waterway' || m === 'trail');
    const timeoutId = setTimeout(() => abortController.abort(), hasSlowLeg ? 90000 : 30000);

    // Work on a copy to avoid mutating the caller's array/ref
    const modes = [...inputModes];
    const roundTrip = isRoundTripRef.current;

    setDirectionsError(null);

    try {
      const cache = legCacheRef.current;
      const existingLegGeoms = perLegGeomsRef.current;
      const legResults: { coords: number[][]; distance: number; duration: number; obstacles?: RouteObstacle[] }[] = [];
      const warnings: string[] = [];
      let fetchedAny = false;

      for (let i = 0; i < modes.length; i++) {
        if (abortController.signal.aborted) return;
        const from = points[i].coordinates;
        const toIdx = roundTrip && i === points.length - 1 ? 0 : i + 1;
        const to = points[toIdx].coordinates;
        const key = legCacheKey(from, to, modes[i]);

        // Reuse cached result if endpoints + mode haven't changed
        if (cache[i] && cache[i].key === key) {
          legResults.push(cache[i]);
        } else if (isImported(modes[i])) {
          // Imported legs use whatever stored geometry came from the file —
          // never fetched, never regenerated. Pull from the live per-leg
          // geoms ref so we survive round-trips through this function.
          const storedCoords = existingLegGeoms[i];
          if (storedCoords && storedCoords.length >= 2) {
            // Re-derive distance from the stored coords so it matches the
            // actual trail shape (not straight-line between endpoints).
            let dist = 0;
            for (let j = 1; j < storedCoords.length; j++) {
              dist += haversineFromLatLng(
                { lat: storedCoords[j - 1][1], lng: storedCoords[j - 1][0] },
                { lat: storedCoords[j][1], lng: storedCoords[j][0] },
              );
            }
            legResults.push({ coords: storedCoords, distance: dist, duration: 0 });
          } else {
            // Defensive fallback — if someone marked a leg imported without
            // ever populating its geometry, draw a straight line rather than
            // crash. This should not happen in normal flow.
            const dist = haversineFromLatLng(from, to);
            legResults.push({ coords: [[from.lng, from.lat], [to.lng, to.lat]], distance: dist, duration: 0 });
          }
        } else if (isStraightLike(modes[i])) {
          legResults.push(await fetchSingleLegRoute(from, to, 'straight'));
        } else {
          if (!fetchedAny) { fetchedAny = true; setDirectionsLoading(true); }
          try {
            legResults.push(await fetchSingleLegRoute(from, to, modes[i], abortController.signal));
          } catch (legErr: any) {
            if (legErr.name === 'AbortError') throw legErr; // propagate abort
            // Fall back to straight line for this leg, keep the rest intact
            warnings.push(`Leg ${i + 1} (${modes[i]}): ${legErr.message} — using straight line`);
            const dist = haversineFromLatLng(from, to);
            legResults.push({ coords: [[from.lng, from.lat], [to.lng, to.lat]], distance: dist, duration: 0 });
            // Update the mode to straight so the map renders correctly
            modes[i] = 'straight';
          }
        }
      }
      if (abortController.signal.aborted) return;

      // Persist any mode fallbacks
      setPerLegModesAndRef([...modes]);

      // Update fingerprint to prevent debounced effect from re-triggering after mode fallbacks
      const modeStr = modes.join(',');
      const wpStr = points.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|');
      lastDirectionsCoordsRef.current = `${wpStr}::${modeStr}::${roundTrip}::${waterwayProfileRef.current}`;

      // Update cache
      legCacheRef.current = legResults.map((r, i) => {
        const from = points[i].coordinates;
        const toIdx = roundTrip && i === points.length - 1 ? 0 : i + 1;
        const to = points[toIdx].coordinates;
        return { key: legCacheKey(from, to, modes[i]), ...r };
      });

      const allCoords = stitchLegCoords(legResults);

      setDirectionsGeometry(allCoords as [number, number][]);
      setDirectionsLegDistances(legResults.map(r => r.distance));
      setDirectionsLegDurations(legResults.map(r => r.duration));
      setPerLegGeomsAndRef(legResults.map(r => r.coords));
      setDirectionsWarnings(warnings);
      // Collect obstacles from all waterway legs
      const allObstacles = legResults.flatMap(r => r.obstacles ?? []);
      setWaterwayObstacles(allObstacles);
      setWaterwayFlowDirection(null);
      setWaterwayUpstreamFraction(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (directionsAbortRef.current === abortController) {
          setDirectionsError('Route calculation timed out');
          setDirectionsGeometry(null);
          setDirectionsLegDistances(null);
          setDirectionsLegDurations(null);
        }
        return;
      }
      setDirectionsError(err.message || 'Failed to fetch route');
      setDirectionsGeometry(null);
      setDirectionsLegDistances(null);
      setDirectionsLegDurations(null);
    } finally {
      clearTimeout(timeoutId);
      // Clear loading if this is still the active request (not superseded by a newer one)
      if (directionsAbortRef.current === abortController) { setDirectionsLoading(false); setDirectionsProgress(null); }
    }
  };

  // Handle changing a single leg's route mode via the map popup
  const handleLegModeChangeRef = useRef<(legIndex: number, newMode: RouteMode) => void>(() => {});
  handleLegModeChangeRef.current = async (legIndex: number, newMode: RouteMode) => {
    // Switching away from an 'imported' leg is destructive — the trackpoints
    // from the uploaded file get overwritten with a fresh directions fetch and
    // cannot be recovered without re-importing. Confirm before proceeding.
    const existingMode = perLegModesRef.current[legIndex];
    if (existingMode === 'imported' && newMode !== 'imported') {
      const ok = window.confirm(
        `Replace imported trackpoints for leg ${legIndex + 1}?\n\n` +
          `The GPS track you uploaded for this leg will be replaced with a ${newMode} route. ` +
          `To get the imported trackpoints back, you'll need to re-import the route file.`,
      );
      if (!ok) return;
    }

    // Abort any previous per-leg fetch
    if (legModeAbortRef.current) legModeAbortRef.current.abort();
    const abortController = new AbortController();
    legModeAbortRef.current = abortController;

    const wp = waypointsRef.current;
    const roundTrip = isRoundTripRef.current;
    const numLegs = roundTrip ? wp.length : wp.length - 1;

    // Initialize per-leg modes array if needed
    const modes: RouteMode[] = perLegModesRef.current.length > 0
      ? [...perLegModesRef.current]
      : Array(numLegs).fill(routeMode);
    modes[legIndex] = newMode;
    setPerLegModesAndRef(modes);

    const from = wp[legIndex].coordinates;
    const toIdx = roundTrip && legIndex === wp.length - 1 ? 0 : legIndex + 1;
    const to = wp[toIdx].coordinates;

    try {
      setDirectionsLoading(true);
      const result = await fetchSingleLegRoute(from, to, newMode, abortController.signal);
      if (abortController.signal.aborted) return;

      // Get or compute current per-leg geometries
      const currentDirGeom = directionsGeometryRef.current;
      const currentGeoms = perLegGeomsRef.current.length === numLegs
        ? [...perLegGeomsRef.current]
        : currentDirGeom
          ? splitGeometryAtWaypoints(currentDirGeom, wp.map(w => [w.coordinates.lng, w.coordinates.lat] as [number, number]))
          : wp.slice(0, numLegs).map((w, i) => {
              const next = wp[roundTrip && i === wp.length - 1 ? 0 : i + 1];
              return [[w.coordinates.lng, w.coordinates.lat], [next.coordinates.lng, next.coordinates.lat]];
            });

      currentGeoms[legIndex] = result.coords;
      setPerLegGeomsAndRef(currentGeoms);

      // Rebuild full geometry
      const allCoords = stitchLegCoords(currentGeoms.map(c => ({ coords: c })));
      setDirectionsGeometry(allCoords as [number, number][]);

      // Update leg distances and durations
      setDirectionsLegDistances(prev => {
        const updated = prev ? [...prev] : Array(numLegs).fill(0);
        updated[legIndex] = result.distance;
        return updated;
      });
      setDirectionsLegDurations(prev => {
        const updated = prev ? [...prev] : Array(numLegs).fill(0);
        updated[legIndex] = result.duration;
        return updated;
      });

      // Update leg cache for the changed leg
      const cache = [...legCacheRef.current];
      while (cache.length < numLegs) cache.push({ key: '', coords: [], distance: 0, duration: 0 });
      cache[legIndex] = { key: legCacheKey(from, to, newMode), coords: result.coords, distance: result.distance, duration: result.duration, obstacles: result.obstacles };
      legCacheRef.current = cache;

      // Rebuild obstacles from all cached waterway legs (avoids stale accumulation)
      const updatedCache = [...legCacheRef.current];
      while (updatedCache.length < numLegs) updatedCache.push({ key: '', coords: [], distance: 0, duration: 0 });
      updatedCache[legIndex] = { key: legCacheKey(from, to, newMode), coords: result.coords, distance: result.distance, duration: result.duration, obstacles: result.obstacles };
      const allObs = updatedCache.flatMap(c => c.obstacles ?? []);
      const seen = new Set<string>();
      setWaterwayObstacles(allObs.filter(o => {
        const k = `${o.lat},${o.lon}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }));

      // Update fingerprint to prevent the debounced effect from re-fetching
      const modeStr = modes.join(',');
      const wpStr = wp.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|');
      lastDirectionsCoordsRef.current = `${wpStr}::${modeStr}::${roundTrip}::${waterwayProfileRef.current}`;
    } catch (err: any) {
      // Revert to straight line on failure — update geometry to match
      modes[legIndex] = 'straight';
      setPerLegModesAndRef(modes);

      // Replace the failed leg's geometry with a straight line
      const currentGeoms = perLegGeomsRef.current.length > 0 ? [...perLegGeomsRef.current] : [];
      if (currentGeoms.length > legIndex) {
        currentGeoms[legIndex] = [[from.lng, from.lat], [to.lng, to.lat]];
        setPerLegGeomsAndRef(currentGeoms);
        const allCoords = stitchLegCoords(currentGeoms.map(c => ({ coords: c })));
        setDirectionsGeometry(allCoords as [number, number][]);
      }

      setDirectionsWarnings(prev => [...prev, `Leg ${legIndex + 1} (${newMode}): ${err.message} — using straight line`]);
    } finally {
      setDirectionsLoading(false); setDirectionsProgress(null);
    }

  };

  // Fetch route from Mapbox Directions API
  // waypointIndices: when entries are interleaved, tracks which indices are actual waypoints for leg aggregation
  const fetchDirectionsRoute = async (
    points: Array<{ coordinates: { lat: number; lng: number }; name?: string }>,
    profile: string,
    waypointIndices?: number[]
  ) => {
    if (points.length < 2) return;

    // Abort any in-flight request
    if (directionsAbortRef.current) {
      directionsAbortRef.current.abort();
    }
    const abortController = new AbortController();
    directionsAbortRef.current = abortController;

    // Read from refs to avoid stale closures
    const roundTrip = isRoundTripRef.current;
    const wpProfile = waterwayProfileRef.current;

    // Auto-timeout — waterway/trail routes need longer because the backend
    // fetches OSM tiles sequentially on first request (cold cache)
    const timeoutMs = (profile === 'waterway' || profile === 'trail') ? 60000 : 15000;
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    setDirectionsLoading(true);
    setDirectionsError(null);

    try {
      // Custom routing — trail (Valhalla) or waterway (OSM graph)
      if (profile === 'trail' || profile === 'waterway') {
        const locations = points.map(w => ({ lat: w.coordinates.lat, lon: w.coordinates.lng }));
        if (roundTrip && locations.length > 1) {
          locations.push({ ...locations[0] });
        }
        const result = profile === 'trail'
          ? await routingApi.trail(locations, { signal: abortController.signal })
          : await routingApi.waterwayStream(
              locations,
              wpProfile === 'paddle' ? 'canoe' : 'motorboat',
              (evt) => {
                const pct = evt.total > 0 ? ` (${evt.current}/${evt.total})` : '';
                setDirectionsProgress(`${evt.step}${pct}`);
              },
              { signal: abortController.signal },
            );

        if (!abortController.signal.aborted) {
          setDirectionsGeometry(result.coordinates);

          let legDistances = result.legDistances;
          let legDurations = result.legDurations;

          if (waypointIndices && waypointIndices.length >= 2) {
            const agg = aggregateLegs(legDistances, legDurations, waypointIndices);
            legDistances = agg.distances;
            legDurations = agg.durations;
          }

          setDirectionsLegDistances(legDistances);
          setDirectionsLegDurations(legDurations);

          // Store waterway flow direction and obstacle data
          if (profile === 'waterway') {
            setWaterwayFlowDirection(result.flowDirection ?? null);
            setWaterwayUpstreamFraction(result.upstreamFraction ?? null);
            setWaterwayObstacles(result.obstacles ?? []);
          } else {
            setWaterwayFlowDirection(null);
            setWaterwayUpstreamFraction(null);
            setWaterwayObstacles([]);
          }

          // Check snap distances
          const snapLabel = profile === 'trail' ? 'trail' : 'waterway';
          const SNAP_THRESHOLD_M = profile === 'waterway' ? 2000 : 1000;
          setDirectionsWarnings(buildSnapWarnings(result.snapDistances, points, waypointIndices, SNAP_THRESHOLD_M, snapLabel, roundTrip, formatDistance));
        }

        return; // Custom routing handled — skip Mapbox flow below
      }

      // Build coordinate pairs, appending start if round trip
      const coords = points.map(w => [w.coordinates.lng, w.coordinates.lat] as [number, number]);
      if (roundTrip && coords.length > 1) {
        coords.push(coords[0]);
      }

      // Mapbox Directions API allows max 25 waypoints per request
      const MAX_WAYPOINTS = 25;
      let allCoordinates: [number, number][] = [];
      let allLegDistances: number[] = [];
      let allLegDurations: number[] = []; // seconds per leg
      // Collect snap distances (meters) for each input waypoint
      const snapDistances: number[] = [];
      // Threshold: waypoints snapped more than 200m from input are flagged
      const SNAP_THRESHOLD_M = 200;

      if (coords.length <= MAX_WAYPOINTS) {
        const coordString = coords.map(c => formatCoord(c[0], c[1])).join(';');
        const radiuses = coords.map(() => '200').join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordString}?geometries=geojson&overview=full&radiuses=${radiuses}&access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(url, { signal: abortController.signal });
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes?.[0]) {
          throw new Error(describeDirectionsError(data, points, profile));
        }

        allCoordinates = data.routes[0].geometry.coordinates;
        allLegDistances = data.routes[0].legs.map((leg: any) => leg.distance / 1000); // meters → km
        allLegDurations = data.routes[0].legs.map((leg: any) => leg.duration); // seconds

        // Collect snap distances from response waypoints
        if (data.waypoints) {
          data.waypoints.forEach((wp: any) => snapDistances.push(wp.distance ?? 0));
        }
      } else {
        // Split into chunks of MAX_WAYPOINTS with overlap at boundaries
        for (let i = 0; i < coords.length - 1; i += MAX_WAYPOINTS - 1) {
          const chunk = coords.slice(i, Math.min(i + MAX_WAYPOINTS, coords.length));
          if (chunk.length < 2) break;

          const coordString = chunk.map(c => formatCoord(c[0], c[1])).join(';');
          const radiuses = chunk.map(() => '200').join(';');
          const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordString}?geometries=geojson&overview=full&radiuses=${radiuses}&access_token=${MAPBOX_TOKEN}`;
          const response = await fetch(url, { signal: abortController.signal });
          const data = await response.json();

          if (data.code !== 'Ok' || !data.routes?.[0]) {
            // Map chunk indices back to original waypoint indices
            const chunkPoints = points.slice(i, Math.min(i + MAX_WAYPOINTS, points.length));
            throw new Error(describeDirectionsError(data, chunkPoints, profile));
          }

          const chunkCoords: [number, number][] = data.routes[0].geometry.coordinates;
          const chunkLegs: number[] = data.routes[0].legs.map((leg: any) => leg.distance / 1000);
          const chunkDurations: number[] = data.routes[0].legs.map((leg: any) => leg.duration);

          // Avoid duplicating the joining coordinate
          if (allCoordinates.length > 0) {
            allCoordinates = allCoordinates.concat(chunkCoords.slice(1));
          } else {
            allCoordinates = chunkCoords;
          }
          allLegDistances = allLegDistances.concat(chunkLegs);
          allLegDurations = allLegDurations.concat(chunkDurations);

          // Collect snap distances, skip overlap waypoint for subsequent chunks
          if (data.waypoints) {
            const chunkSnaps = data.waypoints.map((wp: any) => wp.distance ?? 0);
            if (snapDistances.length > 0) {
              snapDistances.push(...chunkSnaps.slice(1));
            } else {
              snapDistances.push(...chunkSnaps);
            }
          }
        }
      }

      // Only apply results if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setDirectionsGeometry(allCoordinates);

        if (waypointIndices && waypointIndices.length >= 2) {
          const agg = aggregateLegs(allLegDistances, allLegDurations, waypointIndices);
          allLegDistances = agg.distances;
          allLegDurations = agg.durations;
        }

        setDirectionsLegDistances(allLegDistances);
        setDirectionsLegDurations(allLegDurations);

        setDirectionsWarnings(buildSnapWarnings(snapDistances, points, waypointIndices, SNAP_THRESHOLD_M, `${profile} route`, roundTrip, formatDistance));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Check if this was a timeout vs a newer request replacing us
        if (directionsAbortRef.current === abortController) {
          // This was a timeout — show error and stop loading
          setDirectionsError('Route calculation timed out — try fewer waypoints or a different mode');
          setDirectionsGeometry(null);
          setDirectionsLegDistances(null);
          setDirectionsLegDurations(null);
          setDirectionsWarnings([]);
          setDirectionsLoading(false); setDirectionsProgress(null);
          setWaterwayFlowDirection(null);
          setWaterwayUpstreamFraction(null);
          // Reset leg modes to straight so map doesn't render failed route with old styling
          const numLegs = roundTrip ? points.length : points.length - 1;
          const straightModes = Array(numLegs).fill('straight' as RouteMode);
          setPerLegModesAndRef(straightModes);
          // Update fingerprint so debounced effect doesn't re-trigger and clear the error
          const wpStr = points.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|');
          lastDirectionsCoordsRef.current = `${wpStr}::${straightModes.join(',')}::${roundTrip}::${waterwayProfileRef.current}`;
        }
        return;
      }
      setDirectionsError(err.message || 'Failed to fetch route');
      setDirectionsGeometry(null);
      setDirectionsLegDistances(null);
      setDirectionsLegDurations(null);
      setDirectionsWarnings([]);
      setWaterwayFlowDirection(null);
      setWaterwayUpstreamFraction(null);
      // Reset leg modes to straight so map doesn't render failed route with old styling
      const numLegs = roundTrip ? points.length : points.length - 1;
      const straightModes = Array(numLegs).fill('straight' as RouteMode);
      setPerLegModesAndRef(straightModes);
      // Update fingerprint so debounced effect doesn't re-trigger and clear the error
      const wpStr = points.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|');
      lastDirectionsCoordsRef.current = `${wpStr}::${straightModes.join(',')}::${roundTrip}::${waterwayProfileRef.current}`;
    } finally {
      clearTimeout(timeoutId);
      if (directionsAbortRef.current === abortController) {
        setDirectionsLoading(false); setDirectionsProgress(null);
      }
    }
  };

  // Apply real directions distances and travel times over Haversine estimates
  const applyDirectionsDistances = useCallback((legDistances: number[], legDurations?: number[]) => {
    setWaypoints(prev => {
      let cumDist = 0;
      let cumTime = 0;
      return prev.map((point, index) => {
        if (index === 0) {
          return { ...point, distanceFromPrevious: 0, cumulativeDistance: 0, travelTimeFromPrevious: 0, cumulativeTravelTime: 0 };
        }
        const dist = legDistances[index - 1] ?? point.distanceFromPrevious ?? 0;
        const time = legDurations?.[index - 1] ?? 0;
        cumDist += dist;
        cumTime += time;
        return { ...point, distanceFromPrevious: dist, cumulativeDistance: cumDist, travelTimeFromPrevious: time, cumulativeTravelTime: cumTime };
      });
    });
  }, []);

  // Reset map view to show all waypoints
  const handleResetMapView = () => {
    if (waypoints.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      waypoints.forEach(waypoint => {
        bounds.extend([waypoint.coordinates.lng, waypoint.coordinates.lat]);
      });
      
      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 14,
        duration: 1000
      });
    }
  };

  // Load existing expedition data in edit mode
  useEffect(() => {
    if (!isEditMode || !expeditionId) {
      setIsLoading(false);
      return;
    }

    const loadExpedition = async () => {
      try {
        const expedition = await expeditionApi.getById(expeditionId);

        if (!expedition.isOwner) {
          router.push(`/expedition/${expeditionId}`);
          return;
        }

        // Adopted (blueprint-derived) expeditions are route-locked — the
        // server rejects waypoint and route edits, and the quick-entry flow
        // is the supported editor for them. Redirect anyone who lands here
        // via a stale link or direct URL.
        if (expedition.isRouteLocked) {
          router.push(`/expedition-quick-entry/${expeditionId}`);
          return;
        }

        // Lock the form mode to whatever the loaded expedition is so a guide
        // editing their own standard expedition doesn't get blueprint-only UI.
        setLoadedIsBlueprint((expedition as any).isBlueprint === true);

        setServerStatus(expedition.status || null);
        if (expedition.originalStartDate) {
          setOriginalStartDate(toDateString(expedition.originalStartDate));
        }
        setExpeditionData({
          title: expedition.title || '',
          regions: expedition.region ? expedition.region.split(', ').map((r: string) => r.trim()).filter(Boolean) : [],
          description: expedition.description || '',
          category: expedition.category || '',
          startDate: toDateString(expedition.startDate),
          endDate: toDateString(expedition.endDate),
          visibility: expedition.visibility || (expedition.public !== false ? 'public' : 'private')
        });

        // Load location fields — mark as auto-filled so waypoint drags
        // will re-geocode. Only typing in the field sets locationManuallyEdited.
        // Seed lastGeocodedCoords so we don't re-geocode on initial mount.
        if (expedition.locationName) {
          setLocationName(expedition.locationName);
          setLocationAutoFilled(true);
          if (expedition.waypoints?.[0]) {
            const wp0 = expedition.waypoints[0] as any;
            if (wp0.lat && wp0.lon) {
              lastGeocodedCoords.current = `${wp0.lat.toFixed(4)},${wp0.lon.toFixed(4)}`;
            }
          }
        }
        if (expedition.countryCode) setCountryCode(expedition.countryCode);
        if (expedition.countryName) setCountryName(expedition.countryName);
        if (expedition.stateProvince) setStateProvince(expedition.stateProvince);

        // Load tags
        if (expedition.tags?.length) {
          setTags(expedition.tags.join(', '));
        }

        // Load estimated duration
        if (expedition.estimatedDurationH) {
          setEstimatedDurationH(String(expedition.estimatedDurationH));
          setDurationAutoFilled(true);
        }

        // Load mode
        if (expedition.mode) {
          setExpeditionMode(expedition.mode);
        }

        // Load vessel profile
        if (expedition.vesselName) setVesselName(expedition.vesselName);
        if (expedition.vesselType) setVesselType(expedition.vesselType);
        if (expedition.vesselLengthM != null) setVesselLengthM(String(expedition.vesselLengthM));
        if (expedition.vesselDraftM != null) setVesselDraftM(String(expedition.vesselDraftM));
        if (expedition.vesselCrewSize != null) setVesselCrewSize(String(expedition.vesselCrewSize));

        // Set cover photo from API (already full URL)
        if (expedition.coverImage) {
          setCoverPhotoPreview(expedition.coverImage);
          setCoverPhotoUrl(expedition.coverImage);
        }

        // Set sponsorship data
        if (expedition.goal && expedition.goal > 0) {
          setSponsorshipsEnabled(true);
          setSponsorshipGoal(expedition.goal);
        }
        if ((expedition as any).notesAccessThreshold > 0) {
          setNotesAccessThreshold((expedition as any).notesAccessThreshold);
        }
        if ((expedition as any).notesVisibility) {
          setNotesVisibility((expedition as any).notesVisibility);
        }
        if ((expedition as any).earlyAccessEnabled) {
          setEarlyAccessEnabled(true);
        }

        // Set round trip status
        if (expedition.isRoundTrip) {
          setIsRoundTrip(true);
        }

        // Restore route mode from saved expedition
        if (expedition.routeMode && !isStraightLike(expedition.routeMode)) {
          if (expedition.routeMode === 'mixed' && (expedition as any).routeLegModes) {
            // Mixed mode — restore per-leg modes and set the first non-straight mode as base
            const legModes = (expedition as any).routeLegModes as RouteMode[];
            setPerLegModesAndRef(legModes);
            const firstNonStraight = legModes.find(m => !isStraightLike(m)) || 'walking';
            setRouteMode(firstNonStraight);
          } else {
            setRouteMode(expedition.routeMode as RouteMode);
            // Pre-fill perLegModes so the init effect doesn't resize them,
            // which would change the fingerprint and trigger a re-fetch
            if (expedition.waypoints && expedition.waypoints.length > 1) {
              const numLegs = expedition.isRoundTrip
                ? expedition.waypoints.length
                : expedition.waypoints.length - 1;
              setPerLegModesAndRef(Array(numLegs).fill(expedition.routeMode) as RouteMode[]);
            }
          }
        }

        // Restore current location selection
        if (expedition.currentLocationSource) {
          setCurrentLocationSource(expedition.currentLocationSource);
        }
        if (expedition.currentLocationId) {
          setCurrentLocationId(expedition.currentLocationId);
        }

        // Calculate duration from dates if both are set
        if (expedition.startDate && expedition.endDate) {
          const start = new Date(expedition.startDate);
          const end = new Date(expedition.endDate);
          const diffTime = end.getTime() - start.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setExpectedDuration(diffDays.toString());
        }

        // Transform and load waypoints
        if (expedition.waypoints && expedition.waypoints.length > 0) {
          const transformedWaypoints: Waypoint[] = expedition.waypoints.map((wp: any, index) => ({
            id: String(wp.id),
            sequence: index,
            name: wp.title || `Waypoint ${index + 1}`,
            type: 'standard' as const,
            coordinates: { lat: wp.lat || 0, lng: wp.lon || 0 },
            location: '', // Not in API response
            date: toDateString(wp.date),
            description: wp.description || '',
            elevationM:
              typeof wp.elevationM === 'number' && Number.isFinite(wp.elevationM)
                ? wp.elevationM
                : undefined,
            entryIds: wp.entryIds || (wp.entryId ? [wp.entryId] : []),
          }));
          // Initialize routeOrder from saved sequence (API returns ORDER BY sequence ASC)
          // Set ref BEFORE setWaypoints so the sync effect sees it on the first render
          const savedOrder = transformedWaypoints.map(w => w.id);
          routeOrderInitializedRef.current = true;
          setWaypoints(updateDistances(transformedWaypoints));
          setRouteOrder(savedOrder);

          // Restore saved route geometry so the map draws the route without
          // re-fetching, and set the fingerprint so the directions effect
          // sees a match and skips.
          const savedGeom = (expedition as any).routeGeometry as number[][] | null;
          if (savedGeom && savedGeom.length >= 2) {
            setDirectionsGeometry(savedGeom as [number, number][]);

            // Split saved geometry into per-leg segments
            const wpLngLats = transformedWaypoints.map(w => [w.coordinates.lng, w.coordinates.lat] as [number, number]);
            const isRT = !!expedition.isRoundTrip;
            if (isRT && wpLngLats.length > 1) wpLngLats.push(wpLngLats[0]);
            const legGeoms = splitGeometryAtWaypoints(savedGeom, wpLngLats);
            setPerLegGeomsAndRef(legGeoms);

            // Compute per-leg distances from geometry segments
            const legDists = legGeoms.map(coords => {
              let d = 0;
              for (let j = 1; j < coords.length; j++) {
                d += haversineFromLatLng(
                  { lat: coords[j - 1][1], lng: coords[j - 1][0] },
                  { lat: coords[j][1], lng: coords[j][0] },
                );
              }
              return d;
            });
            setDirectionsLegDistances(legDists);
          }

          // Build fingerprint matching what the directions effect would compute
          // Use locally-constructed values, not refs that may not have flushed yet
          const restoredModes = perLegModesRef.current;
          const modeStr = restoredModes.length > 0
            ? restoredModes.join(',')
            : (expedition.routeMode && !isStraightLike(expedition.routeMode) ? expedition.routeMode : (expedition.routeMode === 'passage' ? 'passage' : 'straight'));
          lastDirectionsCoordsRef.current = transformedWaypoints
            .map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|')
            + `::${modeStr}::${!!expedition.isRoundTrip}::${waterwayProfileRef.current}`;
        }

        // Restore waterway obstacles
        if (expedition.routeObstacles?.length) {
          setWaterwayObstacles(expedition.routeObstacles);
        }

        // Restore per-expedition route export toggle (defaults true for legacy rows)
        if ((expedition as any).routeExportAllowed !== undefined) {
          setRouteExportAllowed((expedition as any).routeExportAllowed ?? true);
        }

        // Load entries (read-only context for builder)
        if (expedition.entries && expedition.entries.length > 0) {
          setExpeditionEntries(
            expedition.entries
              .filter((e: any) => e.lat && e.lon)
              .map((e: any) => ({
                id: e.id,
                title: e.title,
                date: toDateString(e.date),
                place: e.place || '',
                coords: { lat: e.lat!, lng: e.lon! },
              }))
          );
        }

        setIsLoading(false);
      } catch {
        setIsLoading(false);
        setSubmitError('Failed to load expedition data');
      }
    };

    loadExpedition();
  }, [expeditionId, isEditMode]);

  // Check for existing drafts on mount (create mode only)
  useEffect(() => {
    if (isEditMode) return;
    const checkDrafts = async () => {
      try {
        const result = await expeditionApi.getDrafts();
        if (result.data && result.data.length > 0) {
          setExistingDraft(result.data[0]);
          setShowDraftPrompt(true);
        }
      } catch {
        // Silently ignore — user may not be authenticated yet
      }
    };
    checkDrafts();
  }, [isEditMode]);

  // Load draft data into form state
  const loadDraft = useCallback((draft: any) => {
    setDraftId(draft.id);
    setExpeditionData({
      title: draft.title || '',
      regions: draft.region ? draft.region.split(', ').map((r: string) => r.trim()).filter(Boolean) : [],
      description: draft.description || '',
      category: draft.category || '',
      startDate: toDateString(draft.startDate),
      endDate: toDateString(draft.endDate),
      visibility: draft.visibility || 'public',
    });
    if (draft.tags?.length) setTags(draft.tags.join(', '));
    if ((draft as any).mode) setExpeditionMode((draft as any).mode);
    if ((draft as any).vesselName) setVesselName((draft as any).vesselName);
    if ((draft as any).vesselType) setVesselType((draft as any).vesselType);
    if ((draft as any).vesselLengthM != null) setVesselLengthM(String((draft as any).vesselLengthM));
    if ((draft as any).vesselDraftM != null) setVesselDraftM(String((draft as any).vesselDraftM));
    if ((draft as any).vesselCrewSize != null) setVesselCrewSize(String((draft as any).vesselCrewSize));
    if (draft.locationName) {
      setLocationName(draft.locationName);
      setLocationAutoFilled(true);
    }
    if (draft.estimatedDurationH) {
      setEstimatedDurationH(String(draft.estimatedDurationH));
      setDurationAutoFilled(true);
    }
    if (draft.countryCode) setCountryCode(draft.countryCode);
    if (draft.countryName) setCountryName(draft.countryName);
    if (draft.stateProvince) setStateProvince(draft.stateProvince);
    if (draft.coverImage) {
      setCoverPhotoPreview(draft.coverImage);
      setCoverPhotoUrl(draft.coverImage);
    }
    if (draft.goal && draft.goal > 0) {
      setSponsorshipsEnabled(true);
      setSponsorshipGoal(draft.goal);
    }
    if (draft.notesAccessThreshold > 0) setNotesAccessThreshold(draft.notesAccessThreshold);
    if (draft.notesVisibility) setNotesVisibility(draft.notesVisibility);
    if (draft.earlyAccessEnabled) setEarlyAccessEnabled(true);
    if (draft.isRoundTrip) setIsRoundTrip(true);
    if (draft.routeMode && !isStraightLike(draft.routeMode)) {
      if (draft.routeMode === 'mixed' && draft.routeLegModes) {
        const legModes = draft.routeLegModes as RouteMode[];
        setPerLegModesAndRef(legModes);
        const firstNonStraight = legModes.find((m: string) => !isStraightLike(m)) || 'walking';
        setRouteMode(firstNonStraight as RouteMode);
      } else {
        setRouteMode(draft.routeMode as RouteMode);
        // Pre-fill perLegModes so the init effect doesn't resize them
        if (draft.waypoints?.length > 1) {
          const numLegs = draft.isRoundTrip
            ? draft.waypoints.length
            : draft.waypoints.length - 1;
          setPerLegModesAndRef(Array(numLegs).fill(draft.routeMode) as RouteMode[]);
        }
      }
    }
    if (draft.waypoints?.length > 0) {
      const transformed: Waypoint[] = draft.waypoints.map((wp: any, index: number) => ({
        id: String(wp.id),
        sequence: index,
        name: wp.title || `Waypoint ${index + 1}`,
        type: 'standard' as const,
        coordinates: { lat: wp.lat || 0, lng: wp.lon || 0 },
        location: '',
        date: toDateString(wp.date),
        description: wp.description || '',
        entryIds: wp.entryIds || [],
      }));
      // Initialize routeOrder from saved sequence (API returns ORDER BY sequence ASC)
      // Set ref BEFORE setWaypoints so the sync effect sees it on the first render
      const savedOrder = transformed.map(w => w.id);
      routeOrderInitializedRef.current = true;
      setWaypoints(updateDistances(transformed));
      setRouteOrder(savedOrder);

      // Restore saved geometry and set fingerprint to skip re-fetch
      const savedGeom = draft.routeGeometry as number[][] | null;
      if (savedGeom && savedGeom.length >= 2) {
        setDirectionsGeometry(savedGeom as [number, number][]);
        const wpLngLats = transformed.map(w => [w.coordinates.lng, w.coordinates.lat] as [number, number]);
        const isRT = !!draft.isRoundTrip;
        if (isRT && wpLngLats.length > 1) wpLngLats.push(wpLngLats[0]);
        const legGeoms = splitGeometryAtWaypoints(savedGeom, wpLngLats);
        setPerLegGeomsAndRef(legGeoms);
      }
      const restoredModes = perLegModesRef.current;
      const modeStr = restoredModes.length > 0
        ? restoredModes.join(',')
        : (draft.routeMode && !isStraightLike(draft.routeMode) ? draft.routeMode : (draft.routeMode === 'passage' ? 'passage' : 'straight'));
      lastDirectionsCoordsRef.current = transformed
        .map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|')
        + `::${modeStr}::${!!draft.isRoundTrip}::${waterwayProfileRef.current}`;
    }
    if (draft.routeObstacles?.length) {
      setWaterwayObstacles(draft.routeObstacles);
    }
    if ((draft as any).routeExportAllowed !== undefined) {
      setRouteExportAllowed((draft as any).routeExportAllowed ?? true);
    }
    if (draft.startDate && draft.endDate) {
      const start = new Date(draft.startDate);
      const end = new Date(draft.endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      setExpectedDuration(diffDays.toString());
    }
    setShowDraftPrompt(false);
    setExistingDraft(null);
    // Set the content signature after loading so autosave doesn't immediately trigger
    // Use ref to get the latest signature after React state has flushed
    setTimeout(() => {
      lastSavedContentRef.current = getContentSignatureRef.current();
    }, 100);
  }, [updateDistances]);

  // Handle "Start Fresh" — delete existing draft
  const handleStartFresh = useCallback(async () => {
    if (existingDraft?.id) {
      try {
        await expeditionApi.delete(existingDraft.id);
      } catch {
        // Ignore — draft may already be gone
      }
    }
    setShowDraftPrompt(false);
    setExistingDraft(null);
  }, [existingDraft]);

  // Autosave interval (30s, create/draft mode only)
  useEffect(() => {
    if (isEditMode) return;

    const interval = setInterval(async () => {
      // Skip if no title, currently submitting, or already auto-saving
      if (!expeditionData.title.trim() || isSubmittingRef.current || isAutoSavingRef.current) return;

      const currentSignature = getContentSignature();
      if (currentSignature === lastSavedContentRef.current) return;

      isAutoSavingRef.current = true;
      setIsAutoSaving(true);

      try {
        const payload = {
          title: expeditionData.title,
          description: expeditionData.description,
          visibility: canCreateBlueprints
            ? (expeditionData.visibility === 'off-grid' ? 'off-grid' : 'public')
            : expeditionData.visibility,
          status: 'draft' as const,
          startDate: expeditionData.startDate || undefined,
          endDate: expeditionData.endDate || undefined,
          coverImage: coverPhotoUrl || undefined,
          goal: sponsorshipsEnabled && sponsorshipGoal ? Number(sponsorshipGoal) : undefined,
          notesAccessThreshold: notesVisibility === 'sponsor' && notesAccessThreshold ? Number(notesAccessThreshold) : 0,
          notesVisibility,
          earlyAccessEnabled: sponsorshipsEnabled ? earlyAccessEnabled : false,
          isRoundTrip,
          category: expeditionData.category || undefined,
          region: expeditionData.regions.length > 0 ? expeditionData.regions.join(', ') : undefined,
          locationName: locationName || undefined,
          countryCode: countryCode || undefined,
          countryName: countryName || undefined,
          stateProvince: stateProvince || undefined,
          routeMode: (() => { const u = new Set(perLegModes); if (u.size > 1) return 'mixed'; const m = perLegModes[0] || routeMode; return !isStraightLike(m) ? m : (m === 'passage' ? 'passage' : null); })(),
          routeGeometry: perLegModes.some(m => !isStraightLike(m)) && directionsGeometry ? directionsGeometry : null,
          routeLegModes: new Set(perLegModes).size > 1 ? perLegModes : undefined,
          routeDistanceKm: totalDistance > 0 ? Math.round(totalDistance * 10) / 10 : undefined,
          routeObstacles: waterwayObstacles.length > 0 ? waterwayObstacles : null,
          routeExportAllowed: canCreateBlueprints ? routeExportAllowed : undefined,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
          isBlueprint: canCreateBlueprints ? true : undefined,
          mode: expeditionMode || undefined,
          vesselName: vesselName || undefined,
          vesselType: vesselType || undefined,
          vesselLengthM: vesselLengthM ? parseFloat(vesselLengthM) : undefined,
          vesselDraftM: vesselDraftM ? parseFloat(vesselDraftM) : undefined,
          vesselCrewSize: vesselCrewSize ? parseInt(vesselCrewSize) : undefined,
          estimatedDurationH: estimatedDurationH ? Number(estimatedDurationH) : undefined,
        };

        let currentDraftId = draftId;

        if (!currentDraftId) {
          // First save — create draft
          const result = await expeditionApi.create(payload as any);
          currentDraftId = (result as any).expeditionId || (result as any).id;
          setDraftId(currentDraftId);
        } else {
          // Subsequent saves — update existing draft
          await expeditionApi.update(currentDraftId, payload as any);
        }

        // Sync waypoints in display order
        if (currentDraftId && (waypointsRef.current.length > 0 || expeditionEntriesRef.current.length > 0)) {
          const wps = waypointsRef.current;
          const entries = expeditionEntriesRef.current;
          const order = routeOrderRef.current;

          // Build linked entry set from waypoints
          const linkedIds = new Set<string>();
          wps.forEach(w => (w.entryIds || []).forEach(eid => linkedIds.add(eid)));
          const unlinked = entries.filter(e => !linkedIds.has(e.id));

          // Build combined items in route order
          type DraftRouteItem =
            | { kind: 'waypoint'; id: string; waypoint: Waypoint }
            | { kind: 'entry'; id: string; entry: typeof entries[0] };
          const itemMap = new Map<string, DraftRouteItem>();
          wps.forEach(w => itemMap.set(w.id, { kind: 'waypoint', id: w.id, waypoint: w }));
          unlinked.forEach(e => itemMap.set(e.id, { kind: 'entry', id: e.id, entry: e }));

          const orderedItems = order.length > 0
            ? order.map(id => itemMap.get(id)).filter((r): r is DraftRouteItem => r !== undefined)
            : [...itemMap.values()];

          const wpPayload = orderedItems
            .filter(item => item.kind === 'waypoint' || (item.kind === 'entry' && item.entry.coords?.lat != null))
            .map((item, i) => {
              if (item.kind === 'waypoint') {
                return {
                  lat: item.waypoint.coordinates.lat,
                  lon: item.waypoint.coordinates.lng,
                  elevationM: item.waypoint.elevationM,
                  title: item.waypoint.name || undefined,
                  date: item.waypoint.date || undefined,
                  description: item.waypoint.description || undefined,
                  sequence: i,
                  entryIds: item.waypoint.entryIds?.length > 0 ? item.waypoint.entryIds : undefined,
                };
              }
              return {
                lat: item.entry.coords.lat,
                lon: item.entry.coords.lng,
                title: item.entry.title || undefined,
                date: item.entry.date || undefined,
                sequence: i,
                entryId: item.entry.id,
              };
            });
          await expeditionApi.syncWaypoints(currentDraftId, wpPayload);
        }

        lastSavedContentRef.current = currentSignature;
        setLastSaved(new Date());
      } catch {
        // Silent failure — don't interrupt user flow
      } finally {
        isAutoSavingRef.current = false;
        setIsAutoSaving(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, expeditionData, coverPhotoUrl, sponsorshipsEnabled, sponsorshipGoal, notesAccessThreshold, notesVisibility, earlyAccessEnabled, isRoundTrip, routeMode, tags, draftId, getContentSignature]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current || isLoading) return;

    // Check if token is valid
    if (!MAPBOX_TOKEN || (MAPBOX_TOKEN as string) === 'YOUR_MAPBOX_TOKEN_HERE') {
      setMapError('Mapbox token not configured. Please add your Mapbox access token in ExpeditionBuilderPage.tsx');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: getMapStyle(mapLayer, theme),
        center: [-98.5795, 39.8283],
        zoom: 3,
        projection: 'mercator'
      });

      map.current = newMap;

      // Add error handler - suppress non-critical warnings
      newMap.on('error', (e) => {
        const msg = e.error?.message || '';
        // Only show token error UI for actual auth/token failures
        if (msg.includes('401') || msg.includes('403') || msg.includes('access token') || msg.includes('Not authorized')) {
          setMapError('Failed to load map. Please check your Mapbox token.');
          return;
        }
        // Suppress all other non-critical Mapbox errors (style transitions, expression evals, etc.)
      });

      // Add geocoder control
      const geocoder = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: 'Search for a location or business...',
        trackProximity: false,
        flyTo: false,
        types: 'country,region,place,locality,neighborhood,address,poi',
        limit: 10,
        externalGeocoder: createPOIGeocoder(newMap),
      } as any);
      newMap.addControl(geocoder as any, 'top-left');

      // Manually manage proximity bias — the built-in trackProximity
      // only applies at zoom > 9, which is too restrictive.
      const updateGeocoderProximity = () => {
        const center = newMap.getCenter();
        geocoder.setProximity({ longitude: center.lng, latitude: center.lat });
      };
      newMap.on('moveend', updateGeocoderProximity);
      newMap.on('load', updateGeocoderProximity);

      // Shared helper: create and insert a waypoint
      const addWaypoint = (lat: number, lng: number, name: string, location: string) => {
        const waypointId = `waypoint-${crypto.randomUUID()}`;
        const newWaypoint: Waypoint = {
          id: waypointId,
          sequence: 0,
          name,
          type: 'standard',
          coordinates: { lat, lng },
          location,
          date: '',
          description: '',
          entryIds: [],
        };

        setWaypoints(prev => {
          const all = [...prev, newWaypoint];
          return updateDistances(all.map((w, i) => ({ ...w, sequence: i })));
        });

        // Fire-and-forget: auto-populate elevation from Open Meteo for the
        // waypoint we just added. Non-fatal on failure — the backend has a
        // batch fallback that fills in any missing elevation on sync, so
        // the worst case here is that the UI doesn't show an elevation
        // value until the next reload.
        void (async () => {
          try {
            const res = await fetch(
              `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`,
            );
            if (!res.ok) return;
            const data = await res.json();
            const ele = Array.isArray(data?.elevation) ? data.elevation[0] : undefined;
            if (typeof ele !== 'number' || !Number.isFinite(ele)) return;
            setWaypoints(prev =>
              prev.map(w => (w.id === waypointId ? { ...w, elevationM: ele } : w)),
            );
          } catch {
            // Swallow — backend will backfill on sync.
          }
        })();
      };

      addWaypointRef.current = addWaypoint;

      // Helper to show search label + fly to coordinates
      const showSearchResult = (lng: number, lat: number, poiName: string, address: string) => {
        searchResultRef.current = { lng, lat, name: poiName, address };

        const labelData: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { name: poiName } }],
        };
        if (newMap.getSource('search-label')) {
          (newMap.getSource('search-label') as mapboxgl.GeoJSONSource).setData(labelData);
        } else {
          newMap.addSource('search-label', { type: 'geojson', data: labelData });
          newMap.addLayer({
            id: 'search-label-dot',
            type: 'circle',
            source: 'search-label',
            paint: {
              'circle-radius': 6,
              'circle-color': '#4676ac',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          });
          newMap.addLayer({
            id: 'search-label-text',
            type: 'symbol',
            source: 'search-label',
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 13,
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-offset': [0, 1.4],
              'text-anchor': 'top',
              'text-max-width': 12,
            },
            paint: {
              'text-color': '#4676ac',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          });
        }

        newMap.flyTo({ center: [lng, lat], zoom: 15 });

        // After fly, hide our label if the map already has one for this POI
        newMap.once('moveend', () => {
          const pt = newMap.project([lng, lat]);
          const poiSymbolLayers = (newMap.getStyle()?.layers || [])
            .filter(l => l.id.includes('poi') && l.type === 'symbol')
            .map(l => l.id);
          if (poiSymbolLayers.length) {
            const hits = newMap.queryRenderedFeatures(
              [[pt.x - 20, pt.y - 20], [pt.x + 20, pt.y + 20]],
              { layers: poiSymbolLayers },
            );
            const hasMapLabel = hits.some(f => {
              const fname = (f.properties?.name || f.properties?.name_en || '').toLowerCase();
              return fname && poiName.toLowerCase().includes(fname);
            });
            if (hasMapLabel && newMap.getSource('search-label')) {
              (newMap.getSource('search-label') as mapboxgl.GeoJSONSource).setData({
                type: 'FeatureCollection',
                features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { name: '' } }],
              });
            }
          }
        });
      };

      // When user selects a geocoder result
      geocoder.on('result', (e: any) => {
        const feature = e.result;
        const mapboxId = feature.properties?.mapbox_id;

        // External POI results have placeholder [0,0] coords — resolve via /retrieve
        if (mapboxId && feature.center?.[0] === 0 && feature.center?.[1] === 0) {
          retrievePOI(mapboxId).then(poi => {
            if (poi) showSearchResult(poi.lng, poi.lat, poi.name, poi.address);
          });
          return;
        }

        // Standard geocoder result — already has real coordinates
        const [lng, lat] = feature.center || feature.geometry?.coordinates || [];
        if (lng == null || lat == null) return;
        const poiName = feature.text || feature.place_name || '';
        const address = feature.properties?.full_address || feature.properties?.place_formatted || feature.place_name || '';
        showSearchResult(lng, lat, poiName, address);
      });

      // Add navigation control
      newMap.addControl(new mapboxgl.NavigationControl(), 'top-left');
      newMap.addControl(new mapboxgl.ScaleControl({ maxWidth: 150, unit: 'metric' }), 'bottom-left');

      // Set map loaded when style is loaded
      newMap.on('load', () => {
        setMapLoaded(true);
        applyNauticalOverlay(newMap, nauticalOverlayRef.current);

        // Enable POI labels so businesses/establishments are visible
        const style = newMap.getStyle();
        if (style?.layers) {
          for (const layer of style.layers) {
            if (layer.id.includes('poi') && layer.type === 'symbol') {
              newMap.setLayoutProperty(layer.id, 'visibility', 'visible');
            }
          }
        }

        // Show pointer cursor when hovering over POI icons
        const poiLayerIds = (newMap.getStyle()?.layers || [])
          .filter(l => l.id.includes('poi') && l.type === 'symbol')
          .map(l => l.id);
        for (const layerId of poiLayerIds) {
          newMap.on('mouseenter', layerId, () => { newMap.getCanvas().style.cursor = 'pointer'; });
          newMap.on('mouseleave', layerId, () => { newMap.getCanvas().style.cursor = ''; });
        }

        // Force resize to ensure map renders properly
        setTimeout(() => {
          newMap.resize();
        }, 100);
      });

      // Add click handler for adding waypoints
      newMap.on('click', (e) => {
        const { lng, lat } = e.lngLat;

        // Check if user clicked on a POI feature on the map
        const poiLayers = (newMap.getStyle()?.layers || [])
          .filter(l => l.id.includes('poi') && l.type === 'symbol')
          .map(l => l.id);
        const poiFeatures = poiLayers.length
          ? newMap.queryRenderedFeatures(e.point, { layers: poiLayers })
          : [];

        // Check if click is near a pending search result marker
        const sr = searchResultRef.current;
        const nearSearch = sr && Math.abs(lat - sr.lat) < 0.001 && Math.abs(lng - sr.lng) < 0.001;

        if (nearSearch && sr) {
          skipFitBoundsRef.current = true;
          addWaypoint(sr.lat, sr.lng, sr.name, sr.address);
          // Clear label
          if (newMap.getSource('search-label')) {
            (newMap.getSource('search-label') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
          }
          searchResultRef.current = null;
        } else if (poiFeatures.length > 0) {
          const poi = poiFeatures[0];
          const poiName = (poi.properties?.name || poi.properties?.name_en || '') as string;
          // Use the POI's actual geometry coordinates for precision
          const poiCoords = poi.geometry.type === 'Point'
            ? { lng: (poi.geometry as GeoJSON.Point).coordinates[0], lat: (poi.geometry as GeoJSON.Point).coordinates[1] }
            : { lng, lat };
          // Fly to POI so user can confirm the correct location
          skipFitBoundsRef.current = true;
          newMap.flyTo({ center: [poiCoords.lng, poiCoords.lat], zoom: Math.max(newMap.getZoom(), 15), speed: 1.2 });
          addWaypoint(poiCoords.lat, poiCoords.lng, poiName || `Waypoint ${waypointsRef.current.length + 1}`, poiName);
        } else {
          addWaypoint(lat, lng, `Waypoint ${waypointsRef.current.length + 1}`, '');
        }
      });

    } catch {
      setMapError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      routeSearchMarkersRef.current.forEach(m => m.remove());
      routeSearchMarkersRef.current.clear();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, theme]);

  // Update map style when theme or map layer changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    let isMounted = true;

    setMapLoaded(false); // Will be set back to true when new style loads
    map.current.setStyle(getMapStyle(mapLayer, theme));

    // Wait for new style to load
    map.current.once('styledata', () => {
      if (!isMounted) return;
      setMapLoaded(true);

      // Re-enable POI labels after style change
      const m = map.current;
      if (m) {
        const style = m.getStyle();
        if (style?.layers) {
          for (const layer of style.layers) {
            if (layer.id.includes('poi') && layer.type === 'symbol') {
              m.setLayoutProperty(layer.id, 'visibility', 'visible');
            }
          }
        }
        applyNauticalOverlay(m, nauticalOverlayRef.current);
      }
    });

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mapLayer]);

  // Dynamically toggle nautical overlay
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    applyNauticalOverlay(map.current, nauticalOverlay);
  }, [nauticalOverlay, mapLoaded]);

  // Hide instructions overlay when map moves
  useEffect(() => {
    if (!map.current) return;

    const hideInstructions = () => setShowInstructions(false);
    map.current.on('movestart', hideInstructions);

    return () => {
      map.current?.off('movestart', hideInstructions);
    };
  }, [mapLoaded]);

  // Fetch Mapbox POI categories lazily when panel first opens
  const categoriesFetchedRef = useRef(false);
  useEffect(() => {
    if (!showRouteSearch || categoriesFetchedRef.current) return;
    categoriesFetchedRef.current = true;
    fetchPOICategories().then(cats => {
      if (cats.length > 0) setAllCategories(cats);
    });
  }, [showRouteSearch]);

  // Clear route search results and cache when route changes
  const routeFingerprint = waypoints.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|');
  useEffect(() => {
    clearRouteSearchCache();
    allRouteResultsRef.current = [];
    if (showRouteSearch && routeSearchResults.length > 0) {
      setRouteSearchResults([]);
      routeSearchResultsRef.current = [];
      setActiveCategory(null);
      routeSearchMarkersRef.current.forEach(m => m.remove());
      routeSearchMarkersRef.current.clear();
      if (map.current?.getSource('route-search-pois')) {
        (map.current.getSource('route-search-pois') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeFingerprint, directionsGeometry, routeMode]);

  // Initialize/resize perLegModes when waypoint count changes — preserve existing leg assignments
  useEffect(() => {
    const numLegs = isRoundTrip ? waypoints.length : waypoints.length - 1;
    if (numLegs <= 0) {
      if (perLegModesRef.current.length > 0) {
        setPerLegModesAndRef([]);
        setPerLegGeomsAndRef([]);
      }
      return;
    }
    const existing = perLegModesRef.current;
    if (existing.length !== numLegs) {
      const defaultMode = (!isStraightLike(routeMode) ? routeMode : routeMode) as RouteMode;
      const existingGeoms = perLegGeomsRef.current;
      if (numLegs > existing.length) {
        // Leg added (waypoint added or round trip toggled on) — preserve existing, append new
        setPerLegModesAndRef([...existing, ...Array(numLegs - existing.length).fill(defaultMode)] as RouteMode[]);
        setPerLegGeomsAndRef([...existingGeoms.slice(0, existing.length), ...Array(numLegs - existing.length).fill([])]);
      } else {
        // Leg removed (waypoint removed or round trip toggled off) — trim
        setPerLegModesAndRef(existing.slice(0, numLegs));
        setPerLegGeomsAndRef(existingGeoms.slice(0, numLegs));
      }
    }
  }, [waypoints.length, isRoundTrip, routeMode, setPerLegModesAndRef, setPerLegGeomsAndRef]);

  // Debounced directions fetch when waypoints or route mode changes
  useEffect(() => {
    // Clear any pending timer
    if (directionsTimerRef.current) {
      clearTimeout(directionsTimerRef.current);
      directionsTimerRef.current = null;
    }

    // Wait for map — return without clearing so restored geometry/fingerprint survive
    if (!mapLoaded) return;

    // 'imported' mode short-circuits the fetch pipeline entirely — the trackline
    // and per-leg geometry were populated by handleRouteImport and must not be
    // cleared or refetched. Any per-leg switch to a non-imported mode will resize
    // perLegModes and drop us out of this guard on the next render.
    const currentLegModes = perLegModesRef.current;
    const allLegsImported =
      currentLegModes.length > 0 && currentLegModes.every(m => m === 'imported');
    if (routeMode === 'imported' && allLegsImported) {
      return;
    }

    // Reset directions state when all legs are straight or too few waypoints
    const hasNonStraightLeg = currentLegModes.some(m => !isStraightLike(m));
    if ((isStraightLike(routeMode) && !hasNonStraightLeg) || waypoints.length < 2) {
      lastDirectionsCoordsRef.current = '';
      setDirectionsGeometry(null);
      setDirectionsLegDistances(null);
      setDirectionsLegDurations(null);
      setDirectionsError(null);
      setDirectionsWarnings([]);
      setDirectionsLoading(false); setDirectionsProgress(null);
      setWaterwayFlowDirection(null);
      setWaterwayUpstreamFraction(null);
      setWaterwayObstacles([]);
      setPerLegGeomsAndRef([]);
      return;
    }

    // Build fingerprint — include per-leg modes if set, else global mode
    const modeStr = currentLegModes.length > 0 ? currentLegModes.join(',') : routeMode;
    const fingerprint = waypoints.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|')
      + `::${modeStr}::${isRoundTrip}::${waterwayProfile}`;

    if (fingerprint === lastDirectionsCoordsRef.current) {
      return; // Coordinates haven't changed, skip fetch
    }
    // NOTE: fingerprint ref is set inside the timer callback below, not here.
    // Setting it here would cause React strict mode (dev only) to skip the fetch
    // on remount: strict mode runs cleanup (clears timer) then re-runs the effect,
    // but the ref already matches so it returns early and directions never load.

    // Don't clear existing directions data — fetchMixedRoute reuses cached
    // legs and only fetches new/changed ones. Existing leg data stays visible
    // while the new leg is being fetched.
    setDirectionsWarnings([]);

    directionsTimerRef.current = setTimeout(() => {
      // Read current waypoints from ref to avoid stale closure
      const currentWaypoints = waypointsRef.current;
      if (currentWaypoints.length < 2) return;

      // Recompute fingerprint with current data to ensure consistency
      const latestModes = perLegModesRef.current;
      const latestModeStr = latestModes.length > 0 ? latestModes.join(',') : routeMode;
      const latestFingerprint = currentWaypoints.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|')
        + `::${latestModeStr}::${isRoundTripRef.current}::${waterwayProfileRef.current}`;
      lastDirectionsCoordsRef.current = latestFingerprint;

      if (latestModes.length > 0) {
        fetchMixedRoute(currentWaypoints, latestModes);
      } else {
        fetchDirectionsRoute(currentWaypoints, routeMode);
      }
    }, 500);

    return () => {
      if (directionsTimerRef.current) {
        clearTimeout(directionsTimerRef.current);
      }
      // Null out the ref BEFORE aborting so the catch handler knows
      // this was a superseded request (not a timeout)
      const controller = directionsAbortRef.current;
      directionsAbortRef.current = null;
      if (controller) {
        controller.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, routeMode, isRoundTrip, mapLoaded, waterwayProfile]);

  // Apply directions distances when they arrive from the API.
  // IMPORTANT: Only depend on directionsLegDistances — NOT routeMode.
  // If routeMode is in deps, switching modes (walking→driving) re-runs this
  // effect with stale walking distances, triggering a waypoints update that
  // cancels the debounce timer before the new fetch can fire.
  useEffect(() => {
    if (directionsLegDistances && directionsLegDistances.length > 0) {
      applyDirectionsDistances(directionsLegDistances, directionsLegDurations ?? undefined);
    }
  }, [directionsLegDistances, directionsLegDurations, applyDirectionsDistances]);

  // Update markers and route line when waypoints change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
    clusteredEntryRef.current?.cleanup();
    clusteredEntryRef.current = null;
    entryMarkersRef.current = [];

    // Group nearby waypoints into clusters — threshold scales with zoom level
    const zoom = map.current?.getZoom() ?? 10;
    const CLUSTER_THRESHOLD = 0.002 / Math.pow(2, Math.max(0, zoom - 10)); // ~200m at z10, shrinks at higher zoom
    const clustered: { waypoints: { wp: typeof waypoints[0]; idx: number }[]; lat: number; lng: number }[] = [];
    waypoints.forEach((waypoint, wpIdx) => {
      const existing = clustered.find(c =>
        Math.abs(c.lat - waypoint.coordinates.lat) < CLUSTER_THRESHOLD &&
        Math.abs(c.lng - waypoint.coordinates.lng) < CLUSTER_THRESHOLD
      );
      if (existing) {
        existing.waypoints.push({ wp: waypoint, idx: wpIdx });
        // Update center to average
        existing.lat = existing.waypoints.reduce((s, w) => s + w.wp.coordinates.lat, 0) / existing.waypoints.length;
        existing.lng = existing.waypoints.reduce((s, w) => s + w.wp.coordinates.lng, 0) / existing.waypoints.length;
      } else {
        clustered.push({
          waypoints: [{ wp: waypoint, idx: wpIdx }],
          lat: waypoint.coordinates.lat,
          lng: waypoint.coordinates.lng,
        });
      }
    });

    // Add waypoint markers — first = start, last = end, nearby waypoints clustered
    clustered.forEach((cluster) => {
      const isSingle = cluster.waypoints.length === 1;
      const firstWp = cluster.waypoints[0];
      const { wp: waypoint, idx: wpIdx } = firstWp;

      if (isSingle) {
        // Single waypoint — render normally
        const el = document.createElement('div');
        el.className = 'waypoint-marker';
        el.style.cssText = 'cursor: grab;';

        const isStart = waypoint.id === startRouteItemId;
        const isEnd = waypoint.id === endRouteItemId;
        const isStartEnd = isStart || isEnd;
        const routeIdx = routeItems.findIndex(r => r.id === waypoint.id);
        const positionNumber = routeIdx >= 0 ? routeIdx + 1 : wpIdx + 1;
        const isConverted = waypoint.entryIds.length > 0;

        if (isConverted) {
          const entryCount = waypoint.entryIds.length;
          if (entryCount > 1) {
            el.style.cssText += ` width: 30px; height: 30px; border-radius: 50%; background: #8a5738; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;`;
            el.innerHTML = `<span style="color: white; font-size: 12px; font-weight: bold; line-height: 1; font-family: Jost, system-ui, sans-serif;">${entryCount}</span>`;
          } else {
            el.style.cssText += ` width: 26px; height: 26px; border-radius: 50%; background: #ac6d46; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;`;
            el.innerHTML = `<span style="color: white; font-size: 12px; font-weight: bold; line-height: 1; font-family: Jost, system-ui, sans-serif;">${positionNumber}</span>`;
          }
        } else if (isStartEnd) {
          const fillColor = (isStart && isRoundTrip) ? '#ac6d46' : isStart ? '#ac6d46' : '#4676ac';
          const borderStyle = (isStart && isRoundTrip) ? '3px solid #4676ac' : '3px solid white';
          const label = isStart ? 'S' : 'E';
          el.style.cssText += ` width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;`;
          el.innerHTML = `
            <div style="width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; transform: rotate(45deg); background: ${fillColor}; border: ${borderStyle}; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
              <span style="transform: rotate(-45deg); color: white; font-size: 14px; font-weight: bold; line-height: 1; font-family: Jost, system-ui, sans-serif;">${label}</span>
            </div>
          `;
        } else {
          el.style.cssText += ` width: 22px; height: 22px; border-radius: 50%; background: #616161; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;`;
          el.innerHTML = `<span style="color: white; font-size: 10px; font-weight: bold; line-height: 1; font-family: Jost, system-ui, sans-serif;">${positionNumber}</span>`;
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedWaypoint(waypoint.id);
        });

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
          draggable: true,
        })
          .setLngLat([waypoint.coordinates.lng, waypoint.coordinates.lat])
          .addTo(map.current!);

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          setWaypoints(prev => {
            const updated = prev.map(w =>
              w.id === waypoint.id
                ? { ...w, coordinates: { lat: lngLat.lat, lng: lngLat.lng } }
                : w
            );
            return updateDistances(updated);
          });
          // Also update linked entry coordinates via API
          if (isConverted) {
            for (const eid of waypoint.entryIds) {
              const entry = expeditionEntries.find(e => e.id === eid);
              if (entry) {
                setExpeditionEntries(prev => prev.map(e =>
                  e.id === eid ? { ...e, coords: { lat: lngLat.lat, lng: lngLat.lng } } : e
                ));
                entryApi.update(eid, { title: entry.title, lat: lngLat.lat, lon: lngLat.lng }).catch(() => {
                  toast.error('Failed to save entry location');
                });
              }
            }
          }
        });

        markers.current.push(marker);
      } else {
        // Clustered waypoints — render as single marker with range label
        const positions = cluster.waypoints.map(w => w.idx + 1).sort((a, b) => a - b);
        const label = `${positions[0]}-${positions[positions.length - 1]}`;
        const totalEntries = cluster.waypoints.reduce((sum, w) => sum + w.wp.entryIds.length, 0);
        const hasConverted = totalEntries > 0;

        const el = document.createElement('div');
        el.className = 'waypoint-marker';
        el.style.cssText = 'cursor: pointer;';

        const bg = hasConverted ? '#8a5738' : '#616161';
        el.style.cssText += ` height: 24px; padding: 0 8px; border-radius: 12px; background: ${bg}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; white-space: nowrap;`;
        el.innerHTML = `<span style="color: white; font-size: 11px; font-weight: bold; line-height: 1; font-family: Jost, system-ui, sans-serif;">${label}</span>`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          // Select first waypoint in cluster
          setSelectedWaypoint(firstWp.wp.id);
        });

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
          draggable: false, // Clustered markers are not draggable
        })
          .setLngLat([cluster.lng, cluster.lat])
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });

    // Add draggable entry markers — only for entries not linked to any waypoint
    // (Linked entries are already represented by converted waypoint markers above)
    const linkedEntryIds = new Set<string>();
    waypoints.forEach(wp => {
      (wp.entryIds || []).forEach(eid => linkedEntryIds.add(eid));
    });
    const unlinkedEntries = expeditionEntries.filter(e => !linkedEntryIds.has(e.id) && (e.coords.lat !== 0 || e.coords.lng !== 0));

    unlinkedEntries.forEach(entry => {
      const el = document.createElement('div');
      el.style.cssText = 'cursor: grab; width: 22px; height: 22px; border-radius: 50%; background: #ac6d46; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;';

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
        draggable: true,
      })
        .setLngLat([entry.coords.lng, entry.coords.lat])
        .addTo(map.current!);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        // Read latest entry data from ref to avoid stale closure
        const currentEntry = expeditionEntriesRef.current.find(e => e.id === entry.id);
        setExpeditionEntries(prev => prev.map(e =>
          e.id === entry.id ? { ...e, coords: { lat: lngLat.lat, lng: lngLat.lng } } : e
        ));
        entryApi.update(entry.id, { title: currentEntry?.title ?? entry.title, lat: lngLat.lat, lon: lngLat.lng }).catch(() => {
          toast.error('Failed to save entry location');
        });
      });

      entryMarkersRef.current.push(marker);
    });

    // Draw route line — deferred if style is still loading
    const drawRoute = () => {
      if (!map.current) return;
      try {
        if (map.current.getSource('completed-route')) {
          if (map.current.getLayer('completed-route')) map.current.removeLayer('completed-route');
          if (map.current.getLayer('completed-route-casing')) map.current.removeLayer('completed-route-casing');
          map.current.removeSource('completed-route');
        }
        if (map.current.getSource('route')) {
          // Remove all possible mode-specific layers
          const allLayerIds = ['route-arrows', 'route-line', 'route-line-casing',
            ...Object.keys(ROUTE_MODE_STYLES).map(m => `route-line-${m}`)];
          for (const id of allLayerIds) {
            if (map.current.getLayer(id)) map.current.removeLayer(id);
          }
          map.current.removeSource('route');
        }
      } catch {
        // Source/layer may already be removed
      }

      // Build route coordinates from routeItems order (matches sidebar)
      const hasWaypointRoute = waypoints.length > 1;
      const hasAnyNonStraightLeg = perLegModes.some(m => !isStraightLike(m));
      const useDirections = hasWaypointRoute && (!isStraightLike(routeMode) || hasAnyNonStraightLeg) && directionsGeometry && directionsGeometry.length > 0;

      let routeCoordinates: number[][] | null = null;

      if (useDirections) {
        // Directions API route — splice unlinked entry coords at closest route points
        routeCoordinates = [...directionsGeometry];
        const routeLinkedIds = new Set<string>();
        waypoints.forEach(wp => (wp.entryIds || []).forEach(eid => routeLinkedIds.add(eid)));
        const unlinked = expeditionEntries.filter(e => !routeLinkedIds.has(e.id));
        for (const entry of unlinked) {
          const coord = [entry.coords.lng, entry.coords.lat];
          let bestIdx = 0;
          let bestDist = Infinity;
          for (let i = 0; i < routeCoordinates.length; i++) {
            const d = Math.pow(routeCoordinates[i][0] - coord[0], 2) + Math.pow(routeCoordinates[i][1] - coord[1], 2);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          }
          routeCoordinates.splice(bestIdx + 1, 0, coord);
        }
      } else {
        // Straight-line route — use routeItems order (respects custom reordering)
        const coords = routeItems.map(r =>
          r.kind === 'waypoint'
            ? [r.waypoint.coordinates.lng, r.waypoint.coordinates.lat]
            : [r.entry.coords.lng, r.entry.coords.lat]
        );
        if (coords.length > 1) routeCoordinates = coords;
        if (isRoundTrip && routeCoordinates && routeCoordinates.length > 0) {
          routeCoordinates.push(routeCoordinates[0]);
        }
      }

      if (routeCoordinates && routeCoordinates.length >= 2) {

        try {
          // Build per-leg geometries for FeatureCollection rendering
          const orderedWpCoords = waypoints.map(w => [w.coordinates.lng, w.coordinates.lat] as [number, number]);
          let legGeometries: number[][][];

          if (perLegGeometries.length > 0 && perLegModes.length > 0) {
            // Mixed mode — use stored per-leg geometries
            legGeometries = perLegGeometries;
          } else if (useDirections && orderedWpCoords.length >= 2) {
            // Uniform mode with directions — split at waypoint locations
            const wpLngLats = [...orderedWpCoords];
            if (isRoundTrip && wpLngLats.length > 1) wpLngLats.push(wpLngLats[0]);
            legGeometries = splitGeometryAtWaypoints(routeCoordinates, wpLngLats);
          } else {
            // Straight line fallback — each leg is two points
            legGeometries = [];
            const pts = [...orderedWpCoords];
            if (isRoundTrip && pts.length > 1) pts.push(pts[0]);
            for (let i = 0; i < pts.length - 1; i++) {
              legGeometries.push([pts[i], pts[i + 1]]);
            }
          }

          // Build GeoJSON FeatureCollection with per-leg mode properties
          const features = legGeometries.map((coords, i) => {
            const mode = perLegModes.length > 0 ? (perLegModes[i] || 'straight') : routeMode;
            return {
              type: 'Feature' as const,
              properties: { legIndex: i, mode },
              geometry: { type: 'LineString' as const, coordinates: coords },
            };
          });

          map.current.addSource('route', {
            type: 'geojson',
            data: { type: 'FeatureCollection' as const, features },
          });

          // Casing layer (shared across all modes)
          map.current.addLayer({
            id: 'route-line-casing',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': getLineCasingColor(mapLayer, theme),
              'line-width': 8,
              'line-opacity': 0.3,
            }
          });

          // Add a line layer per unique mode present for correct dash styling
          const uniqueModes = new Set(features.map(f => f.properties.mode));
          for (const mode of uniqueModes) {
            const style = ROUTE_MODE_STYLES[mode as RouteMode] || ROUTE_MODE_STYLES.straight;
            map.current.addLayer({
              id: `route-line-${mode}`,
              type: 'line',
              source: 'route',
              filter: ['==', ['get', 'mode'], mode],
              paint: {
                'line-color': style.color,
                'line-width': style.width,
                'line-opacity': 0.8,
                ...(style.dash ? { 'line-dasharray': style.dash } : {}),
              },
            });
          }

          // Flow direction arrows for waterway legs
          if (uniqueModes.has('waterway')) {
            map.current.addLayer({
              id: 'route-arrows',
              type: 'symbol',
              source: 'route',
              filter: ['==', ['get', 'mode'], 'waterway'],
              layout: {
                'symbol-placement': 'line',
                'symbol-spacing': 100,
                'text-field': '▸',
                'text-size': 18,
                'text-keep-upright': false,
                'text-rotation-alignment': 'map',
                'text-allow-overlap': true,
                'text-ignore-placement': true,
              },
              paint: {
                'text-color': '#ac6d46',
                'text-opacity': 0.7,
              },
            });
          }

          // Obstacle markers for waterway routes
          obstacleMarkersRef.current.forEach(m => m.remove());
          obstacleMarkersRef.current = [];
          if (waterwayObstacles.length > 0 && map.current) {
            for (const obs of waterwayObstacles) {
              const el = document.createElement('div');
              Object.assign(el.style, {
                width: '22px', height: '22px',
                backgroundColor: '#994040', border: '2px solid white',
                borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)', cursor: 'pointer',
                fontSize: '12px', color: 'white', fontWeight: 'bold',
              });
              el.textContent = '!';
              const label = obs.type.replace(/_/g, ' ');
              el.title = `${label}${obs.name ? `: ${obs.name}` : ''}`;
              const popupEl = document.createElement('div');
              const typeEl = document.createElement('div');
              Object.assign(typeEl.style, { fontFamily: 'Jost,sans-serif', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#994040' });
              typeEl.textContent = label;
              popupEl.appendChild(typeEl);
              if (obs.name) {
                const nameEl = document.createElement('div');
                Object.assign(nameEl.style, { fontFamily: 'Lora,serif', fontSize: '13px', marginTop: '2px' });
                nameEl.textContent = obs.name;
                popupEl.appendChild(nameEl);
              }
              const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '200px' })
                .setDOMContent(popupEl);
              // Prevent map click (waypoint placement) and toggle popup manually
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (popup.isOpen()) {
                  popup.remove();
                } else {
                  popup.setLngLat([obs.lon, obs.lat]).addTo(map.current!);
                }
              });
              const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                .setLngLat([obs.lon, obs.lat])
                .addTo(map.current);
              obstacleMarkersRef.current.push(marker);
            }
          }

          // Completed route overlay
          let currentLocCoords: { lng: number; lat: number } | null = null;
          if (currentLocationSource === 'waypoint' && currentLocationId) {
            const wp = waypoints.find(w => w.id === currentLocationId);
            if (wp) currentLocCoords = { lng: wp.coordinates.lng, lat: wp.coordinates.lat };
          } else if (currentLocationSource === 'entry' && currentLocationId) {
            const entry = expeditionEntries.find(e => e.id === currentLocationId);
            if (entry) currentLocCoords = { lng: entry.coords.lng, lat: entry.coords.lat };
          }

          if (currentLocCoords && routeCoordinates.length >= 2) {
            let closestIdx = 0;
            let closestDist = Infinity;
            for (let i = 0; i < routeCoordinates.length; i++) {
              const [lng, lat] = routeCoordinates[i];
              const d = Math.pow(lng - currentLocCoords.lng, 2) + Math.pow(lat - currentLocCoords.lat, 2);
              if (d < closestDist) { closestDist = d; closestIdx = i; }
            }
            const completedCoords = routeCoordinates.slice(0, closestIdx + 1);
            if (completedCoords.length >= 2) {
              map.current!.addSource('completed-route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'LineString', coordinates: completedCoords },
                },
              });
              map.current!.addLayer({
                id: 'completed-route-casing',
                type: 'line',
                source: 'completed-route',
                paint: { 'line-color': getLineCasingColor(mapLayer, theme), 'line-width': 8, 'line-opacity': 0.3 },
              });
              map.current!.addLayer({
                id: 'completed-route',
                type: 'line',
                source: 'completed-route',
                paint: { 'line-color': '#ac6d46', 'line-width': 4, 'line-opacity': 0.9 },
              });
            }
          }
        } catch {
          // Map may be in a transitional state; route will be drawn on next update
        }
      }
    };

    drawRoute();
    
    // Zoom map to fit all waypoints (especially useful in edit mode)
    // Only animate if not already zoomed in past the target level
    if ((waypoints.length > 0 || expeditionEntries.length > 0) && map.current) {
      // Skip fitBounds if a geocoder/POI selection just placed a waypoint
      if (skipFitBoundsRef.current) {
        skipFitBoundsRef.current = false;
      } else {
        const currentZoom = map.current.getZoom();
        const targetZoom = 14;

        // Skip fitBounds if already zoomed in past target level
        if (currentZoom <= targetZoom) {
          const bounds = new mapboxgl.LngLatBounds();
          waypoints.forEach(waypoint => {
            bounds.extend([waypoint.coordinates.lng, waypoint.coordinates.lat]);
          });
          expeditionEntries.forEach(e => {
            bounds.extend([e.coords.lng, e.coords.lat]);
          });

          map.current.fitBounds(bounds, {
            padding: 100,
            maxZoom: targetZoom,
            duration: 1000
          });
        }
      }
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      clusteredEntryRef.current?.cleanup();
      clusteredEntryRef.current = null;
      entryMarkersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, mapLoaded, isRoundTrip, routeMode, directionsGeometry, expeditionEntries, routeOrder, perLegGeometries, perLegModes, waterwayObstacles]);

  // Delete waypoint
  const handleDeleteWaypoint = (id: string) => {
    const filtered = waypoints.filter(w => w.id !== id);

    if (filtered.length === 0) {
      setWaypoints([]);
      setSelectedWaypoint(null);
      setIsRoundTrip(false);
      setPerLegModesAndRef([]);
      setPerLegGeomsAndRef([]);
      return;
    }

    // Reset round trip if only 1 waypoint left
    if (filtered.length === 1) {
      setIsRoundTrip(false);
    }

    // Splice the correct leg(s) from perLegModes/perLegGeoms based on
    // WHICH waypoint was removed, not just the count change.
    // Use waypoints-only order (not routeOrder which can include entries).
    const wpIds = waypointsRef.current.map(w => w.id);
    const deleteIdx = wpIds.indexOf(id);
    if (deleteIdx >= 0 && perLegModesRef.current.length > 0) {
      const modes = [...perLegModesRef.current];
      const geoms = [...perLegGeomsRef.current];
      const N = wpIds.length;

      if (N <= 2) {
        // Down to 1 waypoint — no legs left
        modes.length = 0;
        geoms.length = 0;
      } else if (!isRoundTrip && deleteIdx === 0) {
        // First waypoint removed (non-round-trip): drop leg 0
        modes.splice(0, 1);
        geoms.splice(0, 1);
      } else if (!isRoundTrip && deleteIdx === N - 1) {
        // Last waypoint removed (non-round-trip): drop last leg
        modes.pop();
        geoms.pop();
      } else {
        // Middle deletion (or first/last in round-trip): two legs merge
        // Remove the outgoing leg (at deleteIdx), keep the incoming (deleteIdx-1)
        // but clear its geometry since its endpoint changed
        const outIdx = deleteIdx < modes.length ? deleteIdx : 0;
        modes.splice(outIdx, 1);
        if (outIdx < geoms.length) geoms.splice(outIdx, 1);

        const inIdx = deleteIdx > 0 ? deleteIdx - 1 : modes.length - 1;
        if (inIdx >= 0 && inIdx < geoms.length) {
          geoms[inIdx] = [];
        }
      }

      setPerLegModesAndRef(modes);
      setPerLegGeomsAndRef(geoms);
    }

    // Update sequence numbers
    const updated = filtered.map((w, index) => ({
      ...w,
      sequence: index,
    }));
    setWaypoints(updateDistances(updated));
    setRouteOrder(prev => prev.filter(rid => rid !== id));
    if (selectedWaypoint === id) setSelectedWaypoint(null);
  };

  // Resequence waypoints: only sort DATED waypoints among the slots they occupy.
  // Dateless waypoints stay in their original positions.
  const resequenceWaypoints = (points: Waypoint[]): Waypoint[] => {
    if (points.length === 0) return [];

    // Collect indices and waypoints that have dates
    const datedEntries: { index: number; waypoint: Waypoint }[] = [];
    points.forEach((w, i) => {
      if (w.date) datedEntries.push({ index: i, waypoint: w });
    });

    // Sort the dated waypoints by date
    const sortedDated = [...datedEntries]
      .sort((a, b) => a.waypoint.date.localeCompare(b.waypoint.date))
      .map(e => e.waypoint);

    // Build result: place sorted dated waypoints back into the slots that dated waypoints occupied
    const result = [...points];
    datedEntries.forEach((entry, i) => {
      result[entry.index] = sortedDated[i];
    });

    // Update sequence based on final position
    const resequenced = result.map((w, index) => ({
      ...w,
      sequence: index,
    }));

    return updateDistances(resequenced);
  };

  // Check if moving a waypoint maintains chronological order among dated waypoints
  // Check if a route item can be moved up/down in the combined list
  // Constraint: entries must maintain date order relative to other entries
  const canMoveRouteItem = (itemId: string, direction: 'up' | 'down'): boolean => {
    const idx = routeOrder.indexOf(itemId);
    if (idx < 0) return false;
    if (direction === 'up' && idx === 0) return false;
    if (direction === 'down' && idx === routeOrder.length - 1) return false;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const proposed = [...routeOrder];
    [proposed[idx], proposed[swapIdx]] = [proposed[swapIdx], proposed[idx]];

    // Check entry date order: entries must not invert dates relative to each other
    let lastEntryDate = '';
    for (const id of proposed) {
      const entry = expeditionEntries.find(e => e.id === id);
      if (entry?.date) {
        if (lastEntryDate && entry.date < lastEntryDate) return false;
        lastEntryDate = entry.date;
      }
    }
    return true;
  };

  // Move a route item (waypoint or entry) up/down in the combined list
  const handleMoveRouteItem = (itemId: string, direction: 'up' | 'down') => {
    if (!canMoveRouteItem(itemId, direction)) return;
    const idx = routeOrder.indexOf(itemId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...routeOrder];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setRouteOrder(updated);
    routeOrderRef.current = updated; // sync ref immediately so auto-save reads correct order

    // Reorder waypoints to match new routeOrder
    const newWpOrder = updated.filter(id => waypoints.some(w => w.id === id));
    const reorderedWaypoints = newWpOrder
      .map(id => waypoints.find(w => w.id === id)!)
      .map((w, i) => ({ ...w, sequence: i }));
    if (reorderedWaypoints.length === waypoints.length) {
      setWaypoints(updateDistances(reorderedWaypoints));
    }

    // Determine affected legs — treat entries and waypoints uniformly
    const numLegs = isRoundTrip ? reorderedWaypoints.length : reorderedWaypoints.length - 1;
    if (numLegs > 0) {
      const affectedLegs = new Set<number>();
      const wpIds = new Set(waypoints.map(w => w.id));

      // For each swapped position, find which waypoint-based leg(s) it touches
      // Use the post-swap order so we invalidate the correct legs
      for (const pos of [idx, swapIdx]) {
        let wpsBefore = 0;
        for (let i = 0; i < pos; i++) {
          if (wpIds.has(updated[i])) wpsBefore++;
        }
        if (wpIds.has(updated[pos])) {
          // Item is a waypoint — affects legs before and after it
          if (wpsBefore > 0) affectedLegs.add(wpsBefore - 1);
          if (wpsBefore < numLegs) affectedLegs.add(wpsBefore);
          if (isRoundTrip && wpsBefore === 0) affectedLegs.add(numLegs - 1);
        } else {
          // Item is an entry — affects the leg that spans over it
          const legIdx = wpsBefore > 0 ? wpsBefore - 1 : 0;
          if (legIdx < numLegs) affectedLegs.add(legIdx);
        }
      }

      if (affectedLegs.size > 0) {
        const currentModes = perLegModesRef.current.length >= numLegs
          ? [...perLegModesRef.current]
          : Array(numLegs).fill('straight' as RouteMode);
        const currentGeoms = [...perLegGeomsRef.current];
        const currentCache = [...legCacheRef.current];

        for (const legIdx of affectedLegs) {
          if (legIdx < currentModes.length) currentModes[legIdx] = 'straight';
          if (legIdx < currentGeoms.length) currentGeoms[legIdx] = [];
          if (legIdx < currentCache.length) currentCache[legIdx] = { key: '', coords: [], distance: 0, duration: 0 };
        }

        setPerLegModesAndRef(currentModes as RouteMode[]);
        setPerLegGeomsAndRef(currentGeoms);
        legCacheRef.current = currentCache;
        setDirectionsGeometry(null);
        setDirectionsLegDistances(null);
        setDirectionsLegDurations(null);
        lastDirectionsCoordsRef.current = '';
      }
    }

    // Flash highlight
    if (movedTimerRef.current) clearTimeout(movedTimerRef.current);
    setMovedWaypointId(itemId);
    movedTimerRef.current = setTimeout(() => setMovedWaypointId(null), 600);
  };

  // Reorder notification state
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Update waypoint details
  const handleUpdateWaypoint = (waypointId: string, updates: Partial<Waypoint>) => {
    // Apply the update
    let updated = waypoints.map(w =>
      w.id === waypointId ? { ...w, ...updates } : w
    );

    // If date changed, check if resequencing is needed among dated waypoints
    if (updates.date !== undefined) {
      const before = updated.map(w => w.id); // order before resequence
      updated = resequenceWaypoints(updated);
      const after = updated.map(w => w.id); // order after resequence

      // Check if any waypoints actually moved
      const moved = before.some((wpId, i) => wpId !== after[i]);
      if (moved) {
        const changedWp = updated.find(w => w.id === waypointId);
        setReorderNotice(
          `Waypoint "${changedWp?.name || 'Waypoint'}" moved to position ${(changedWp?.sequence ?? 0) + 1} based on its date`
        );
        // Clear previous timer, set new auto-dismiss
        if (reorderNoticeTimerRef.current) clearTimeout(reorderNoticeTimerRef.current);
        reorderNoticeTimerRef.current = setTimeout(() => setReorderNotice(null), 4000);
      }
    }

    setWaypoints(updated);
  };

  // Route search helpers
  const getRouteCoordinates = useCallback((): number[][] => {
    if (perLegModes.some(m => !isStraightLike(m)) && directionsGeometry && directionsGeometry.length > 0) {
      return directionsGeometry;
    }
    return waypoints.map(w => [w.coordinates.lng, w.coordinates.lat]);
  }, [perLegModes, directionsGeometry, waypoints]);

  // All results from the API (unfiltered). Filtered subset goes into routeSearchResults.
  const allRouteResultsRef = useRef<POIResult[]>([]);

  // Approximate driving distance for N minutes of detour (~50km/h avg)
  const proximityMeters = routeSearchProximity * 830; // ~830m per minute at 50km/h

  // Filter + sort results: keep within proximity, sort by distance from map center
  const applyRouteSearchFilter = useCallback((allResults: POIResult[]) => {
    const filtered = allResults.filter(p => (p.distanceFromRoute ?? 0) <= proximityMeters);
    // Sort by distance from current map center (viewport proximity)
    if (map.current) {
      const center = map.current.getCenter();
      filtered.sort((a, b) => {
        const da = Math.pow(a.coordinates.lat - center.lat, 2) + Math.pow(a.coordinates.lng - center.lng, 2);
        const db = Math.pow(b.coordinates.lat - center.lat, 2) + Math.pow(b.coordinates.lng - center.lng, 2);
        return da - db;
      });
    }
    setRouteSearchResults(filtered);
    routeSearchResultsRef.current = filtered;

    // Update map layer
    if (map.current) {
      const m = map.current;
      const poiSymbolLayers = (m.getStyle()?.layers || [])
        .filter(l => l.id.includes('poi') && l.type === 'symbol')
        .map(l => l.id);

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: filtered.map(poi => {
          let showLabel = true;
          if (poiSymbolLayers.length) {
            try {
              const pt = m.project([poi.coordinates.lng, poi.coordinates.lat]);
              const hits = m.queryRenderedFeatures(
                [[pt.x - 15, pt.y - 15], [pt.x + 15, pt.y + 15]],
                { layers: poiSymbolLayers },
              );
              showLabel = !hits.some(f => {
                const fname = (f.properties?.name || f.properties?.name_en || '').toLowerCase();
                return fname && poi.name.toLowerCase().includes(fname);
              });
            } catch {
              // Point may be off-screen, show label
            }
          }
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [poi.coordinates.lng, poi.coordinates.lat] },
            properties: { id: poi.id, name: showLabel ? poi.name : '' },
          };
        }),
      };

      if (m.getSource('route-search-pois')) {
        (m.getSource('route-search-pois') as mapboxgl.GeoJSONSource).setData(geojson);
      }
    }
  }, [proximityMeters]);

  // Re-sort results when the map moves (viewport proximity changes)
  useEffect(() => {
    if (!map.current || !showRouteSearch || allRouteResultsRef.current.length === 0) return;
    const m = map.current;
    const onMoveEnd = () => applyRouteSearchFilter(allRouteResultsRef.current);
    m.on('moveend', onMoveEnd);
    return () => { m.off('moveend', onMoveEnd); };
  }, [showRouteSearch, applyRouteSearchFilter]);

  // Re-filter when the proximity slider changes (client-side, no API call)
  useEffect(() => {
    if (allRouteResultsRef.current.length > 0) {
      applyRouteSearchFilter(allRouteResultsRef.current);
    }
  }, [proximityMeters, applyRouteSearchFilter]);

  const handleRouteSearch = useCallback(async (categoryId: string) => {
    if (waypoints.length < 2) return;
    if (perLegModes.some(m => !isStraightLike(m)) && directionsLoading) return;
    setActiveCategory(categoryId);
    setRouteSearchLoading(true);
    setRouteSearchResults([]);

    // Clear previous markers
    routeSearchMarkersRef.current.forEach(m => m.remove());
    routeSearchMarkersRef.current.clear();

    try {
      let coords = getRouteCoordinates();
      // Clip to current viewport if the user is zoomed into a section of the route
      const b = map.current?.getBounds();
      if (b) {
        coords = clipRouteToBounds(coords, {
          west: b.getWest(), south: b.getSouth(),
          east: b.getEast(), north: b.getNorth(),
        });
      }
      // Always fetch with max time_deviation for full coverage (results are cached)
      const results = await searchAlongRoute(categoryId, coords, { limit: 25, timeDeviation: 30 });
      allRouteResultsRef.current = results;

      // Ensure map layers exist
      if (map.current && !map.current.getSource('route-search-pois')) {
        map.current.addSource('route-search-pois', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current.addLayer({
          id: 'route-search-pois-dot',
          type: 'circle',
          source: 'route-search-pois',
          paint: {
            'circle-radius': 5,
            'circle-color': '#4676ac',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
        map.current.addLayer({
          id: 'route-search-pois-label',
          type: 'symbol',
          source: 'route-search-pois',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-max-width': 10,
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#4676ac',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        });

        // Click handler for route search POI dots
        map.current.on('click', 'route-search-pois-dot', (e) => {
          if (!e.features?.[0]) return;
          const poiId = e.features[0].properties?.id;
          const poi = routeSearchResultsRef.current.find(r => r.id === poiId);
          if (poi) handleAddPOIAsWaypoint(poi);
        });
        map.current.on('mouseenter', 'route-search-pois-dot', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'route-search-pois-dot', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      }

      // Apply client-side filter + sort
      applyRouteSearchFilter(results);
    } catch {
      toast.error('Failed to search along route');
    } finally {
      setRouteSearchLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, getRouteCoordinates, routeMode, directionsLoading, applyRouteSearchFilter]);

  const handleAddPOIAsWaypoint = useCallback((poi: POIResult) => {
    skipFitBoundsRef.current = true;
    if (addWaypointRef.current) {
      addWaypointRef.current(poi.coordinates.lat, poi.coordinates.lng, poi.name, poi.address);
    }
    // Remove from all results and filtered results, update map layer
    allRouteResultsRef.current = allRouteResultsRef.current.filter(r => r.id !== poi.id);
    const updated = routeSearchResultsRef.current.filter(r => r.id !== poi.id);
    setRouteSearchResults(updated);
    routeSearchResultsRef.current = updated;
    if (map.current?.getSource('route-search-pois')) {
      (map.current.getSource('route-search-pois') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: updated.map(p => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [p.coordinates.lng, p.coordinates.lat] },
          properties: { id: p.id, name: p.name },
        })),
      });
    }
    toast.success(`Added ${poi.name} as waypoint`);
  }, []);

  const handleCloseRouteSearch = useCallback(() => {
    setShowRouteSearch(false);
    setRouteSearchResults([]);
    routeSearchResultsRef.current = [];
    allRouteResultsRef.current = [];
    setActiveCategory(null);
    setCategoryFilter('');
    routeSearchMarkersRef.current.forEach(m => m.remove());
    routeSearchMarkersRef.current.clear();
    if (map.current?.getSource('route-search-pois')) {
      (map.current.getSource('route-search-pois') as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
    }
  }, []);

  const quickPickCategories = QUICK_PICK_IDS
    .map(id => allCategories.find(c => c.id === id))
    .filter((c): c is POICategory => c != null);

  // When user types a filter, search all categories; otherwise show quick-picks only
  const filteredCategories = categoryFilter
    ? allCategories.filter(c => c.name.toLowerCase().includes(categoryFilter.toLowerCase()))
    : quickPickCategories;

  // Calculate total statistics — use route-order distances (computed after routeItems)
  // For round trips, add the return leg travel time
  const totalTravelTime = (() => {
    const cumTime = waypoints[waypoints.length - 1]?.cumulativeTravelTime || 0;
    if (!isRoundTrip || waypoints.length < 2) return cumTime;
    const returnIdx = waypoints.length - 1;
    const returnTime = directionsLegDurations?.[returnIdx] ?? 0;
    return cumTime + returnTime;
  })();
  const waypointCount = waypoints.length;

  const selectedWaypointData = waypoints.find(w => w.id === selectedWaypoint);

  // Build combined route items list (waypoints + unlinked entries)
  type RouteItem =
    | { kind: 'waypoint'; id: string; date: string; waypoint: Waypoint; wpIdx: number }
    | { kind: 'entry'; id: string; date: string; entry: typeof expeditionEntries[0] };

  const routeLinkedEntryIds = new Set<string>();
  waypoints.forEach(wp => (wp.entryIds || []).forEach(eid => routeLinkedEntryIds.add(eid)));

  const unlinkedEntryList = expeditionEntries.filter(e => !routeLinkedEntryIds.has(e.id));

  // Default date-sorted list for initial rendering and route drawing
  const dateSortedItems: RouteItem[] = [
    ...waypoints.map((wp, i) => ({ kind: 'waypoint' as const, id: wp.id, date: wp.date || '', waypoint: wp, wpIdx: i })),
    ...unlinkedEntryList.map(e => ({ kind: 'entry' as const, id: e.id, date: e.date || '', entry: e })),
  ].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : Infinity;
    const bTime = b.date ? new Date(b.date).getTime() : Infinity;
    return aTime - bTime;
  });

  // Sync routeOrder when items change (add/remove).
  // Uses functional updater to always read the latest routeOrder (avoids stale closure).
  useEffect(() => {
    const currentIds = new Set(dateSortedItems.map(r => r.id));

    setRouteOrder(prev => {
      // Skip if routeOrder was just initialized from saved data and already matches
      if (routeOrderInitializedRef.current) {
        const allPresent = prev.length > 0 && prev.every(id => currentIds.has(id));
        const noneAdded = [...currentIds].every(id => prev.includes(id));
        if (allPresent && noneAdded) {
          routeOrderInitializedRef.current = false; // consumed — future changes handled normally
          return prev;
        }
        routeOrderInitializedRef.current = false;
      }

      const existingIds = new Set(prev);
      const removed = prev.some(id => !currentIds.has(id));
      const added = [...currentIds].filter(id => !existingIds.has(id));

      if (added.length > 0 || removed) {
        const cleaned = prev.filter(id => currentIds.has(id));
        for (const newId of added) {
          const newItem = dateSortedItems.find(r => r.id === newId);
          if (!newItem) continue;
          let insertIdx = cleaned.length;
          // Entries: insert at date-sorted position; waypoints: append at end
          if (newItem.kind === 'entry') {
            for (let i = 0; i < cleaned.length; i++) {
              const existing = dateSortedItems.find(r => r.id === cleaned[i]);
              if (existing && newItem.date && existing.date && newItem.date < existing.date) {
                insertIdx = i;
                break;
              }
            }
          }
          cleaned.splice(insertIdx, 0, newId);
        }
        return cleaned;
      }
      if (prev.length === 0 && dateSortedItems.length > 0) {
        return dateSortedItems.map(r => r.id);
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints.length, unlinkedEntryList.length, waypoints.map(w => w.id).join(',')]);

  // Build routeItems from routeOrder (or fall back to date sort)
  const routeItemsById = new Map(dateSortedItems.map(r => [r.id, r]));
  const routeItems: RouteItem[] = routeOrder.length > 0
    ? routeOrder.map(id => routeItemsById.get(id)).filter((r): r is RouteItem => r !== undefined)
    : dateSortedItems;

  // Total distance — prefer cumulative from waypoints (includes API distances when available)
  // For round trips, add the return leg (last waypoint → first waypoint)
  const totalDistance = (() => {
    const cumDist = waypoints[waypoints.length - 1]?.cumulativeDistance || 0;
    if (!isRoundTrip || waypoints.length < 2) return cumDist;
    const returnIdx = waypoints.length - 1;
    const returnDist = directionsLegDistances?.[returnIdx]
      ?? haversineFromLatLng(waypoints[returnIdx].coordinates, waypoints[0].coordinates);
    return cumDist + returnDist;
  })();

  // Derived values
  const hasNonStraightLeg = perLegModes.some((m: string) => !isStraightLike(m));
  const startRouteItemId = routeItems.length > 0 ? routeItems[0].id : null;
  const endRouteItemId = routeItems.length > 1 && !isRoundTrip ? routeItems[routeItems.length - 1].id : null;

  // Authentication gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white">
            <div className="flex items-center gap-3">
              <Lock size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">AUTHENTICATION REQUIRED</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              You must be logged in to {isEditMode ? 'edit' : 'create'} expeditions. Please log in or register to plan your journey.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?redirect=' + pathname)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                LOG IN / REGISTER
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-5 border-b-2 border-[#202020] dark:border-[#616161] bg-[#ac6d46] text-white">
            <div className="flex items-center gap-3">
              <MapPin size={22} strokeWidth={2} />
              <h2 className="text-base font-bold">EXPEDITION BUILDER</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
              The expedition builder requires a desktop browser for the best experience with interactive maps, waypoint management, and route planning.
            </p>
            <div className="bg-[#faf6f2] dark:bg-[#2a2520] border border-[#ac6d46]/30 p-4 space-y-2">
              <p className="text-xs font-bold text-[#ac6d46]">IN THE MEANTIME</p>
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Use the <strong className="text-[#202020] dark:text-[#e5e5e5]">quick entry form</strong> to log journal entries from your phone. Each entry you log automatically builds your expedition route on the map.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {isEditMode && expeditionId && (
                <button
                  onClick={() => router.push(`/log-entry/${expeditionId}`)}
                  className="w-full px-5 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-sm"
                >
                  LOG JOURNAL ENTRY
                </button>
              )}
              <button
                onClick={() => router.push(isEditMode && expeditionId ? `/expedition/${expeditionId}` : '/select-expedition')}
                className="w-full px-5 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-sm"
              >
                {isEditMode ? 'VIEW EXPEDITION' : 'GO BACK'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-5 border-b-2 border-[#202020] dark:border-[#616161] bg-[#4676ac] text-white">
            <div className="flex items-center gap-3">
              <Lock size={22} strokeWidth={2} />
              <h2 className="text-base font-bold">EXPLORER PRO FEATURE</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed">
              The expedition builder with interactive maps, waypoint management, and route planning is available to <strong>Explorer Pro</strong> subscribers.
            </p>
            <div className="bg-[#faf6f2] dark:bg-[#2a2520] border border-[#ac6d46]/30 p-4 space-y-2">
              <p className="text-xs font-bold text-[#ac6d46]">YOU CAN STILL</p>
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Use the <strong className="text-[#202020] dark:text-[#e5e5e5]">quick entry form</strong> to log journal entries and edit expedition details. Each entry you log automatically builds your expedition route on the map.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {isEditMode && expeditionId && (
                <button
                  onClick={() => router.push(`/log-entry/${expeditionId}`)}
                  className="w-full px-5 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-sm"
                >
                  LOG JOURNAL ENTRY
                </button>
              )}
              <button
                onClick={() => router.push(isEditMode && expeditionId ? `/expedition/${expeditionId}` : '/select-expedition')}
                className="w-full px-5 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-sm"
              >
                {isEditMode ? 'VIEW EXPEDITION' : 'GO BACK'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state in edit mode
  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8 text-center">
          <div className="text-[#616161] dark:text-[#b5bcc4] font-mono">
            Loading expedition data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 text-xs text-[#b5bcc4] font-mono">
        <Link href="/" className="hover:text-[#ac6d46]">HOME</Link>
        {' > '}
        {isEditMode ? (
          <>
            <Link href={`/expedition/${expeditionId}`} className="hover:text-[#ac6d46]">{expeditionData.title || (canCreateBlueprints ? 'BLUEPRINT' : 'EXPEDITION')}</Link>
            {' > '}
            <span className="text-[#e5e5e5]">EDIT DETAILS & WAYPOINTS</span>
          </>
        ) : canCreateBlueprints ? (
          <>
            <Link href={`/explorer/${user?.username}`} className="hover:text-[#ac6d46]">MY PORTFOLIO</Link>
            {' > '}
            <span className="text-[#e5e5e5]">CREATE NEW BLUEPRINT</span>
          </>
        ) : (
          <>
            <Link href="/select-expedition" className="hover:text-[#ac6d46]">SELECT EXPEDITION</Link>
            {' > '}
            <span className="text-[#e5e5e5]">CREATE NEW EXPEDITION</span>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-bold dark:text-[#e5e5e5]">
              EXPEDITION BUILDER
            </h1>
            {canCreateBlueprints && (
              <span className="px-2 py-1 text-xs font-bold rounded-full bg-[#598636] text-white">BLUEPRINT</span>
            )}
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${isEditMode ? 'bg-[#4676ac] text-white' : 'bg-[#ac6d46] text-white'}`}>
              {isEditMode ? 'EDIT' : (draftId ? 'DRAFT' : 'CREATE')}
            </span>
            <div className="hidden md:block h-6 w-px bg-[#616161]" />
            <span className="hidden md:block text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
              {user?.username || 'explorer'} • {formatDateTime(new Date())}
            </span>
          </div>
          
          {/* Statistics - Responsive */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-medium text-[#ac6d46]">{waypointCount}</div>
              <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Waypoints</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-medium text-[#4676ac]">{formatDistance(totalDistance, 1)}</div>
              <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Total Distance</div>
            </div>
            {totalTravelTime > 0 && perLegModes.some(m => !isStraightLike(m)) && (
              <div className="text-center">
                <div className="text-xl md:text-2xl font-medium text-[#616161] dark:text-[#e5e5e5]">{formatTravelTime(totalTravelTime)}</div>
                <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Travel Time</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Draft Recovery Banner */}
      {showDraftPrompt && existingDraft && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold dark:text-[#e5e5e5] mb-1">
                UNSAVED DRAFT FOUND
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                &quot;{existingDraft.title || 'Untitled'}&quot; — last modified {existingDraft.updatedAt ? formatDateTime(new Date(existingDraft.updatedAt)) : 'recently'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadDraft(existingDraft)}
                className="px-5 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] text-xs"
              >
                CONTINUE DRAFT
              </button>
              <button
                onClick={handleStartFresh}
                className="px-5 py-2 border-2 border-[#994040] text-[#994040] font-bold hover:bg-[#994040] hover:text-white transition-all active:scale-[0.98] text-xs"
              >
                DELETE & START FRESH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed expedition banner */}
      {isCompletedExpedition && isEditMode && (
        <div className="bg-white dark:bg-[#202020] border-2 border-b-0 border-[#202020] dark:border-[#616161] p-4 flex items-start gap-3">
          <div className="w-6 h-6 flex-shrink-0 bg-[#4676ac] flex items-center justify-center mt-0.5">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">COMPLETED EXPEDITION</h4>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
              This expedition is completed. You can still edit the title, description, cover image, waypoints, and route. Dates, visibility, and sponsorship settings are locked.
            </p>
          </div>
        </div>
      )}

      {/* Expedition Identity Section */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              EXPEDITION TITLE <span className="text-[#ac6d46]">*REQUIRED</span>
            </label>
            <input
              type="text"
              value={expeditionData.title}
              onChange={(e) => setExpeditionData({ ...expeditionData, title: e.target.value })}
              placeholder="e.g., Trans-Siberian Railway Journey"
              maxLength={100}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161]"
            />
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
              Clear, descriptive title for this expedition • Will appear in your journal and public listings
            </p>
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              REGION <span className="text-[#ac6d46]">*REQUIRED</span>
            </label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !expeditionData.regions.includes(e.target.value)) {
                  setExpeditionData(prev => ({ ...prev, regions: [...prev.regions, e.target.value] }));
                }
              }}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
            >
              <option value="">{expeditionData.regions.length > 0 ? '+ Add another region' : '-- Select region --'}</option>
              {GEO_REGION_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.regions.filter(r => !expeditionData.regions.includes(r)).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {expeditionData.regions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {expeditionData.regions.map(r => (
                  <span key={r} className="inline-flex items-center gap-1 px-2 py-1 bg-[#ac6d46] text-white text-xs font-bold">
                    {r}
                    <button type="button" onClick={() => setExpeditionData(prev => ({ ...prev, regions: prev.regions.filter(v => v !== r) }))} className="hover:text-white/70">×</button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
              UN geographic sub-region • Select multiple for cross-region expeditions
            </p>
          </div>


          {/* Type selector - shown for all users */}
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              TYPE
              <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
            </label>
            <select
              value={expeditionMode}
              onChange={(e) => setExpeditionMode(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
            >
              <option value="">Select type...</option>
              <option value="hike">Hike</option>
              <option value="paddle">Paddle</option>
              <option value="bike">Bike</option>
              <option value="sail">Sail</option>
              <option value="drive">Drive</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>

          {/* Vessel & Passage — shown for sail expeditions only, spans full width */}
          {expeditionMode === 'sail' && (
            <div className="md:col-span-2 border-2 border-[#4676ac] p-4 space-y-4">
              <div className="text-xs font-bold dark:text-[#e5e5e5]">VESSEL & PASSAGE</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">VESSEL NAME</label>
                  <input
                    type="text"
                    value={vesselName}
                    onChange={(e) => setVesselName(e.target.value)}
                    placeholder="e.g. SV Wanderer"
                    maxLength={100}
                    className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#4676ac] outline-none text-sm dark:text-[#e5e5e5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">VESSEL TYPE</label>
                  <select
                    value={vesselType}
                    onChange={(e) => setVesselType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#4676ac] outline-none text-sm dark:text-[#e5e5e5]"
                  >
                    <option value="">Select...</option>
                    <option value="monohull">Monohull</option>
                    <option value="catamaran">Catamaran</option>
                    <option value="trimaran">Trimaran</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">LENGTH (m)</label>
                  <input
                    type="number"
                    value={vesselLengthM}
                    onChange={(e) => setVesselLengthM(e.target.value)}
                    step="0.1"
                    min={0}
                    max={500}
                    className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#4676ac] outline-none text-sm dark:text-[#e5e5e5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">DRAFT (m)</label>
                  <input
                    type="number"
                    value={vesselDraftM}
                    onChange={(e) => setVesselDraftM(e.target.value)}
                    step="0.1"
                    min={0}
                    max={50}
                    className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#4676ac] outline-none text-sm dark:text-[#e5e5e5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">CREW SIZE</label>
                  <input
                    type="number"
                    value={vesselCrewSize}
                    onChange={(e) => setVesselCrewSize(e.target.value)}
                    min={1}
                    max={999}
                    className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#4676ac] outline-none text-sm dark:text-[#e5e5e5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                    AVG SPEED ({unit === 'nm' ? 'kn' : unit === 'km' ? 'km/h' : 'mph'})
                  </label>
                  <input
                    type="number"
                    value={passageSpeedKn}
                    onChange={(e) => {
                      setPassageSpeedKn(e.target.value);
                      setDurationManuallyEdited(false);
                    }}
                    step="0.5"
                    min={0.5}
                    max={50}
                    className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#4676ac] outline-none text-sm dark:text-[#e5e5e5]"
                  />
                </div>
              </div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Average speed is used to estimate passage time. Default: 6 kn for sailing.
              </p>
            </div>
          )}

          {/* Start Date - hidden for guide/blueprint accounts */}
          {!canCreateBlueprints && (
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              START DATE <span className="text-[#ac6d46]">*</span>
              {(status === 'active' || isCompletedExpedition || status === 'cancelled') && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span>}
            </label>
            <DatePicker
              value={expeditionData.startDate}
              onChange={handleStartDateChange}
              max={expeditionData.endDate || undefined}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
              disabled={status === 'active' || isCompletedExpedition || status === 'cancelled'}
            />
            {/* Delay indicator */}
            {originalStartDate && expeditionData.startDate > originalStartDate && (
              <div className="mt-1.5 px-2.5 py-1.5 bg-[#ac6d46]/10 border border-[#ac6d46] text-xs font-mono text-[#ac6d46]">
                <span className="font-bold">DELAYED</span> — originally {new Date(originalStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                <span className="block mt-0.5 text-[#616161] dark:text-[#b5bcc4]">
                  Delays up to 3 months are allowed. Sponsors and followers will be notified.
                </span>
              </div>
            )}
            {/* Auto-activation hint */}
            {isEditMode && status === 'active' && serverStatus === 'planned' && (
              <div className="mt-1.5 px-2.5 py-1.5 bg-[#598636]/10 border border-[#598636] text-xs font-mono text-[#598636]">
                Start date is today or earlier — expedition will be activated on save.
              </div>
            )}
          </div>
          )}

          {/* End Date / Duration - hidden for guide/blueprint accounts */}
          {!canCreateBlueprints && (
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              END DATE <span className="text-[#ac6d46]">*</span>
              {isCompletedExpedition ? (
                <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span>
              ) : (
                <span className="text-[#616161] dark:text-[#b5bcc4] ml-2 font-medium">or duration in days</span>
              )}
            </label>
            <div className="grid grid-cols-[1fr_auto_80px] gap-2 items-center">
              <DatePicker
                value={expeditionData.endDate}
                onChange={handleEndDateChange}
                min={expeditionData.startDate || undefined}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                disabled={isCompletedExpedition}
              />
              <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-bold">OR</span>
              <input
                type="number"
                value={expectedDuration}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
                placeholder="Days"
                disabled={isCompletedExpedition}
              />
            </div>
          </div>
          )}

          {/* Status - auto-computed from dates */}
          {!canCreateBlueprints && (
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              STATUS (AUTO-COMPUTED)
            </label>
            <div className="px-3 py-2.5 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#2a2a2a] text-sm font-bold dark:text-[#e5e5e5] uppercase">
              {status}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mt-6">
        <div className="p-4 md:p-6 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm md:text-base font-bold dark:text-[#e5e5e5]">ROUTE PLANNING MAP</h2>
              <p className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                Click map to add waypoints • First point is start (copper), last point is end (blue)
              </p>
            </div>

            {/* Route Type Legend */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold dark:text-[#e5e5e5] whitespace-nowrap">ROUTE MODES:</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {Object.entries(ROUTE_MODE_STYLES).map(([mode, style]) => (
                    <div key={mode} className="flex items-center gap-1">
                      <svg width="16" height="4" className="flex-shrink-0">
                        <line x1="0" y1="2" x2="16" y2="2" stroke={style.color} strokeWidth={2}
                          strokeDasharray={style.dash ? style.dash.join(' ') : 'none'} />
                      </svg>
                      <span className="text-[10px] font-semibold" style={{ color: style.color }}>{style.label}</span>
                      {!isStraightLike(mode) && !isPro && <Lock size={8} className="text-[#ac6d46]" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-1">
                Default route mode is set by expedition type — select a route leg in the sidebar to change
              </div>
            </div>
          </div>

          {/* Directions error message */}
          {directionsError && (
            <div className="mt-2 px-3 py-2 bg-[#fff8dc] dark:bg-[#3a2f1f] border border-[#ac6d46] text-xs text-[#ac6d46] font-bold flex items-center gap-2">
              <Info size={14} className="flex-shrink-0" />
              {directionsError} — showing straight-line fallback
            </div>
          )}

          {/* Inaccessible waypoint warnings */}
          {directionsWarnings.length > 0 && (
            <div className="mt-2 px-3 py-2 bg-[#fff8dc] dark:bg-[#3a2f1f] border border-[#ac6d46] text-xs text-[#ac6d46]">
              <div className="font-bold flex items-center gap-2 mb-1">
                <Info size={14} className="flex-shrink-0" />
                {directionsWarnings.length === 1 ? '1 waypoint' : `${directionsWarnings.length} waypoints`} may be inaccessible
              </div>
              <ul className="ml-5 space-y-0.5 list-disc">
                {directionsWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Waterway obstacle warnings */}
          {waterwayObstacles.length > 0 && (
            <div className="mt-2 px-3 py-2 bg-[#fdf2f2] dark:bg-[#3a1f1f] border border-[#994040] text-xs text-[#994040]">
              <div className="font-bold flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="flex-shrink-0" />
                {waterwayObstacles.length === 1 ? '1 obstacle' : `${waterwayObstacles.length} obstacles`} detected on route
              </div>
              <ul className="ml-5 space-y-0.5 list-disc">
                {waterwayObstacles.map((obs, i) => (
                  <li key={i}>
                    {obs.type.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                    {obs.name ? ` — ${obs.name}` : ''}
                  </li>
                ))}
              </ul>
              <div className="mt-1 text-[10px] opacity-75">
                Portage may be required — consider splitting into water/walking legs
              </div>
            </div>
          )}
        </div>
        {/* Dual Panel Layout - Responsive */}
        <div className="flex flex-col lg:flex-row h-[600px] lg:h-[700px]">
          {/* Map Panel */}
          <div className="relative lg:flex-1 h-[400px] lg:h-full">
            <div 
              ref={mapContainer} 
              className="absolute inset-0 w-full h-full bg-[#b5bcc4]"
              style={{ width: '100%', height: '100%' }}
            />

            {/* Map Action Buttons */}
            {!mapError && waypoints.length > 0 && (
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button
                  onClick={handleResetMapView}
                  className="p-2 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all"
                  aria-label="Reset map view to show all waypoints"
                  title="Reset view to show all waypoints"
                >
                  <Locate size={20} />
                </button>
                {perLegModes.some(m => !isStraightLike(m)) && (
                  <button
                    onClick={() => {
                      legCacheRef.current = [];
                      const currentWp = waypointsRef.current;
                      const modes = [...perLegModesRef.current];
                      const modeStr = modes.length > 0 ? modes.join(',') : routeMode;
                      lastDirectionsCoordsRef.current = currentWp.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|')
                        + `::${modeStr}::${isRoundTripRef.current}::${waterwayProfileRef.current}`;
                      fetchMixedRoute(currentWp, modes as RouteMode[]);
                    }}
                    disabled={directionsLoading}
                    className="p-2 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all disabled:opacity-50"
                    aria-label="Recalculate all routes"
                    title="Recalculate all routes"
                  >
                    <RotateCw size={20} className={directionsLoading ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
            )}

            {/* Map Error Overlay */}
            {mapError && (
              <div className="absolute inset-0 bg-white dark:bg-[#202020] flex items-center justify-center p-4 md:p-8 overflow-auto">
                <div className="max-w-2xl bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#ac6d46] p-4 md:p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <Info className="w-6 h-6 md:w-8 md:h-8 text-[#ac6d46] flex-shrink-0" />
                    <div>
                      <h3 className="text-base md:text-lg font-bold dark:text-[#e5e5e5] mb-2">MAPBOX TOKEN REQUIRED</h3>
                      <p className="text-xs md:text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                        {mapError}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#202020] p-3 md:p-4 border-l-2 border-[#4676ac] mb-6">
                    <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">HOW TO ADD YOUR MAPBOX TOKEN:</div>
                    <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
                      <div>1. Visit <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-[#4676ac] hover:underline break-all">https://account.mapbox.com/access-tokens/</a></div>
                      <div>2. Create a free Mapbox account if you don't have one</div>
                      <div>3. Copy your default public token or create a new one</div>
                      <div>4. Open <code className="bg-[#e5e5e5] dark:bg-[#2a2a2a] px-1 text-[#ac6d46]">/src/app/pages/ExpeditionBuilderPage.tsx</code></div>
                      <div>5. Replace <code className="bg-[#e5e5e5] dark:bg-[#2a2a2a] px-1 text-[#ac6d46]">YOUR_MAPBOX_TOKEN_HERE</code> with your actual token</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] p-3 md:p-4 mb-4">
                    <div className="text-xs md:text-xs font-mono text-[#616161] dark:text-[#b5bcc4] break-all">
                      <div className="text-[#ac6d46] mb-1">{"// Line 31 in ExpeditionBuilderPage.tsx:"}</div>
                      <div>const MAPBOX_TOKEN = '<span className="text-[#4676ac]">pk.YOUR_TOKEN_HERE</span>';</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/expedition-quick-entry"
                      className="flex-1 px-4 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs md:text-sm font-bold text-center"
                    >
                      USE QUICK ENTRY INSTEAD
                    </Link>
                    <Link
                      href={isEditMode ? `/expedition/${expeditionId}` : '/select-expedition'}
                      className="flex-1 px-4 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs md:text-sm font-bold text-center"
                    >
                      {isEditMode ? 'BACK TO EXPEDITION' : 'BACK TO SELECTION'}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Map Instructions Overlay */}
            {!mapError && waypoints.length === 0 && showInstructions && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 dark:bg-[#202020]/95 p-6 md:p-8 border-2 border-[#ac6d46] max-w-md mx-4">
                <div className="text-center">
                  <MapPin className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-[#ac6d46]" />
                  <h3 className="text-base md:text-lg font-bold dark:text-[#e5e5e5] mb-2">BUILD YOUR EXPEDITION</h3>
                  <p className="text-xs md:text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                    Click anywhere on the map to add waypoints and plan your route
                  </p>
                  <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4] text-left space-y-2 border-t border-[#b5bcc4] dark:border-[#616161] pt-4">
                    <div>• First click creates your <span className="text-[#ac6d46] font-bold">START POINT</span></div>
                    <div>• Additional clicks add waypoints along your route</div>
                    <div>• Set route type per leg in the sidebar route cards</div>
                    <div>• Configure details in the waypoints panel</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Waypoint Edit Overlay - Centered on Map */}
            {selectedWaypointData && (
              <>
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-[#202020]/50 z-20"
                  onClick={() => { setSelectedWaypoint(null); setConfirmingDelete(null); }}
                />

                {/* Edit Panel - Landscape Layout */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[900px] bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] z-30 max-h-[85vh] overflow-y-auto">
                  <div className={`${selectedWaypointData.entryIds.length > 0 ? 'bg-[#ac6d46]' : 'bg-[#616161] dark:bg-[#3a3a3a]'} text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between`}>
                    <h3 className="text-sm font-bold">{selectedWaypointData.entryIds.length > 0 ? 'ENTRY WAYPOINT' : 'EDIT WAYPOINT'}</h3>
                    <button
                      onClick={() => { setSelectedWaypoint(null); setConfirmingDelete(null); }}
                      className="text-white hover:text-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Reorder notification */}
                    {reorderNotice && (
                      <div className="mb-4 p-3 bg-[#fff8dc] dark:bg-[#3a2f1f] border-2 border-[#ac6d46] text-xs font-bold text-[#ac6d46] flex items-center gap-2">
                        <Info size={14} className="flex-shrink-0" />
                        {reorderNotice}
                      </div>
                    )}
                    {/* Two-column layout for landscape orientation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-3">
                        {/* Name */}
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            NAME {selectedWaypointData.entryIds.length === 0 && <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">({(selectedWaypointData.name || '').length}/100)</span>}
                          </label>
                          {selectedWaypointData.entryIds.length > 0 ? (
                            <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#b5bcc4] dark:border-[#616161] px-3 py-2 text-sm dark:text-[#e5e5e5]">
                              {selectedWaypointData.name || '—'}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={selectedWaypointData.name || ''}
                              onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { name: e.target.value })}
                              maxLength={100}
                              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                              placeholder="e.g., Mountain Pass Summit"
                            />
                          )}
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            {selectedWaypointData.entryIds.length > 0
                              ? 'Edit this entry to change its details'
                              : 'Min 3 • Max 100 characters'}
                          </p>
                        </div>

                        {/* Location */}
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            LOCATION {selectedWaypointData.entryIds.length === 0 && <><span className="text-[#616161] dark:text-[#b5bcc4]">(Optional)</span> <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">({(selectedWaypointData.location || '').length}/150)</span></>}
                          </label>
                          {selectedWaypointData.entryIds.length > 0 ? (
                            <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#b5bcc4] dark:border-[#616161] px-3 py-2 text-sm dark:text-[#e5e5e5]">
                              {selectedWaypointData.location || '—'}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={selectedWaypointData.location || ''}
                              onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { location: e.target.value })}
                              maxLength={150}
                              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                              placeholder="e.g., Near Almaty, Kazakhstan"
                            />
                          )}
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            {selectedWaypointData.entryIds.length > 0
                              ? 'Locked — edit this entry to change location'
                              : 'Max 150 characters • City, region, or landmark name'}
                          </p>
                        </div>

                        {/* Date — hidden for blueprint builders */}
                        {!canCreateBlueprints && (
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            DATE
                          </label>
                          {selectedWaypointData.entryIds.length > 0 ? (
                            <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#b5bcc4] dark:border-[#616161] px-3 py-2 text-sm dark:text-[#e5e5e5]">
                              {selectedWaypointData.date || '—'}
                            </div>
                          ) : (
                            <div className="relative">
                            {(() => {
                              // Compute min/max from neighboring waypoint dates
                              const wpIdx = waypoints.findIndex(w => w.id === selectedWaypoint);
                              let dateMin = expeditionData.startDate;
                              let dateMax = expeditionData.endDate;
                              // Find previous dated waypoint
                              for (let i = wpIdx - 1; i >= 0; i--) {
                                if (waypoints[i].date) { dateMin = waypoints[i].date; break; }
                              }
                              // Find next dated waypoint
                              for (let i = wpIdx + 1; i < waypoints.length; i++) {
                                if (waypoints[i].date) { dateMax = waypoints[i].date; break; }
                              }

                              return (
                                <DatePicker
                                  value={selectedWaypointData.date || ''}
                                  onChange={(val) => handleUpdateWaypoint(selectedWaypoint!, { date: val })}
                                  min={dateMin || expeditionData.startDate || undefined}
                                  max={dateMax || expeditionData.endDate || undefined}
                                  className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                                />
                              );
                            })()}
                            </div>
                          )}
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            {selectedWaypointData.entryIds.length > 0
                              ? 'Locked — edit this entry to change date'
                              : expeditionData.startDate && expeditionData.endDate
                                ? `Must be between ${expeditionData.startDate} and ${expeditionData.endDate}`
                                : 'Waypoints are automatically ordered by date'}
                          </p>
                        </div>
                        )}

                        {/* Coordinates Display */}
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            COORDINATES <span className="text-[#616161] dark:text-[#b5bcc4]">(Set by clicking map)</span>
                          </label>
                          <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#b5bcc4] dark:border-[#616161] px-3 py-2 text-xs font-mono dark:text-[#e5e5e5]">
                            {Math.abs(selectedWaypointData.coordinates.lat).toFixed(6)}°{selectedWaypointData.coordinates.lat >= 0 ? 'N' : 'S'}, {Math.abs(selectedWaypointData.coordinates.lng).toFixed(6)}°{selectedWaypointData.coordinates.lng >= 0 ? 'E' : 'W'}
                          </div>
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            {selectedWaypointData.entryIds.length > 0
                              ? 'Coordinates locked — this waypoint has linked entries'
                              : 'Coordinates are set automatically when you place the marker'}
                          </p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-3">
                        {/* Description */}
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            DESCRIPTION {selectedWaypointData.entryIds.length === 0 && <><span className="text-[#616161] dark:text-[#b5bcc4]">(Optional)</span> <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">({(selectedWaypointData.description || '').length}/{waypointDescriptionMax})</span></>}
                          </label>
                          {selectedWaypointData.entryIds.length > 0 ? (
                            <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#b5bcc4] dark:border-[#616161] px-3 py-2 text-sm dark:text-[#e5e5e5] min-h-[120px]">
                              {selectedWaypointData.description || '—'}
                            </div>
                          ) : (
                            <textarea
                              value={selectedWaypointData.description || ''}
                              onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { description: e.target.value })}
                              maxLength={waypointDescriptionMax}
                              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                              rows={8}
                              placeholder="Add notes about this waypoint..."
                            />
                          )}
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            {selectedWaypointData.entryIds.length > 0
                              ? 'Locked — edit this entry to change description'
                              : `Max ${waypointDescriptionMax.toLocaleString()} characters • Add notes, observations, or details`}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-3 space-y-1 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          <div className="text-[#202020] dark:text-[#e5e5e5] font-bold mb-2 border-b border-[#b5bcc4] dark:border-[#616161] pb-1">WAYPOINT STATISTICS:</div>
                          <div className="flex justify-between">
                            <span>Waypoint Type:</span>
                            <span className="text-[#202020] dark:text-[#e5e5e5] font-bold uppercase">{selectedWaypointData.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sequence:</span>
                            <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{selectedWaypointData.sequence + 1} of {waypoints.length}</span>
                          </div>
                          {typeof selectedWaypointData.elevationM === 'number' && Number.isFinite(selectedWaypointData.elevationM) && (
                            <div className="flex justify-between">
                              <span>Elevation:</span>
                              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">
                                {unit === 'mi'
                                  ? `${Math.round(selectedWaypointData.elevationM * 3.28084).toLocaleString()} ft`
                                  : `${Math.round(selectedWaypointData.elevationM).toLocaleString()} m`}
                              </span>
                            </div>
                          )}
                          {(selectedWaypointData.distanceFromPrevious ?? 0) > 0 && (
                              <div className="flex justify-between">
                                <span>Distance from Previous:</span>
                                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatDistance(selectedWaypointData.distanceFromPrevious!, 1)}</span>
                              </div>
                          )}
                          {selectedWaypointData.travelTimeFromPrevious !== undefined && selectedWaypointData.travelTimeFromPrevious > 0 && (
                            <div className="flex justify-between">
                              <span>Travel Time from Previous:</span>
                              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatTravelTime(selectedWaypointData.travelTimeFromPrevious)}</span>
                            </div>
                          )}
                          {(selectedWaypointData.cumulativeDistance ?? 0) > 0 && (
                              <div className="flex justify-between">
                                <span>Cumulative Distance:</span>
                                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatDistance(selectedWaypointData.cumulativeDistance!, 1)}</span>
                              </div>
                          )}
                          {selectedWaypointData.cumulativeTravelTime !== undefined && selectedWaypointData.cumulativeTravelTime > 0 && (
                            <div className="flex justify-between">
                              <span>Cumulative Travel Time:</span>
                              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatTravelTime(selectedWaypointData.cumulativeTravelTime)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Full Width at Bottom */}
                    <div className="mt-4 pt-4 border-t-2 border-[#b5bcc4] dark:border-[#616161]">
                      {/* Auto-save indicator */}
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3 text-center font-mono">
                        {selectedWaypointData.entryIds.length > 0
                          ? 'This waypoint has linked entries — edit entries to change details'
                          : 'All changes are saved automatically as you edit'}
                      </div>
                      
                      <div className="flex gap-3">
                        {/* Round Trip button - only for start waypoint */}
                        {selectedWaypointData.id === startRouteItemId && waypoints.length > 1 && (
                          <button
                            onClick={() => setIsRoundTrip(!isRoundTrip)}
                            className={`flex-1 px-3 py-2 transition-all text-xs font-bold ${
                              isRoundTrip 
                                ? 'border-2 border-[#4676ac] bg-[#4676ac] text-white' 
                                : 'border-2 border-[#4676ac] text-[#4676ac] hover:bg-[#4676ac] hover:text-white'
                            }`}
                          >
                            {isRoundTrip ? '✓ ROUND TRIP ENABLED' : 'MARK AS ROUND TRIP'}
                          </button>
                        )}

                        {/* Delete Button - not for start waypoint, not for converted waypoints */}
                        {selectedWaypointData.id !== startRouteItemId && selectedWaypointData.entryIds.length === 0 && (
                          <button
                            onClick={() => setConfirmingDelete(selectedWaypoint)}
                            className="flex-1 px-3 py-2 border-2 border-[#616161] dark:border-[#616161] bg-[#616161] dark:bg-[#4a4a4a] text-white hover:bg-[#202020] dark:hover:bg-[#616161] transition-all text-xs font-bold flex items-center justify-center gap-2"
                          >
                            DELETE WAYPOINT
                          </button>
                        )}

                        {/* Done Button */}
                        <button
                          onClick={() => { setSelectedWaypoint(null); setConfirmingDelete(null); }}
                          className="flex-1 px-3 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold flex items-center justify-center gap-2"
                        >
                          DONE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Waypoint Sidebar */}
          <div className="w-full lg:w-[400px] border-t-2 lg:border-t-0 lg:border-l-2 border-[#202020] dark:border-[#616161] flex flex-col h-[200px] lg:h-full">
            {/* Reorder notice in sidebar */}
            {reorderNotice && (
              <div className="p-2.5 bg-[#fff8dc] dark:bg-[#3a2f1f] border-b-2 border-[#ac6d46] text-xs font-bold text-[#ac6d46] flex items-center gap-2">
                <Info size={14} className="flex-shrink-0" />
                <span className="truncate">{reorderNotice}</span>
              </div>
            )}
            {/* Waypoint List */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <div className="px-4 py-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] sticky top-0 z-10 space-y-2">
                  {/* Row 1: title + CLEAR ALL */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold dark:text-[#e5e5e5] whitespace-nowrap">ROUTE ({routeItems.length})</h3>
                    {waypoints.length > 0 && (
                      <button
                        onClick={() => setConfirmingClearAll(true)}
                        className="text-[10px] text-[#ac6d46] hover:text-[#8a5738] font-bold transition-all whitespace-nowrap"
                      >
                        CLEAR ALL
                      </button>
                    )}
                  </div>
                  {/* Row 2: action buttons (wrap on narrow widths) */}
                  <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setShowRouteImportModal(true)}
                        className="px-2.5 py-1 text-[10px] text-white bg-[#598636] hover:bg-[#4a702c] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
                        title="Import a GPX, KML, or GeoJSON route file"
                      >
                        <Upload size={11} />
                        IMPORT ROUTE
                      </button>
                      {waypoints.length >= 2 && (expeditionId || draftId) && (
                        <button
                          onClick={handleExportGpx}
                          disabled={isExportingGpx}
                          className="px-2.5 py-1 text-[10px] text-white bg-[#ac6d46] hover:bg-[#8a5738] disabled:opacity-60 disabled:cursor-not-allowed font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
                          title="Download the route as a GPX file for Gaia, Garmin, Komoot, etc."
                        >
                          {isExportingGpx ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                          EXPORT GPX
                        </button>
                      )}
                      {waypoints.length >= 2 && (
                        <button
                          onClick={() => setShowRouteSearch(true)}
                          className="px-2.5 py-1 text-[10px] text-white bg-[#4676ac] hover:bg-[#365d8a] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
                          title="Find POIs along your route"
                        >
                          <Search size={11} />
                          FIND ALONG ROUTE
                        </button>
                      )}
                    </div>
                  {totalDistance > 0 && (
                    <div className="text-[10px] text-[#4676ac] font-mono">
                      {formatDistance(totalDistance, 1)} total
                      {totalTravelTime > 0 && perLegModes.some(m => !isStraightLike(m)) && (
                        <> • {formatTravelTime(totalTravelTime)}</>
                      )}
                    </div>
                  )}
                </div>

                {/* Route Search Panel */}
                {showRouteSearch && (
                  <div className="border-b-2 border-[#202020] dark:border-[#616161]">
                    <div className="p-3 bg-[#4676ac] text-white flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <Search size={13} />
                        FIND ALONG ROUTE
                      </span>
                      <button
                        onClick={handleCloseRouteSearch}
                        className="text-white hover:text-[#e5e5e5] transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-3 space-y-3 bg-white dark:bg-[#202020]">
                      {/* Category filter input */}
                      <input
                        type="text"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        placeholder="Search all categories..."
                        className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#4676ac] outline-none text-xs dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161]"
                      />

                      {/* Proximity range slider */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wide">Proximity</span>
                          <span className="text-[10px] font-bold text-[#4676ac] font-mono">{routeSearchProximity} min</span>
                        </div>
                        <Slider
                          value={[routeSearchProximity]}
                          min={1}
                          max={30}
                          step={1}
                          className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-[#b5bcc4] [&_[data-slot=slider-track]]:dark:bg-[#616161] [&_[data-slot=slider-range]]:bg-[#4676ac] [&_[data-slot=slider-thumb]]:size-3.5 [&_[data-slot=slider-thumb]]:border-[#4676ac] [&_[data-slot=slider-thumb]]:bg-white"
                          onValueChange={([val]) => setRouteSearchProximity(val)}
                        />
                      </div>

                      {/* Category buttons grid */}
                      <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                        {filteredCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => handleRouteSearch(cat.id)}
                            disabled={routeSearchLoading || (perLegModes.some(m => !isStraightLike(m)) && directionsLoading)}
                            className={`px-2.5 py-1 text-[10px] font-bold border transition-all ${
                              activeCategory === cat.id
                                ? 'bg-[#4676ac] text-white border-[#4676ac]'
                                : 'bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] border-[#b5bcc4] dark:border-[#616161] hover:border-[#4676ac] hover:text-[#4676ac]'
                            } ${routeSearchLoading || (perLegModes.some(m => !isStraightLike(m)) && directionsLoading) ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            {cat.name}
                          </button>
                        ))}
                        {filteredCategories.length === 0 && categoryFilter && (
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] py-2">No categories match &ldquo;{categoryFilter}&rdquo;</p>
                        )}
                        {allCategories.length === 0 && (
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] py-2 flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" />
                            Loading categories...
                          </p>
                        )}
                      </div>

                      {/* Results area */}
                      {(routeSearchLoading || routeSearchResults.length > 0 || activeCategory) && (
                        <div className="border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                          <div className="text-xs font-bold dark:text-[#e5e5e5] mb-2">
                            {routeSearchLoading ? (
                              <span className="flex items-center gap-1.5">
                                <Loader2 size={12} className="animate-spin text-[#4676ac]" />
                                Searching...
                              </span>
                            ) : routeSearchResults.length > 0 ? (
                              `${routeSearchResults.length} result${routeSearchResults.length !== 1 ? 's' : ''}${allRouteResultsRef.current.length > routeSearchResults.length ? ` of ${allRouteResultsRef.current.length}` : ''}`
                            ) : activeCategory ? (
                              'No results found along this route'
                            ) : null}
                          </div>

                          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                            {routeSearchResults.map(poi => (
                              <div
                                key={poi.id}
                                className="p-2.5 border border-[#b5bcc4] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] hover:border-[#4676ac] transition-all cursor-pointer"
                                onClick={() => map.current?.flyTo({ center: [poi.coordinates.lng, poi.coordinates.lat], zoom: 15 })}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold dark:text-[#e5e5e5] truncate">{poi.name}</div>
                                    {poi.address && (
                                      <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] truncate mt-0.5">{poi.address}</div>
                                    )}
                                    {poi.distanceFromRoute != null && (
                                      <div className="text-[10px] text-[#4676ac] font-mono mt-0.5">
                                        ~{poi.distanceFromRoute < 1000
                                          ? `${Math.round(poi.distanceFromRoute)}m`
                                          : `${(poi.distanceFromRoute / 1000).toFixed(1)}km`
                                        } from route
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleAddPOIAsWaypoint(poi); }}
                                    className="flex-shrink-0 p-1.5 text-[#4676ac] hover:bg-[#4676ac] hover:text-white border border-[#4676ac] transition-all"
                                    title={`Add ${poi.name} as waypoint`}
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {routeItems.length === 0 ? (
                  <div className="p-6 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-[#b5bcc4]" />
                    <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-1">No waypoints or entries yet</p>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Click on the map to add your first waypoint
                    </p>
                  </div>
                ) : (
                  <div>
                    {routeItems.map((item, routeIdx) => {
                      const isStart = item.id === startRouteItemId;
                      const isEnd = item.id === endRouteItemId;
                      const positionNumber = routeIdx + 1;

                      if (item.kind === 'waypoint') {
                        const { waypoint, wpIdx } = item;
                        const justMoved = movedWaypointId === waypoint.id;
                        const canUp = routeItems.length > 1 && canMoveRouteItem(waypoint.id, 'up');
                        const canDown = routeItems.length > 1 && canMoveRouteItem(waypoint.id, 'down');

                        return (
                          <div key={`wp-${waypoint.id}`}>
                            <div
                              onClick={() => setSelectedWaypoint(waypoint.id)}
                              className={`p-3 transition-colors duration-300 cursor-pointer ${
                                justMoved
                                  ? 'bg-[#ac6d46]/15 dark:bg-[#ac6d46]/20 ring-1 ring-inset ring-[#ac6d46]/40'
                                  : selectedWaypoint === waypoint.id
                                    ? 'bg-[#fff8dc] dark:bg-[#3a2f1f]'
                                    : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {routeItems.length > 1 && (
                                  <div className="flex flex-col items-center flex-shrink-0 pt-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleMoveRouteItem(waypoint.id, 'up'); }}
                                      disabled={!canUp}
                                      className={`p-0.5 rounded transition-all ${canUp ? 'text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] hover:bg-[#ac6d46]/10' : 'text-[#e5e5e5] dark:text-[#3a3a3a] cursor-default'}`}
                                      title="Move up"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleMoveRouteItem(waypoint.id, 'down'); }}
                                      disabled={!canDown}
                                      className={`p-0.5 rounded transition-all ${canDown ? 'text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] hover:bg-[#ac6d46]/10' : 'text-[#e5e5e5] dark:text-[#3a3a3a] cursor-default'}`}
                                      title="Move down"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                )}

                                {/* Marker Badge — circle for converted, diamond for unconverted */}
                                {waypoint.entryIds.length > 0 ? (
                                  <div
                                    className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                    style={{
                                      width: waypoint.entryIds.length > 1 ? '32px' : '28px',
                                      height: waypoint.entryIds.length > 1 ? '32px' : '28px',
                                      fontSize: '12px',
                                      backgroundColor: waypoint.entryIds.length > 1 ? '#8a5738' : '#ac6d46',
                                      border: '2px solid white',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                    }}
                                  >
                                    {waypoint.entryIds.length > 1 ? waypoint.entryIds.length : positionNumber}
                                  </div>
                                ) : isStart || isEnd ? (
                                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                                    <div
                                      className="flex items-center justify-center text-white font-bold"
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        transform: 'rotate(45deg)',
                                        backgroundColor: isStart ? '#ac6d46' : '#4676ac',
                                        border: isStart && isRoundTrip ? '2px solid #4676ac' : '2px solid white',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                      }}
                                    >
                                      <span style={{ transform: 'rotate(-45deg)', fontSize: '12px', lineHeight: '1' }}>
                                        {isStart ? 'S' : 'E'}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                    style={{
                                      width: '22px',
                                      height: '22px',
                                      fontSize: '10px',
                                      backgroundColor: '#616161',
                                      border: '2px solid white',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                    }}
                                  >
                                    {positionNumber}
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5] truncate flex items-center gap-2">
                                    <span className="truncate">{waypoint.name || `Waypoint ${wpIdx + 1}`}</span>
                                    {waypoint.entryIds.length > 0 && (
                                      <span className="ml-auto px-1.5 py-0.5 bg-[#ac6d46]/15 text-[#ac6d46] text-[10px] font-bold border border-[#ac6d46]/30 flex-shrink-0">
                                        {waypoint.entryIds.length === 1 ? 'ENTRY' : `${waypoint.entryIds.length} ENTRIES`}
                                      </span>
                                    )}
                                  </div>
                                  {waypoint.location && (
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] truncate mb-1">
                                      {waypoint.location}
                                    </div>
                                  )}
                                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono space-y-0.5">
                                    <div className="truncate">
                                      {Math.abs(waypoint.coordinates.lat).toFixed(4)}°{waypoint.coordinates.lat >= 0 ? 'N' : 'S'}, {Math.abs(waypoint.coordinates.lng).toFixed(4)}°{waypoint.coordinates.lng >= 0 ? 'E' : 'W'}
                                      {typeof waypoint.elevationM === 'number' && Number.isFinite(waypoint.elevationM) && (
                                        <> · {unit === 'mi'
                                          ? `${Math.round(waypoint.elevationM * 3.28084).toLocaleString()} ft`
                                          : `${Math.round(waypoint.elevationM).toLocaleString()} m`}</>
                                      )}
                                    </div>
                                    {!canCreateBlueprints && waypoint.date && (
                                      <div className="text-[#ac6d46]">{waypoint.date}</div>
                                    )}
                                  </div>
                                </div>

                                {waypoint.entryIds.length === 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmingDelete(waypoint.id);
                                    }}
                                    className="text-[#ac6d46] hover:text-[#8a5738] transition-all flex-shrink-0"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Route Leg Card — shows route type between this item and the next in sidebar */}
                            {(() => {
                              // Determine visibility from SIDEBAR position, not waypoints-array index
                              const isLastInSidebar = routeIdx === routeItems.length - 1;
                              if (isLastInSidebar && !isRoundTrip) return <div className="h-px bg-[#202020] dark:bg-[#616161]" />;

                              // Use route-order position for leg index, not waypoints-array index
                              const wpRouteIdx = waypoints.findIndex(w => w.id === waypoint.id);
                              const legIdx = wpRouteIdx >= 0 ? wpRouteIdx : wpIdx;
                              const numLegs = isRoundTrip ? waypoints.length : waypoints.length - 1;
                              const hasRoutingLeg = legIdx < numLegs;
                              const legMode = hasRoutingLeg ? (perLegModes[legIdx] || 'straight') : 'straight';
                              const legStyle = ROUTE_MODE_STYLES[legMode] || ROUTE_MODE_STYLES.straight;
                              const legDur = hasRoutingLeg ? (directionsLegDurations?.[legIdx] ?? null) : null;
                              const isLegExpanded = hasRoutingLeg && expandedLegCard === legIdx;

                              // Use waypoint distances so leg + cumulative are consistent
                              const isReturnLeg = isRoundTrip && legIdx === waypoints.length - 1;
                              let displayDist: number;
                              let cumDist: number;
                              if (isReturnLeg) {
                                // Round-trip return leg — not stored on any waypoint
                                const fallback = haversineFromLatLng(waypoint.coordinates, waypoints[0].coordinates);
                                displayDist = directionsLegDistances?.[legIdx] ?? fallback;
                                cumDist = (waypoint.cumulativeDistance ?? 0) + displayDist;
                              } else {
                                const nextWp = waypoints[legIdx + 1];
                                displayDist = nextWp?.distanceFromPrevious ?? 0;
                                cumDist = nextWp?.cumulativeDistance ?? 0;
                              }

                              return (
                                <>
                                  <div
                                    onClick={() => hasRoutingLeg ? setExpandedLegCard(isLegExpanded ? null : legIdx) : undefined}
                                    className={`px-4 py-1.5 bg-[#f5f5f5] dark:bg-[#1a1a1a] transition-all border-y border-[#b5bcc4]/50 dark:border-[#616161]/50 ${
                                      hasRoutingLeg ? 'cursor-pointer hover:bg-[#eee] dark:hover:bg-[#252525]' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <svg width="20" height="4" className="flex-shrink-0">
                                        <line x1="0" y1="2" x2="20" y2="2" stroke={legStyle.color} strokeWidth={2}
                                          strokeDasharray={legStyle.dash ? legStyle.dash.join(' ') : undefined} />
                                      </svg>
                                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: legStyle.color }}>
                                        {legStyle.label}
                                        {legMode === 'waterway' && waterwayFlowDirection && (
                                          <span className="ml-1 font-normal opacity-80">
                                            {waterwayFlowDirection === 'downstream' ? '↓' : waterwayFlowDirection === 'upstream' ? '↑' : '↕'}
                                            {' '}{waterwayFlowDirection}
                                          </span>
                                        )}
                                      </span>
                                      {displayDist > 0 && (
                                        <span className="text-[10px] text-[#4676ac] font-mono ml-auto">
                                          {formatDistance(displayDist, 1)}
                                          {legDur ? ` (${formatTravelTime(legDur)})` : ''}
                                          {cumDist > 0 && <> · {formatDistance(cumDist, 1)} total</>}
                                        </span>
                                      )}
                                      {directionsLoading && !isStraightLike(legMode) && (
                                        <div className="flex items-center gap-1 ml-auto">
                                          <Loader2 size={10} className="animate-spin text-[#ac6d46]" />
                                          {directionsProgress && legMode === 'waterway' && (
                                            <span className="text-[9px] text-[#ac6d46]">{directionsProgress}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {isLegExpanded && (
                                    <div className="px-4 py-2 bg-white dark:bg-[#202020] border-b border-[#b5bcc4]/50 dark:border-[#616161]/50">
                                      <div className="text-[10px] font-bold text-[#616161] dark:text-[#b5bcc4] uppercase tracking-wider mb-2">
                                        LEG {legIdx + 1} ROUTE TYPE
                                      </div>
                                      <div className="grid grid-cols-3 gap-1.5">
                                        {(['straight', 'passage', 'walking', 'cycling', 'driving', 'trail', 'waterway'] as RouteMode[]).map(mode => {
                                          const mStyle = ROUTE_MODE_STYLES[mode];
                                          const isActive = legMode === mode;
                                          const disabled = !isStraightLike(mode) && !isPro;
                                          return (
                                            <button
                                              key={mode}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!disabled && mode !== legMode) {
                                                  handleLegModeChangeRef.current(legIdx, mode);
                                                  setExpandedLegCard(null);
                                                }
                                              }}
                                              disabled={disabled}
                                              className={`px-2 py-1.5 text-[10px] font-bold border-2 transition-all ${
                                                disabled ? 'opacity-40 cursor-not-allowed' : ''
                                              }`}
                                              style={{
                                                borderColor: mStyle.color,
                                                backgroundColor: isActive ? mStyle.color : 'transparent',
                                                color: isActive ? 'white' : mStyle.color,
                                              }}
                                            >
                                              {isStraightLike(mode) ? (mode === 'passage' ? 'Passage' : 'Line') : mStyle.label}
                                              {disabled && <Lock size={8} className="inline ml-0.5 -mt-0.5" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {legMode === 'waterway' && (
                                        <div className="mt-2 flex gap-1.5">
                                          {(['paddle', 'motor'] as WaterwayProfile[]).map(p => (
                                            <button
                                              key={p}
                                              onClick={() => setWaterwayProfile(p)}
                                              className={`px-2 py-1 text-[10px] font-bold border transition-all ${
                                                waterwayProfile === p
                                                  ? 'bg-[#4676ac] text-white border-[#4676ac]'
                                                  : 'text-[#4676ac] border-[#4676ac] hover:bg-[#4676ac]/10'
                                              }`}
                                            >
                                              {p === 'paddle' ? 'Paddle' : 'Motor'}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        );
                      } else {
                        // Entry row
                        const { entry } = item;
                        const justMoved = movedWaypointId === entry.id;
                        const canUp = routeItems.length > 1 && canMoveRouteItem(entry.id, 'up');
                        const canDown = routeItems.length > 1 && canMoveRouteItem(entry.id, 'down');

                        return (
                          <div key={`entry-${entry.id}`}>
                            <div
                              onClick={() => map.current?.flyTo({ center: [entry.coords.lng, entry.coords.lat], zoom: 14 })}
                              className={`p-3 cursor-pointer transition-colors duration-300 ${
                                justMoved
                                  ? 'bg-[#ac6d46]/15 dark:bg-[#ac6d46]/20 ring-1 ring-inset ring-[#ac6d46]/40'
                                  : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {/* Move buttons */}
                                {routeItems.length > 1 && (
                                  <div className="flex flex-col items-center flex-shrink-0 pt-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleMoveRouteItem(entry.id, 'up'); }}
                                      disabled={!canUp}
                                      className={`p-0.5 rounded transition-all ${canUp ? 'text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] hover:bg-[#ac6d46]/10' : 'text-[#e5e5e5] dark:text-[#3a3a3a] cursor-default'}`}
                                      title="Move up"
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleMoveRouteItem(entry.id, 'down'); }}
                                      disabled={!canDown}
                                      className={`p-0.5 rounded transition-all ${canDown ? 'text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] hover:bg-[#ac6d46]/10' : 'text-[#e5e5e5] dark:text-[#3a3a3a] cursor-default'}`}
                                      title="Move down"
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                )}

                                {/* Entry badge — S/E diamond or circle */}
                                {isStart || isEnd ? (
                                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                                    <div
                                      className="flex items-center justify-center text-white font-bold"
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        transform: 'rotate(45deg)',
                                        backgroundColor: isStart ? '#ac6d46' : '#4676ac',
                                        border: '2px solid white',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                      }}
                                    >
                                      <span style={{ transform: 'rotate(-45deg)', fontSize: '12px', lineHeight: '1' }}>
                                        {isStart ? 'S' : 'E'}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      fontSize: '11px',
                                      backgroundColor: '#ac6d46',
                                      border: '2px solid white',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                    }}
                                  >
                                    {positionNumber}
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5] truncate flex items-center gap-2">
                                    <span className="truncate">{entry.title}</span>
                                    <span className="ml-auto px-1.5 py-0.5 bg-[#4676ac]/10 text-[#4676ac] text-[10px] font-bold border border-[#4676ac]/30 flex-shrink-0">
                                      ENTRY
                                    </span>
                                  </div>
                                  {entry.place && (
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] truncate mb-1">
                                      {entry.place}
                                    </div>
                                  )}
                                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono space-y-0.5">
                                    <div className="truncate">{Math.abs(entry.coords.lat).toFixed(4)}°{entry.coords.lat >= 0 ? 'N' : 'S'}, {Math.abs(entry.coords.lng).toFixed(4)}°{entry.coords.lng >= 0 ? 'E' : 'W'}</div>
                                    {entry.date && (
                                      <div className="text-[#ac6d46]">{entry.date}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="h-px bg-[#202020] dark:bg-[#616161]" />
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* Expedition Details Form */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6 mt-6">
        <div className="p-4 md:p-6 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-sm md:text-base font-bold dark:text-[#e5e5e5]">EXPEDITION DETAILS</h2>
          <p className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
            Use interactive map above to plan route waypoints
          </p>
        </div>

        <div className="p-4 md:p-6">
          {/* Route-derived fields — location and travel time populate automatically
              from the waypoints dropped on the map above. Placed here (not in the
              identity section) so users don't try to fill them before touching the
              map. Auto-fill effects respect locationManuallyEdited / durationManuallyEdited
              flags, so once a guide types an override it stays sticky. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 pb-6 border-b-2 border-[#b5bcc4] dark:border-[#616161]">
            <div>
              <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
                STARTING LOCATION
                <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                {(locationManuallyEdited || locationAutoFilled) && <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">{locationManuallyEdited ? '(manually set)' : '(auto-detected)'}</span>}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => { setLocationName(e.target.value); setLocationManuallyEdited(true); }}
                disabled={waypoints.length === 0}
                placeholder={waypoints.length > 0 ? 'Detecting from waypoints...' : 'Drop waypoints on the map above to auto-detect'}
                maxLength={200}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161] disabled:opacity-60"
              />
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                Auto-detected from first waypoint coordinates • Edit to override
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
                TRAVEL TIME (HOURS)
                <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                {(durationManuallyEdited || durationAutoFilled) && <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">{durationManuallyEdited ? '(manually set)' : '(auto-calculated)'}</span>}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={estimatedDurationH}
                  onChange={(e) => { setEstimatedDurationH(e.target.value); setDurationManuallyEdited(true); }}
                  disabled={waypoints.length < 2}
                  placeholder={waypoints.length >= 2 ? 'Calculated from route...' : 'Add waypoints on the map above to auto-calculate'}
                  min={0}
                  step={0.5}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161] font-mono disabled:opacity-60"
                />
                {estimatedDurationH && Number(estimatedDurationH) > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4676ac] font-bold pointer-events-none">
                    ≈ {formatDuration(Number(estimatedDurationH))}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                Auto-calculated from route distance, elevation, and mode • Edit to override
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Category - not applicable to blueprints */}
              {!canCreateBlueprints && (
              <div>
                <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
                  CATEGORY <span className="text-[#ac6d46]">*</span>
                  {isEditMode && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span>}
                </label>
                <select
                  value={expeditionData.category}
                  onChange={(e) => setExpeditionData({ ...expeditionData, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                  disabled={isEditMode}
                >
                  <option value="">Select category...</option>
                  <option>Culture & Photography</option>
                  <option>Scientific Research</option>
                  <option>Documentary</option>
                  <option>Adventure & Exploration</option>
                  <option>Environmental</option>
                  <option>Historical Documentation</option>
                  <option>Other</option>
                </select>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Primary activity type • Helps organize and filter expeditions
                </p>
              </div>
              )}

            </div>

          </div>

          {/* Description - Full Width */}
          <div className="mt-6">
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              EXPEDITION DESCRIPTION <span className="text-[#ac6d46]">*REQUIRED</span>
            </label>
            <textarea
              required
              value={expeditionData.description}
              onChange={(e) => setExpeditionData({ ...expeditionData, description: e.target.value })}
              placeholder="Describe your expedition, goals, and what you plan to document..."
              rows={6}
              maxLength={500}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161]"
            />
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
              Min 100 characters • Max 500 characters
            </p>
          </div>

          {/* Cover Photo — not applicable to blueprints */}
          {!canCreateBlueprints && (
          <div className="mt-6">
            <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
              COVER PHOTO
              <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
            </label>
            <input
              type="file"
              ref={coverInputRef}
              onChange={handleCoverPhotoSelect}
              accept="image/*"
              className="hidden"
            />
            {coverPhotoPreview ? (
              <div className="relative border-2 border-[#ac6d46] h-48">
                <Image
                  src={coverPhotoPreview}
                  alt="Cover preview"
                  className="object-cover"
                  fill
                />
                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => {
                    setCoverPhotoPreview(null);
                    setCoverPhotoUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-[#202020] hover:bg-[#ac6d46] text-white p-2 rounded-full transition-all"
                >
                  <X size={16} />
                </button>
                <div className="p-3 border-t-2 border-[#ac6d46] bg-[#f5f5f5] dark:bg-[#2a2a2a] text-xs text-[#616161] dark:text-[#b5bcc4]">
                  {uploadingCover ? 'Uploading...' : coverPhotoUrl ? 'Cover photo uploaded successfully' : 'Current cover photo • Click X to upload a new one'}
                </div>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed border-[#ac6d46] p-8 text-center hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] cursor-pointer transition-all"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-[#ac6d46]" />
                <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                  UPLOAD COVER PHOTO
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Click or drag file here • JPG, PNG • Max 25MB • Recommended: 1200x600px
                </div>
              </div>
            )}
          </div>
          )}

          {/* Tags */}
          <div className="mt-6">
            <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
              TAGS
              <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
              placeholder="e.g., cycling, photography, culture, silk-road"
            />
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
              Comma-separated • Max 10 tags
            </div>
          </div>

          {/* Sponsorships - hidden for guide accounts */}
          {!canCreateBlueprints && (
          <div className="mt-6 border-2 border-[#ac6d46] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
              ENABLE SPONSORSHIPS
              <span className="text-xs text-[#ac6d46]">PRO</span>
              <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
            </label>
            <div className="flex items-start gap-2 mb-3">
              <input
                type="checkbox"
                id="enable-sponsorships"
                className="mt-1"
                checked={sponsorshipsEnabled}
                onChange={(e) => {
                  setSponsorshipsEnabled(e.target.checked);
                  if (e.target.checked) {
                    setNotesVisibility('sponsor');
                    if (expeditionData.visibility === 'private') {
                      setExpeditionData({ ...expeditionData, visibility: 'public' });
                    }
                  } else {
                    setNotesVisibility('public');
                  }
                }}
                disabled={!isPro || !user?.stripeAccountConnected || status === 'completed'}
              />
              <label htmlFor="enable-sponsorships" className={`text-xs ${!isPro || !user?.stripeAccountConnected || status === 'completed' ? 'text-[#b5bcc4] dark:text-[#616161]' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                Allow others to financially support this expedition through the platform
              </label>
            </div>
            {!isPro && (
              <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <strong className="text-[#ac6d46]">PRO FEATURE:</strong> Receiving sponsorships requires Explorer Pro.
                <Link href="/settings/billing" className="text-[#4676ac] hover:underline ml-1">Upgrade to Pro</Link>
              </div>
            )}
            {isPro && !user?.stripeAccountConnected && status !== 'completed' && (
              <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <strong className="text-[#ac6d46]">STRIPE CONNECT REQUIRED:</strong> Complete your Stripe onboarding before enabling sponsorships.
                <Link href="/sponsorship" className="text-[#4676ac] hover:underline ml-1">Complete setup</Link>
              </div>
            )}
            {status === 'completed' && (
              <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#616161] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <strong>COMPLETED EXPEDITION:</strong> Sponsorships are not available for completed expeditions.
              </div>
            )}
            {sponsorshipsEnabled && isPro && (
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  SPONSORSHIP GOAL (USD)
                  <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
                  placeholder="e.g., 15000"
                  min="1"
                  value={sponsorshipGoal}
                  onChange={(e) => setSponsorshipGoal(e.target.value ? Number(e.target.value) : '')}
                  required={sponsorshipsEnabled}
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Set a funding goal for your expedition • Platform fee: 10% • Processing: 2.9% + $0.30
                </div>
              </div>
            )}
            {sponsorshipsEnabled && isPro && notesVisibility === 'sponsor' && (
              <div className="mt-4">
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  EXPEDITION NOTES ACCESS THRESHOLD (USD)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
                  placeholder="e.g., 15"
                  min="0"
                  value={notesAccessThreshold}
                  onChange={(e) => setNotesAccessThreshold(e.target.value ? Number(e.target.value) : '')}
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Minimum cumulative sponsorship to unlock Expedition Notes • Leave empty or 0 for any sponsor to have access
                </div>
              </div>
            )}
          </div>
          )}

          {/* Expedition Notes Visibility - Pro only, hidden for guides */}
          {!canCreateBlueprints && isPro && expeditionData.visibility !== 'private' && <div className="mt-6 border-2 border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">EXPEDITION NOTES VISIBILITY</div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="notes-public"
                  name="notesVisibility"
                  className="mt-1"
                  checked={notesVisibility === 'public'}
                  onChange={() => { setNotesVisibility('public'); setNotesAccessThreshold(''); }}
                />
                <label htmlFor="notes-public" className="text-xs">
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PUBLIC</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                    Anyone can read expedition notes.
                  </div>
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="notes-sponsor"
                  name="notesVisibility"
                  className="mt-1"
                  checked={notesVisibility === 'sponsor'}
                  onChange={() => {
                    setNotesVisibility('sponsor');
                    if (isPro && user?.stripeAccountConnected && status !== 'completed') {
                      setSponsorshipsEnabled(true);
                    }
                  }}
                  disabled={!isPro || !user?.stripeAccountConnected || status === 'completed'}
                />
                <label htmlFor="notes-sponsor" className={`text-xs ${!isPro || !user?.stripeAccountConnected || status === 'completed' ? 'text-[#b5bcc4] dark:text-[#616161]' : ''}`}>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">SPONSOR EXCLUSIVE</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                    Only sponsors meeting the access threshold can read expedition notes.
                    {(!isPro || !user?.stripeAccountConnected) && (
                      <span className="text-[#ac6d46] ml-1">Requires Explorer Pro with Stripe Connect.</span>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>}

          {/* Early Entry Access - Pro only, requires sponsorships, hidden for guides */}
          {!canCreateBlueprints && isPro && sponsorshipsEnabled && (
            <div className="mt-6 border-2 border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
              <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">EARLY ENTRY ACCESS</div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="early-access-enabled"
                  className="mt-1"
                  checked={earlyAccessEnabled}
                  onChange={(e) => setEarlyAccessEnabled(e.target.checked)}
                />
                <label htmlFor="early-access-enabled" className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                  Qualifying sponsors see new journal entries before the public. Tier 2 sponsors get 24h early access, Tier 3 gets 48h.
                </label>
              </div>
            </div>
          )}

          {/* Privacy Settings - Radio buttons matching quick entry */}
          {/* Non-blueprints: full Public / Off-Grid / Private picker. */}
          {/* Blueprints: Public + Off-Grid only — Private would defeat the adoption/discovery loop. */}
          {!canCreateBlueprints && (
          <div className="mt-6 border-2 border-[#4676ac] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">
              VISIBILITY:
              {isEditMode && expeditionData.visibility === 'private' && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span>}
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="visibility-public"
                  name="visibility"
                  className="mt-1"
                  checked={expeditionData.visibility === 'public'}
                  onChange={() => setExpeditionData({ ...expeditionData, visibility: 'public' })}
                  disabled={isEditMode && expeditionData.visibility === 'private'}
                />
                <label htmlFor="visibility-public" className={`text-xs ${isEditMode && expeditionData.visibility === 'private' ? 'opacity-50' : ''}`}>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PUBLIC EXPEDITION</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Listed in feeds, search, and your explorer profile. Anyone can discover your expedition.
                  </div>
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="visibility-offgrid"
                  name="visibility"
                  className="mt-1"
                  checked={expeditionData.visibility === 'off-grid'}
                  onChange={() => setExpeditionData({ ...expeditionData, visibility: 'off-grid' })}
                  disabled={isEditMode && expeditionData.visibility === 'private'}
                />
                <label htmlFor="visibility-offgrid" className={`text-xs ${isEditMode && expeditionData.visibility === 'private' ? 'opacity-50' : ''}`}>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">OFF-GRID</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Hidden from all feeds and search. Only accessible via direct link. Sponsorships still work — share the link directly with potential sponsors.
                  </div>
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="visibility-private"
                  name="visibility"
                  className="mt-1"
                  checked={expeditionData.visibility === 'private'}
                  onChange={() => {
                    setExpeditionData({ ...expeditionData, visibility: 'private' });
                    setNotesVisibility('public');
                  }}
                  disabled={sponsorshipsEnabled || (isEditMode && expeditionData.visibility !== 'private')}
                />
                <label htmlFor="visibility-private" className={`text-xs ${sponsorshipsEnabled || (isEditMode && expeditionData.visibility !== 'private') ? 'opacity-50' : ''}`}>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PRIVATE EXPEDITION</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Only you can access this expedition. <span className="font-bold text-[#ac6d46]">ALL journal entries automatically locked to private.</span>
                  </div>
                </label>
              </div>
            </div>

            {sponsorshipsEnabled && (
              <div className="mt-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <strong className="text-[#ac6d46]">SPONSORSHIPS ENABLED:</strong> Expeditions with sponsorships cannot be set to Private. Public and Off-Grid expeditions both support sponsorships.
              </div>
            )}

            {!isEditMode && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-600 text-xs">
                <strong className="text-yellow-700 dark:text-yellow-500"><AlertTriangle className="inline w-4 h-4 mr-1 -mt-0.5" /> PERMANENT SETTING:</strong>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Private visibility <span className="font-bold">cannot be changed after creation.</span> Public and Off-Grid can be toggled freely. Category, region, and start date are also locked after creation.
                </div>
              </div>
            )}

            {isEditMode && expeditionData.visibility === 'private' && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-[#4676ac] text-xs">
                <strong className="text-[#4676ac]">LOCKED FIELDS:</strong>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Private visibility, category, region, and start date are locked for existing expeditions. Other fields including description, tags, and waypoints can be modified.
                </div>
              </div>
            )}

            {isEditMode && expeditionData.visibility !== 'private' && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-[#4676ac] text-xs">
                <strong className="text-[#4676ac]">LOCKED FIELDS:</strong>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Category, region, and start date are locked for existing expeditions. Visibility can be toggled between Public and Off-Grid.
                </div>
              </div>
            )}
          </div>
          )}

          {/* Blueprint visibility — mirrors the standard visibility box (Public + Off-Grid only) */}
          {canCreateBlueprints && (
          <div className="mt-6 border-2 border-[#4676ac] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">VISIBILITY:</div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="bp-visibility-public"
                  name="bp-visibility"
                  className="mt-1"
                  checked={expeditionData.visibility !== 'off-grid'}
                  onChange={() => setExpeditionData({ ...expeditionData, visibility: 'public' })}
                />
                <label htmlFor="bp-visibility-public" className="text-xs">
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PUBLIC BLUEPRINT</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Listed in blueprint discovery, search, and your guide profile. Any explorer can find, rate, and adopt this blueprint.
                  </div>
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="bp-visibility-offgrid"
                  name="bp-visibility"
                  className="mt-1"
                  checked={expeditionData.visibility === 'off-grid'}
                  onChange={() => setExpeditionData({ ...expeditionData, visibility: 'off-grid' })}
                />
                <label htmlFor="bp-visibility-offgrid" className="text-xs">
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">OFF-GRID BLUEPRINT</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Hidden from discovery and search. Only accessible via direct link — useful for private clients, beta testers, or unlisted routes.
                  </div>
                </label>
              </div>
            </div>
          </div>
          )}

          {/* Route export toggle — separate box, mirrors the EARLY ENTRY ACCESS pattern */}
          {canCreateBlueprints && (
          <div className="mt-6 border-2 border-[#ac6d46] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ROUTE EXPORT</div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="route-export-allowed"
                className="mt-1"
                checked={routeExportAllowed}
                onChange={(e) => setRouteExportAllowed(e.target.checked)}
              />
              <label htmlFor="route-export-allowed" className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                When enabled, viewers and adopters can download the full GPX track for navigation on their own device. Disable to keep the exact route private — viewers still see it on the map but cannot download it. You can always export your own route.
              </label>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Bottom */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mt-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {canCreateBlueprints && (
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting || uploadingCover}
              className="px-6 py-3 border-2 border-[#598636] text-[#598636] hover:bg-[#598636] hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#598636] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingDraft && <Loader2 size={18} className="animate-spin" />}
              <span>{isSavingDraft ? 'SAVING...' : 'SAVE DRAFT'}</span>
            </button>
          )}
          <button
            onClick={() => handleCreateExpedition(false)}
            disabled={isSubmitting || isSavingDraft || uploadingCover}
            className={`px-6 py-3 text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
              canCreateBlueprints
                ? 'bg-[#598636] hover:bg-[#4a7029] focus-visible:ring-[#598636]'
                : 'bg-[#4676ac] hover:bg-[#365a8a] focus-visible:ring-[#4676ac]'
            }`}
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            <span>{isSubmitting ? 'PUBLISHING...' : canCreateBlueprints ? (isEditMode ? 'SAVE & PUBLISH' : 'PUBLISH BLUEPRINT') : (isEditMode ? 'SAVE CHANGES' : 'LAUNCH EXPEDITION')}</span>
          </button>
          {!isEditMode && !canCreateBlueprints && (
            <button
              onClick={() => handleCreateExpedition(true)}
              disabled={isSubmitting || uploadingCover}
              className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>LAUNCH & LOG FIRST ENTRY</span>
            </button>
          )}
          {/* Autosave indicator */}
          {!isEditMode && (
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono flex items-center gap-2 sm:ml-auto">
              {isAutoSaving && (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {!isAutoSaving && lastSaved && (
                <span>Auto-saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
              {draftId && !isAutoSaving && !lastSaved && (
                <span>Draft loaded</span>
              )}
            </div>
          )}
          {submitError && (
            <div className="text-[#994040] text-sm mt-2">{submitError}</div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-[#b5bcc4] dark:border-[#616161] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            {canCreateBlueprints ? 'Expedition builder • Blueprint mode' : 'Expedition builder v1.0'} • Route: {(() => { const u = new Set(perLegModes); if (u.size > 1) return `Mixed (${u.size} modes)`; const m = perLegModes[0] || 'straight'; return m === 'straight' ? 'Straight-line' : m === 'passage' ? 'Passage' : m === 'trail' ? 'Trail' : m === 'waterway' ? `Waterway (${waterwayProfile})` : m.charAt(0).toUpperCase() + m.slice(1); })()} • {waypoints.length} waypoints defined
          </div>
          {!canCreateBlueprints && (
          <Link
            href={isEditMode ? `/expedition/${expeditionId}` : '/select-expedition'}
            className="text-xs text-[#4676ac] hover:underline font-bold"
          >
            {isEditMode ? '← BACK TO EXPEDITION' : 'cancel and return to selection'}
          </Link>
          )}
        </div>
      </div>

      {/* Danger Zone - Only in Edit Mode */}
      {isEditMode && (
        <div className="mt-8 bg-white dark:bg-[#202020] border-2 border-[#994040] p-6">
          <h3 className="text-[#994040] font-bold text-sm mb-3">DANGER ZONE</h3>
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-4">
            Permanently delete this expedition and all its data. This cannot be undone.
          </p>
          {expeditionEntries.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 text-sm mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-amber-800 dark:text-amber-300 text-xs">
                  This expedition has <strong>{expeditionEntries.length} {expeditionEntries.length === 1 ? 'entry' : 'entries'}</strong>. Delete all entries before deleting the expedition.
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setConfirmingDeleteExpedition(true)}
            disabled={expeditionEntries.length > 0}
            className="px-6 py-2.5 bg-[#994040] text-white hover:bg-[#7a3333] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040] text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            DELETE EXPEDITION
          </button>
        </div>
      )}

      {/* Delete Waypoint Confirmation Modal */}
      {confirmingDelete && (() => {
        const wp = waypoints.find(w => w.id === confirmingDelete);
        if (!wp) return null;
        return (
          <ConfirmationModal
            isOpen
            onClose={() => setConfirmingDelete(null)}
            onConfirm={() => {
              handleDeleteWaypoint(confirmingDelete);
              setConfirmingDelete(null);
            }}
            title="DELETE WAYPOINT"
            icon={<Trash2 size={18} />}
            confirmLabel="DELETE"
          >
            <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-1">
              Are you sure you want to delete this waypoint?
            </p>
            <p className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-4">
              &ldquo;{wp.name}&rdquo;
            </p>
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6">
              This action cannot be undone. The waypoint will be removed from your route.
            </p>
          </ConfirmationModal>
        );
      })()}

      {/* Route File Import Modal */}
      <RouteImportModal
        isOpen={showRouteImportModal}
        onClose={() => setShowRouteImportModal(false)}
        onImport={(route, file) => {
          void handleRouteImport(route, file);
        }}
        existingWaypointCount={waypoints.length}
        descriptionMaxChars={waypointDescriptionMax}
      />

      {/* Clear All Waypoints Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmingClearAll}
        onClose={() => setConfirmingClearAll(false)}
        onConfirm={() => {
          setWaypoints([]);
          setSelectedWaypoint(null);
          setIsRoundTrip(false);
          setConfirmingClearAll(false);
        }}
        title="CLEAR ALL WAYPOINTS"
        icon={<Trash2 size={18} />}
        confirmLabel="CLEAR ALL"
      >
        <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-4">
          Are you sure you want to remove all {waypoints.length} waypoints from this route?
        </p>
        <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6">
          This action cannot be undone. All waypoints will be removed from the map and route.
        </p>
      </ConfirmationModal>

      {/* Delete Expedition Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmingDeleteExpedition}
        onClose={() => setConfirmingDeleteExpedition(false)}
        onConfirm={handleDeleteExpedition}
        title="DELETE EXPEDITION"
        icon={<Trash2 size={18} />}
        headerColor="bg-[#994040]"
        confirmLabel={isDeletingExpedition ? 'DELETING...' : 'DELETE EXPEDITION'}
        confirmColor="bg-[#994040] text-white hover:bg-[#7a3333]"
        isLoading={isDeletingExpedition}
      >
        <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-1">
          Are you sure you want to delete this expedition?
        </p>
        <p className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-4">
          &ldquo;{expeditionData.title}&rdquo;
        </p>
        <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6">
          This action cannot be undone.
        </p>
      </ConfirmationModal>
    </div>
  );
}