'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { MapPin, Trash2, Upload, Info, X, Locate, Lock, Loader2, ChevronUp, ChevronDown, AlertTriangle, Search, Plus } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { DatePicker } from '@/app/components/DatePicker';
import { ConfirmationModal } from '@/app/components/ConfirmationModal';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useMapLayer, getMapStyle, getLineCasingColor } from '@/app/context/MapLayerContext';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { CurrentLocationSelector } from '@/app/components/CurrentLocationSelector';
import { toast } from 'sonner';
import { expeditionApi, uploadApi } from '@/app/services/api';
import { formatDateTime } from '@/app/utils/dateFormat';
import { GEO_REGION_GROUPS } from '@/app/utils/geoRegions';
import { haversineFromLatLng } from '@/app/utils/haversine';
import { buildWaypointPayload } from '@/app/utils/waypointPayload';
import { projectToSegment } from '@/app/utils/routeSnapping';
import { renderClusteredMarkers } from '@/app/utils/mapClustering';
import { createPOIGeocoder, searchAlongRoute, fetchPOICategories, retrievePOI, clearRouteSearchCache, clipRouteToBounds } from '@/app/utils/poiGeocoder';
import type { POIResult, POICategory } from '@/app/utils/poiGeocoder';
import { useBuilderDateHandlers } from '@/app/hooks/useBuilderDateHandlers';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

type RouteMode = 'straight' | 'walking' | 'cycling' | 'driving';

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


export function ExpeditionBuilderPage() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { mapLayer } = useMapLayer();
  const { formatDistance } = useDistanceUnit();
  const { isPro } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const isEditMode = !!expeditionId;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const waypointsRef = useRef<Waypoint[]>([]);
  const entryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const clusteredEntryRef = useRef<{ cleanup: () => void; recalculate: () => void; markers: mapboxgl.Marker[]; removeAllHighlights: () => void } | null>(null);
  const originalWaypointIdsRef = useRef<string[]>([]); // Track API waypoint IDs loaded in edit mode
  const reorderNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionsAbortRef = useRef<AbortController | null>(null);
  const lastDirectionsCoordsRef = useRef<string>(''); // Fingerprint to prevent re-fetch loops
  const skipFitBoundsRef = useRef(false); // Skip fitBounds after geocoder/POI waypoint placement
  const addWaypointRef = useRef<((lat: number, lng: number, name: string, location: string) => void) | null>(null);
  const routeSearchMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const routeSearchResultsRef = useRef<POIResult[]>([]);
  const searchResultRef = useRef<{ lng: number; lat: number; name: string; address: string } | null>(null);

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
  const [mapZoom, setMapZoom] = useState(10);
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
  const [movedWaypointId, setMovedWaypointId] = useState<string | null>(null);
  const movedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Route mode / Directions API state
  const [routeMode, setRouteMode] = useState<RouteMode>('straight');
  const [directionsGeometry, setDirectionsGeometry] = useState<[number, number][] | null>(null);
  const [directionsLegDistances, setDirectionsLegDistances] = useState<number[] | null>(null);
  const [directionsLegDurations, setDirectionsLegDurations] = useState<number[] | null>(null); // seconds per leg
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [directionsWarnings, setDirectionsWarnings] = useState<string[]>([]);

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

  const [sponsorshipsEnabled, setSponsorshipsEnabled] = useState(false);
  const [sponsorshipGoal, setSponsorshipGoal] = useState<number | ''>('');
  const [notesAccessThreshold, setNotesAccessThreshold] = useState<number | ''>('');
  const [notesVisibility, setNotesVisibility] = useState<'public' | 'sponsor'>('public');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [currentLocationSource, setCurrentLocationSource] = useState<'waypoint' | 'entry'>('waypoint');
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [tags, setTags] = useState('');
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null); // Uploaded URL for API
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  // Allowed image types for cover photo
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_COVER_SIZE = 25 * 1024 * 1024; // 25MB

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
    } catch {
      toast.error('Failed to delete expedition');
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
    if (!expeditionData.startDate) {
      errors.push('Start date is required');
    }
    if (!expeditionData.category) {
      errors.push('Category is required');
    }
    if (!coverPhotoUrl && !isEditMode) {
      errors.push('Cover photo is required');
    }

    if (errors.length > 0) {
      errors.forEach(msg => toast.error(msg));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        title: expeditionData.title,
        description: expeditionData.description,
        visibility: expeditionData.visibility,
        status: computeStatus(),
        startDate: expeditionData.startDate || undefined,
        endDate: expeditionData.endDate || undefined,
        coverImage: coverPhotoUrl || undefined,
        goal: sponsorshipsEnabled && sponsorshipGoal ? Number(sponsorshipGoal) : undefined,
        notesAccessThreshold: notesVisibility === 'sponsor' && notesAccessThreshold ? Number(notesAccessThreshold) : 0,
        notesVisibility,
        isRoundTrip,
        category: expeditionData.category || undefined,
        region: expeditionData.regions.length > 0 ? expeditionData.regions.join(', ') : undefined,
        routeMode: routeMode !== 'straight' ? routeMode : null,
        routeGeometry: routeMode !== 'straight' && directionsGeometry ? directionsGeometry : null,
        routeDistanceKm: totalDistance > 0 ? Math.round(totalDistance * 10) / 10 : undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      };

      // Completed expeditions: only send allowed fields (title, description, cover, waypoints)
      const finalPayload = isCompletedExpedition
        ? { title: payload.title, description: payload.description, coverImage: payload.coverImage, routeGeometry: payload.routeGeometry }
        : payload;

      let expeditionPublicId: string;

      if (isEditMode && expeditionId) {
        await expeditionApi.update(expeditionId, finalPayload);
        expeditionPublicId = expeditionId;

        // Sync all waypoints in a single API call
        if (waypoints.length > 0) {
          const wpPayload = waypoints.map((w, i) => ({
            lat: w.coordinates.lat,
            lon: w.coordinates.lng,
            title: w.name || undefined,
            date: w.date || undefined,
            description: w.description || undefined,
            sequence: i,
          }));
          await expeditionApi.syncWaypoints(expeditionId, wpPayload);
        }
      } else if (draftId) {
        // Publishing from a draft — update final state, sync waypoints, then publish
        expeditionPublicId = draftId;
        const { status: _status, ...draftPayload } = payload;
        await expeditionApi.update(draftId, draftPayload);

        // Sync waypoints atomically
        if (waypoints.length > 0) {
          const wpPayload = waypoints.map((w, i) => ({
            lat: w.coordinates.lat,
            lon: w.coordinates.lng,
            title: w.name || undefined,
            date: w.date || undefined,
            description: w.description || undefined,
            sequence: i,
          }));
          await expeditionApi.syncWaypoints(draftId, wpPayload);
        }

        // Transition from draft to planned/active/completed
        await expeditionApi.publishDraft(draftId);
      } else {
        const result = await expeditionApi.create(payload);
        expeditionPublicId = (result as any).expeditionId || (result as any).id;

        // Sync all waypoints in a single API call
        if (waypoints.length > 0) {
          const wpPayload = waypoints.map((w, i) => ({
            lat: w.coordinates.lat,
            lon: w.coordinates.lng,
            title: w.name || undefined,
            date: w.date || undefined,
            description: w.description || undefined,
            sequence: i,
          }));
          await expeditionApi.syncWaypoints(expeditionPublicId, wpPayload);
        }
      }

      // Save current location selection if set
      if (currentLocationId && currentLocationSource) {
        try {
          await expeditionApi.updateLocation(expeditionPublicId, currentLocationSource, currentLocationId);
        } catch {
          // Non-critical — expedition is saved, location update can fail silently
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
      setIsSubmitting(false);
    }
  };

  // Auto-compute status based on dates
  const computeStatus = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (!expeditionData.startDate) return 'planned';
    
    if (expeditionData.endDate && expeditionData.endDate <= today) {
      return 'completed';
    }
    
    if (expeditionData.startDate > today) {
      return 'planned';
    }
    
    return 'active';
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

  // Keep isSubmittingRef in sync
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

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
      isRoundTrip,
      routeMode,
      tags,
      wpSig,
    });
  }, [expeditionData, coverPhotoUrl, sponsorshipsEnabled, sponsorshipGoal, notesAccessThreshold, notesVisibility, isRoundTrip, routeMode, tags, waypoints]);

  // Keep ref in sync with state
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  // Update distances when waypoints change
  const updateDistances = (points: Waypoint[]): Waypoint[] => {
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
  };

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

    // Auto-timeout after 15 seconds to prevent hanging requests
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    setDirectionsLoading(true);
    setDirectionsError(null);

    try {
      // Build coordinate pairs, appending start if round trip
      const coords = points.map(w => [w.coordinates.lng, w.coordinates.lat] as [number, number]);
      if (isRoundTrip && coords.length > 1) {
        coords.push(coords[0]);
      }

      // Mapbox Directions API allows max 25 waypoints per request
      const MAX_WAYPOINTS = 25;
      let allCoordinates: [number, number][] = [];
      let allLegDistances: number[] = [];
      let allLegDurations: number[] = []; // seconds per leg
      // Collect snap distances (meters) for each input waypoint
      const snapDistances: number[] = [];
      // Threshold: waypoints snapped more than 1km from input are flagged
      const SNAP_THRESHOLD_M = 1000;

      if (coords.length <= MAX_WAYPOINTS) {
        const coordString = coords.map(c => formatCoord(c[0], c[1])).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
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
          const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordString}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
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

        // Aggregate legs between waypoint stops when entries are interleaved
        if (waypointIndices && waypointIndices.length >= 2) {
          const aggDistances: number[] = [];
          const aggDurations: number[] = [];
          for (let i = 0; i < waypointIndices.length - 1; i++) {
            let dist = 0;
            let dur = 0;
            for (let leg = waypointIndices[i]; leg < waypointIndices[i + 1]; leg++) {
              dist += allLegDistances[leg] ?? 0;
              dur += allLegDurations[leg] ?? 0;
            }
            aggDistances.push(dist);
            aggDurations.push(dur);
          }
          allLegDistances = aggDistances;
          allLegDurations = aggDurations;
        }

        setDirectionsLegDistances(allLegDistances);
        setDirectionsLegDurations(allLegDurations);

        // Check for waypoints that were snapped far from their input location
        const warnings: string[] = [];
        if (waypointIndices) {
          // Only warn about waypoints, not entries
          waypointIndices.forEach((wpIdx, i) => {
            if (wpIdx < snapDistances.length && snapDistances[wpIdx] > SNAP_THRESHOLD_M) {
              const name = points[wpIdx]?.name || `Waypoint ${i + 1}`;
              const distKm = snapDistances[wpIdx] / 1000;
              warnings.push(`${name} is ${formatDistance(distKm, 1)} from the nearest ${profile} route`);
            }
          });
        } else {
          const waypointCount = isRoundTrip ? snapDistances.length - 1 : snapDistances.length;
          for (let i = 0; i < waypointCount && i < points.length; i++) {
            if (snapDistances[i] > SNAP_THRESHOLD_M) {
              const name = points[i].name || `Waypoint ${i + 1}`;
              const distKm = snapDistances[i] / 1000;
              warnings.push(`${name} is ${formatDistance(distKm, 1)} from the nearest ${profile} route`);
            }
          }
        }
        setDirectionsWarnings(warnings);
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
          setDirectionsLoading(false);
        }
        return;
      }
      setDirectionsError(err.message || 'Failed to fetch route');
      setDirectionsGeometry(null);
      setDirectionsLegDistances(null);
      setDirectionsLegDurations(null);
      setDirectionsWarnings([]);
    } finally {
      clearTimeout(timeoutId);
      if (!abortController.signal.aborted) {
        setDirectionsLoading(false);
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
        maxZoom: 8,
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

        setExpeditionData({
          title: expedition.title || '',
          regions: expedition.region ? expedition.region.split(', ').map((r: string) => r.trim()).filter(Boolean) : [],
          description: expedition.description || '',
          category: expedition.category || '',
          startDate: expedition.startDate ? new Date(expedition.startDate).toISOString().split('T')[0] : '',
          endDate: expedition.endDate ? new Date(expedition.endDate).toISOString().split('T')[0] : '',
          visibility: expedition.visibility || (expedition.public !== false ? 'public' : 'private')
        });

        // Load tags
        if (expedition.tags?.length) {
          setTags(expedition.tags.join(', '));
        }

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

        // Set round trip status
        if (expedition.isRoundTrip) {
          setIsRoundTrip(true);
        }

        // Restore route mode from saved expedition
        if (expedition.routeMode && expedition.routeMode !== 'straight') {
          setRouteMode(expedition.routeMode as RouteMode);
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
            date: wp.date ? new Date(wp.date).toISOString().split('T')[0] : '',
            description: wp.description || '',
            entryIds: wp.entryIds || (wp.entryId ? [wp.entryId] : []),
          }));
          originalWaypointIdsRef.current = transformedWaypoints.map(wp => wp.id);
          setWaypoints(updateDistances(transformedWaypoints));
        }

        // Load entries (read-only context for builder)
        if (expedition.entries && expedition.entries.length > 0) {
          setExpeditionEntries(
            expedition.entries
              .filter((e: any) => e.lat && e.lon)
              .map((e: any) => ({
                id: e.id,
                title: e.title,
                date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
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
      startDate: draft.startDate ? new Date(draft.startDate).toISOString().split('T')[0] : '',
      endDate: draft.endDate ? new Date(draft.endDate).toISOString().split('T')[0] : '',
      visibility: draft.visibility || 'public',
    });
    if (draft.tags?.length) setTags(draft.tags.join(', '));
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
    if (draft.isRoundTrip) setIsRoundTrip(true);
    if (draft.routeMode && draft.routeMode !== 'straight') setRouteMode(draft.routeMode as RouteMode);
    if (draft.waypoints?.length > 0) {
      const transformed: Waypoint[] = draft.waypoints.map((wp: any, index: number) => ({
        id: String(wp.id),
        sequence: index,
        name: wp.title || `Waypoint ${index + 1}`,
        type: 'standard' as const,
        coordinates: { lat: wp.lat || 0, lng: wp.lon || 0 },
        location: '',
        date: wp.date ? new Date(wp.date).toISOString().split('T')[0] : '',
        description: wp.description || '',
        entryIds: [],
      }));
      setWaypoints(updateDistances(transformed));
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
    setTimeout(() => {
      lastSavedContentRef.current = getContentSignature();
    }, 100);
  }, [getContentSignature, updateDistances]);

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
          visibility: expeditionData.visibility,
          status: 'draft' as const,
          startDate: expeditionData.startDate || undefined,
          endDate: expeditionData.endDate || undefined,
          coverImage: coverPhotoUrl || undefined,
          goal: sponsorshipsEnabled && sponsorshipGoal ? Number(sponsorshipGoal) : undefined,
          notesAccessThreshold: notesVisibility === 'sponsor' && notesAccessThreshold ? Number(notesAccessThreshold) : 0,
          notesVisibility,
          isRoundTrip,
          category: expeditionData.category || undefined,
          region: expeditionData.regions.length > 0 ? expeditionData.regions.join(', ') : undefined,
          routeMode: routeMode !== 'straight' ? routeMode : null,
          routeGeometry: routeMode !== 'straight' && directionsGeometry ? directionsGeometry : null,
          routeDistanceKm: totalDistance > 0 ? Math.round(totalDistance * 10) / 10 : undefined,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
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

        // Sync waypoints if any exist
        if (currentDraftId && waypointsRef.current.length > 0) {
          const wpPayload = waypointsRef.current.map((w, i) => ({
            lat: w.coordinates.lat,
            lon: w.coordinates.lng,
            title: w.name || undefined,
            date: w.date || undefined,
            description: w.description || undefined,
            sequence: i,
          }));
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
  }, [isEditMode, expeditionData, coverPhotoUrl, sponsorshipsEnabled, sponsorshipGoal, notesAccessThreshold, notesVisibility, isRoundTrip, routeMode, directionsGeometry, tags, draftId, getContentSignature]);

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
        const newWaypoint: Waypoint = {
          id: `waypoint-${Date.now()}`,
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
          let all: Waypoint[];
          if (prev.length < 2) {
            all = [...prev, newWaypoint];
          } else {
            let bestSegIdx = 0;
            let bestDistSq = Infinity;
            for (let i = 0; i < prev.length - 1; i++) {
              const { distSq } = projectToSegment(
                { lat, lng },
                prev[i].coordinates,
                prev[i + 1].coordinates,
              );
              if (distSq < bestDistSq) { bestDistSq = distSq; bestSegIdx = i; }
            }
            const insertIdx = bestSegIdx + 1;
            all = [...prev.slice(0, insertIdx), newWaypoint, ...prev.slice(insertIdx)];
          }
          return updateDistances(all.map((w, i) => ({ ...w, sequence: i })));
        });
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

      // Set map loaded when style is loaded
      newMap.on('zoomend', () => {
        setMapZoom(Math.round(newMap.getZoom()));
      });

      newMap.on('load', () => {
        setMapLoaded(true);

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

    setMapLoaded(false); // Will be set back to true when new style loads
    map.current.setStyle(getMapStyle(mapLayer, theme));

    // Wait for new style to load
    map.current.once('styledata', () => {
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
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mapLayer]);

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

  // Debounced directions fetch when waypoints or route mode changes
  useEffect(() => {
    // Clear any pending timer
    if (directionsTimerRef.current) {
      clearTimeout(directionsTimerRef.current);
      directionsTimerRef.current = null;
    }

    // Reset directions state when switching to straight mode or too few waypoints
    if (routeMode === 'straight' || waypoints.length < 2 || !mapLoaded) {
      lastDirectionsCoordsRef.current = '';
      setDirectionsGeometry(null);
      setDirectionsLegDistances(null);
      setDirectionsLegDurations(null);
      setDirectionsError(null);
      setDirectionsWarnings([]);
      setDirectionsLoading(false);
      return;
    }

    // Build a fingerprint from coordinates + mode + roundTrip to detect actual route changes.
    // This prevents re-fetching when only distances were updated by applyDirectionsDistances.
    const fingerprint = waypoints.map(w => `${w.coordinates.lat},${w.coordinates.lng}`).join('|')
      + `::${routeMode}::${isRoundTrip}`;

    if (fingerprint === lastDirectionsCoordsRef.current) {
      return; // Coordinates haven't changed, skip fetch
    }
    // NOTE: fingerprint ref is set inside the timer callback below, not here.
    // Setting it here would cause React strict mode (dev only) to skip the fetch
    // on remount: strict mode runs cleanup (clears timer) then re-runs the effect,
    // but the ref already matches so it returns early and directions never load.

    // Clear stale directions data so the applyDirectionsDistances effect
    // doesn't re-apply old distances and trigger a waypoints update that
    // would cancel our timer before it fires.
    setDirectionsGeometry(null);
    setDirectionsLegDistances(null);
    setDirectionsLegDurations(null);
    setDirectionsWarnings([]);
    setDirectionsLoading(true);

    directionsTimerRef.current = setTimeout(() => {
      lastDirectionsCoordsRef.current = fingerprint;
      fetchDirectionsRoute(waypoints, routeMode);
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
  }, [waypoints, routeMode, isRoundTrip, mapLoaded]);

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
        el.style.cssText = 'cursor: pointer;';

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
          el.style.cssText += ` width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;`;
          el.innerHTML = `
            <div style="width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; transform: rotate(45deg); background: #616161; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2);">
              <span style="transform: rotate(-45deg); color: white; font-size: 12px; font-weight: bold; line-height: 1; font-family: Jost, system-ui, sans-serif;">${positionNumber}</span>
            </div>
          `;
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedWaypoint(waypoint.id);
        });

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
          draggable: !isConverted,
        })
          .setLngLat([waypoint.coordinates.lng, waypoint.coordinates.lat])
          .addTo(map.current!);

        if (!isConverted) {
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
          });
        }

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

    // Add entry markers with clustering — only for legacy entries not linked to any waypoint
    // (Linked entries are already represented by converted waypoint markers above)
    const linkedEntryIds = new Set<string>();
    waypoints.forEach(wp => {
      (wp.entryIds || []).forEach(eid => linkedEntryIds.add(eid));
    });
    const legacyEntries = expeditionEntries.filter(e => !linkedEntryIds.has(e.id));

    if (legacyEntries.length > 0) {
      const result = renderClusteredMarkers({
        entries: legacyEntries,
        map: map.current!,
        mapContainerRef: mapContainer,
        onSingleEntryClick: () => {},
        onClusterClick: () => {},
      });
      entryMarkersRef.current = result.markers;
      clusteredEntryRef.current = result;
      map.current!.on('zoomend', result.recalculate);
    }

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
          if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
          if (map.current.getLayer('route-line-casing')) map.current.removeLayer('route-line-casing');
          map.current.removeSource('route');
        }
      } catch {
        // Source/layer may already be removed
      }

      // Build route coordinates from routeItems order (matches sidebar)
      const hasWaypointRoute = waypoints.length > 1;
      const useDirections = hasWaypointRoute && routeMode !== 'straight' && directionsGeometry && directionsGeometry.length > 0;

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
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }
          });

          map.current.addLayer({
            id: 'route-line-casing',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': getLineCasingColor(mapLayer, theme),
              'line-width': useDirections ? 8 : 7,
              'line-opacity': 0.3,
            }
          });
          map.current.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': theme === 'dark' ? '#4676ac' : '#202020',
              'line-width': useDirections ? 4 : 3,
              'line-opacity': 0.8,
              ...(useDirections ? {} : { 'line-dasharray': [2, 2] })
            }
          });

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
        const targetZoom = 8;

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
  }, [waypoints, mapLoaded, mapZoom, isRoundTrip, routeMode, directionsGeometry, directionsLoading, expeditionEntries, routeOrder]);

  // Delete waypoint
  const handleDeleteWaypoint = (id: string) => {
    const filtered = waypoints.filter(w => w.id !== id);

    if (filtered.length === 0) {
      setWaypoints([]);
      setSelectedWaypoint(null);
      setIsRoundTrip(false);
      return;
    }

    // Reset round trip if only 1 waypoint left
    if (filtered.length === 1) {
      setIsRoundTrip(false);
    }

    // Update sequence numbers
    const updated = filtered.map((w, index) => ({
      ...w,
      sequence: index,
    }));
    setWaypoints(updateDistances(updated));
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

    // Also update waypoint array order to match route order for waypoints
    const waypointIdsInOrder = updated.filter(id => waypoints.some(w => w.id === id));
    const reorderedWaypoints = waypointIdsInOrder
      .map(id => waypoints.find(w => w.id === id)!)
      .map((w, i) => ({ ...w, sequence: i }));
    if (reorderedWaypoints.length === waypoints.length) {
      setWaypoints(updateDistances(reorderedWaypoints));
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
    if (routeMode !== 'straight' && directionsGeometry && directionsGeometry.length > 0) {
      return directionsGeometry;
    }
    return waypoints.map(w => [w.coordinates.lng, w.coordinates.lat]);
  }, [routeMode, directionsGeometry, waypoints]);

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
    if (routeMode !== 'straight' && directionsLoading) return;
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

  // Curated quick-pick categories relevant to expedition/exploration use cases
  const QUICK_PICK_IDS = [
    'restaurant', 'cafe', 'hotel', 'lodging', 'gas_station', 'grocery',
    'supermarket', 'pharmacy', 'hospital', 'campground', 'parking',
    'atm', 'post_office', 'drinking_water', 'laundry', 'bar',
  ];
  const quickPickCategories = QUICK_PICK_IDS
    .map(id => allCategories.find(c => c.id === id))
    .filter((c): c is POICategory => c != null);

  // When user types a filter, search all categories; otherwise show quick-picks only
  const filteredCategories = categoryFilter
    ? allCategories.filter(c => c.name.toLowerCase().includes(categoryFilter.toLowerCase()))
    : quickPickCategories;

  // Calculate total statistics — use route-order distances (computed after routeItems)
  const totalTravelTime = waypoints[waypoints.length - 1]?.cumulativeTravelTime || 0;
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
  ].sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());

  // Sync routeOrder when items change (add/remove)
  useEffect(() => {
    const currentIds = new Set(dateSortedItems.map(r => r.id));
    const existingIds = new Set(routeOrder);
    const removed = routeOrder.some(id => !currentIds.has(id));
    const added = [...currentIds].filter(id => !existingIds.has(id));

    if (added.length > 0 || removed) {
      const cleaned = routeOrder.filter(id => currentIds.has(id));
      // Insert new items at date-sorted positions
      for (const newId of added) {
        const newItem = dateSortedItems.find(r => r.id === newId);
        if (!newItem) continue;
        let insertIdx = cleaned.length;
        for (let i = 0; i < cleaned.length; i++) {
          const existing = dateSortedItems.find(r => r.id === cleaned[i]);
          if (existing && newItem.date && existing.date && newItem.date < existing.date) {
            insertIdx = i;
            break;
          }
        }
        cleaned.splice(insertIdx, 0, newId);
      }
      setRouteOrder(cleaned);
    } else if (routeOrder.length === 0 && dateSortedItems.length > 0) {
      setRouteOrder(dateSortedItems.map(r => r.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints.length, unlinkedEntryList.length, waypoints.map(w => w.id).join(',')]);

  // Build routeItems from routeOrder (or fall back to date sort)
  const routeItemsById = new Map(dateSortedItems.map(r => [r.id, r]));
  const routeItems: RouteItem[] = routeOrder.length > 0
    ? routeOrder.map(id => routeItemsById.get(id)).filter((r): r is RouteItem => r !== undefined)
    : dateSortedItems;

  // Compute distances based on routeItems display order (not waypoints array order)
  const routeDistances = (() => {
    const map = new Map<string, { distFromPrev: number; cumulative: number }>();
    let cumulative = 0;
    let prevCoords: { lat: number; lng: number } | null = null;
    for (const item of routeItems) {
      if (item.kind !== 'waypoint') continue;
      const coords = item.waypoint.coordinates;
      if (!prevCoords) {
        map.set(item.id, { distFromPrev: 0, cumulative: 0 });
      } else {
        const dist = haversineFromLatLng(prevCoords, coords);
        cumulative += dist;
        map.set(item.id, { distFromPrev: dist, cumulative });
      }
      prevCoords = coords;
    }
    return map;
  })();

  // Total distance from route-order computation
  const lastWpInRoute = [...routeDistances.values()].pop();
  const totalDistance = lastWpInRoute?.cumulative || 0;

  // Start/End IDs — first and last in the combined route list
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
            <Link href={`/expedition/${expeditionId}`} className="hover:text-[#ac6d46]">{expeditionData.title || 'EXPEDITION'}</Link>
            {' > '}
            <span className="text-[#e5e5e5]">EDIT DETAILS & WAYPOINTS</span>
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
            {totalTravelTime > 0 && routeMode !== 'straight' && (
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
                className="px-5 py-2 border-2 border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] text-xs"
              >
                START FRESH
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
              maxLength={200}
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

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              START DATE <span className="text-[#ac6d46]">*</span>
              {isEditMode && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span>}
            </label>
            <DatePicker
              value={expeditionData.startDate}
              onChange={handleStartDateChange}
              max={expeditionData.endDate || undefined}
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
              disabled={isEditMode}
            />
          </div>

          {/* End Date / Duration - same layout as start date */}
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

            {/* Route Mode Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold dark:text-[#e5e5e5] whitespace-nowrap">ROUTE:</span>
              <div className="flex border-2 border-[#202020] dark:border-[#616161]">
                {([
                  { value: 'straight', label: 'Straight Line', pro: false },
                  { value: 'walking', label: 'Walking', pro: true },
                  { value: 'cycling', label: 'Cycling', pro: true },
                  { value: 'driving', label: 'Driving', pro: true },
                ] as { value: RouteMode; label: string; pro: boolean }[]).map(mode => {
                  const disabled = waypoints.length < 2 || (mode.pro && !isPro);
                  return (
                    <button
                      key={mode.value}
                      onClick={() => !disabled && setRouteMode(mode.value)}
                      disabled={disabled}
                      className={`px-3 py-1.5 text-xs font-bold transition-all ${
                        routeMode === mode.value
                          ? 'bg-[#ac6d46] text-white'
                          : 'bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a]'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} border-r border-[#202020] dark:border-[#616161] last:border-r-0`}
                      title={mode.pro && !isPro ? 'Explorer Pro required' : undefined}
                    >
                      {mode.label}
                      {mode.pro && !isPro && <Lock size={10} className="inline ml-1 -mt-0.5" />}
                    </button>
                  );
                })}
              </div>
              {directionsLoading && (
                <Loader2 size={16} className="animate-spin text-[#ac6d46]" />
              )}
              {!isPro && (
                <span className="text-xs text-[#ac6d46] font-bold">PRO</span>
              )}
            </div>
          </div>

          {/* Directions error message */}
          {directionsError && routeMode !== 'straight' && (
            <div className="mt-2 px-3 py-2 bg-[#fff8dc] dark:bg-[#3a2f1f] border border-[#ac6d46] text-xs text-[#ac6d46] font-bold flex items-center gap-2">
              <Info size={14} className="flex-shrink-0" />
              {directionsError} — showing straight-line fallback
            </div>
          )}

          {/* Inaccessible waypoint warnings */}
          {directionsWarnings.length > 0 && routeMode !== 'straight' && (
            <div className="mt-2 px-3 py-2 bg-[#fff8dc] dark:bg-[#3a2f1f] border border-[#ac6d46] text-xs text-[#ac6d46]">
              <div className="font-bold flex items-center gap-2 mb-1">
                <Info size={14} className="flex-shrink-0" />
                {directionsWarnings.length === 1 ? '1 waypoint' : `${directionsWarnings.length} waypoints`} may be inaccessible by {routeMode}
              </div>
              <ul className="ml-5 space-y-0.5 list-disc">
                {directionsWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
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

            {/* Reset Map View Button */}
            {!mapError && waypoints.length > 0 && (
              <button
                onClick={handleResetMapView}
                className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all"
                aria-label="Reset map view to show all waypoints"
                title="Reset view to show all waypoints"
              >
                <Locate size={20} />
              </button>
            )}

            {/* Directions Loading Overlay */}
            {directionsLoading && routeMode !== 'straight' && (
              <div className="absolute bottom-4 left-4 z-10 px-3 py-2 bg-white/90 dark:bg-[#202020]/90 border-2 border-[#ac6d46] flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[#ac6d46]" />
                <span className="text-xs font-bold text-[#ac6d46]">Calculating route...</span>
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
                    <div>• Toggle route mode for road/trail distances</div>
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

                        {/* Date */}
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
                            DESCRIPTION {selectedWaypointData.entryIds.length === 0 && <><span className="text-[#616161] dark:text-[#b5bcc4]">(Optional)</span> <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">({(selectedWaypointData.description || '').length}/500)</span></>}
                          </label>
                          {selectedWaypointData.entryIds.length > 0 ? (
                            <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border border-[#b5bcc4] dark:border-[#616161] px-3 py-2 text-sm dark:text-[#e5e5e5] min-h-[120px]">
                              {selectedWaypointData.description || '—'}
                            </div>
                          ) : (
                            <textarea
                              value={selectedWaypointData.description || ''}
                              onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { description: e.target.value })}
                              maxLength={500}
                              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                              rows={8}
                              placeholder="Add notes about this waypoint..."
                            />
                          )}
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            {selectedWaypointData.entryIds.length > 0
                              ? 'Locked — edit this entry to change description'
                              : 'Max 500 characters • Add notes, observations, or details'}
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
                          {(() => {
                            const rd = routeDistances.get(selectedWaypointData.id);
                            return rd && rd.distFromPrev > 0 ? (
                              <div className="flex justify-between">
                                <span>Distance from Previous:</span>
                                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatDistance(rd.distFromPrev, 1)}</span>
                              </div>
                            ) : null;
                          })()}
                          {selectedWaypointData.travelTimeFromPrevious !== undefined && selectedWaypointData.travelTimeFromPrevious > 0 && (
                            <div className="flex justify-between">
                              <span>Travel Time from Previous:</span>
                              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatTravelTime(selectedWaypointData.travelTimeFromPrevious)}</span>
                            </div>
                          )}
                          {(() => {
                            const rd = routeDistances.get(selectedWaypointData.id);
                            return rd && rd.cumulative > 0 ? (
                              <div className="flex justify-between">
                                <span>Cumulative Distance:</span>
                                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatDistance(rd.cumulative, 1)}</span>
                              </div>
                            ) : null;
                          })()}
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
                <div className="px-4 py-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] sticky top-0 z-10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold dark:text-[#e5e5e5] whitespace-nowrap">ROUTE ({routeItems.length})</h3>
                    <div className="flex items-center gap-3">
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
                      {waypoints.length > 0 && (
                        <button
                          onClick={() => setConfirmingClearAll(true)}
                          className="text-[10px] text-[#ac6d46] hover:text-[#8a5738] font-bold transition-all whitespace-nowrap"
                        >
                          CLEAR ALL
                        </button>
                      )}
                    </div>
                  </div>
                  {totalDistance > 0 && (
                    <div className="text-[10px] text-[#4676ac] font-mono">
                      {formatDistance(totalDistance, 1)} total
                      {totalTravelTime > 0 && routeMode !== 'straight' && (
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
                            disabled={routeSearchLoading || (routeMode !== 'straight' && directionsLoading)}
                            className={`px-2.5 py-1 text-[10px] font-bold border transition-all ${
                              activeCategory === cat.id
                                ? 'bg-[#4676ac] text-white border-[#4676ac]'
                                : 'bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] border-[#b5bcc4] dark:border-[#616161] hover:border-[#4676ac] hover:text-[#4676ac]'
                            } ${routeSearchLoading || (routeMode !== 'straight' && directionsLoading) ? 'opacity-50 cursor-wait' : ''}`}
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
                                {routeItems.length > 1 && waypoint.entryIds.length === 0 && (
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
                                ) : (
                                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: isStart || isEnd ? '32px' : '28px', height: isStart || isEnd ? '32px' : '28px' }}>
                                    <div
                                      className="flex items-center justify-center text-white font-bold"
                                      style={{
                                        width: isStart || isEnd ? '24px' : '20px',
                                        height: isStart || isEnd ? '24px' : '20px',
                                        transform: 'rotate(45deg)',
                                        backgroundColor: isStart ? '#ac6d46' : isEnd ? '#4676ac' : '#616161',
                                        border: isStart && isRoundTrip ? '2px solid #4676ac' : '2px solid white',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                                      }}
                                    >
                                      <span style={{ transform: 'rotate(-45deg)', fontSize: isStart || isEnd ? '12px' : '10px', lineHeight: '1' }}>
                                        {isStart ? 'S' : isEnd ? 'E' : positionNumber}
                                      </span>
                                    </div>
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
                                    <div className="truncate">{Math.abs(waypoint.coordinates.lat).toFixed(4)}°{waypoint.coordinates.lat >= 0 ? 'N' : 'S'}, {Math.abs(waypoint.coordinates.lng).toFixed(4)}°{waypoint.coordinates.lng >= 0 ? 'E' : 'W'}</div>
                                    {waypoint.date && (
                                      <div className="text-[#ac6d46]">{waypoint.date}</div>
                                    )}
                                    {(() => {
                                      const rd = routeDistances.get(waypoint.id);
                                      return rd && rd.distFromPrev > 0 ? (
                                        <div className="text-[#4676ac]">
                                          +{formatDistance(rd.distFromPrev, 1)}
                                          {waypoint.travelTimeFromPrevious ? ` (${formatTravelTime(waypoint.travelTimeFromPrevious)})` : ''}
                                          <> • {formatDistance(rd.cumulative, 1)} total</>
                                        </div>
                                      ) : null;
                                    })()}
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
                            <div className="h-px bg-[#202020] dark:bg-[#616161]" />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
                  CATEGORY <span className="text-[#ac6d46]">*</span>
                  {/* isEditMode && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span> - DISABLED FOR TESTING */}
                </label>
                <select
                  value={expeditionData.category}
                  onChange={(e) => setExpeditionData({ ...expeditionData, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                  /* disabled={isEditMode} - DISABLED FOR TESTING */
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

            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
                  STATUS (AUTO-COMPUTED)
                </label>
                <div className="px-3 py-2.5 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#2a2a2a] text-sm font-bold dark:text-[#e5e5e5] uppercase">
                  {status}
                </div>
              </div>

              {/* Current Location - Only for ACTIVE expeditions and Edit Mode */}
              {status === 'active' && isEditMode && (
                <div>
                  <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                    CURRENT LOCATION
                    <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                    <span className="ml-2 px-2 py-0.5 bg-[#4676ac] text-white text-xs font-bold">ACTIVE EXPEDITION</span>
                  </label>
                  
                  <CurrentLocationSelector
                    waypoints={waypoints.map(wp => ({
                      id: wp.id,
                      title: wp.name,
                      location: wp.location || '',
                      coords: { lat: wp.coordinates.lat, lng: wp.coordinates.lng },
                      date: wp.date || '',
                      status: 'planned' as const,
                      notes: wp.description
                    }))}
                    journalEntries={expeditionEntries.map(e => ({
                      id: e.id,
                      title: e.title,
                      location: e.place,
                      coords: e.coords,
                      date: e.date,
                      excerpt: '',
                      type: 'standard' as const,
                      mediaCount: 0,
                      views: 0,
                      visibility: 'public' as const,
                    }))}
                    selectedSource={currentLocationSource}
                    selectedId={currentLocationId}
                    onSourceChange={setCurrentLocationSource}
                    onLocationChange={setCurrentLocationId}
                    disabled={false}
                  />
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
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161]"
            />
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
              Min 100 characters • Max 1000 characters
            </p>
          </div>

          {/* Cover Photo */}
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

          {/* Sponsorships */}
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

          {/* Expedition Notes Visibility - Pro only */}
          {isPro && expeditionData.visibility !== 'private' && <div className="mt-6 border-2 border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
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

          {/* Privacy Settings - Radio buttons matching quick entry */}
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
        </div>
      </div>

      {/* Action Buttons - Bottom */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mt-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => handleCreateExpedition(false)}
            disabled={isSubmitting || uploadingCover}
            className="px-6 py-3 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            <span>{isSubmitting ? 'PUBLISHING...' : (isEditMode ? 'SAVE CHANGES' : 'LAUNCH EXPEDITION')}</span>
          </button>
          {!isEditMode && (
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
            Expedition builder v1.0 • Route: {routeMode === 'straight' ? 'Haversine (straight-line)' : `Mapbox Directions (${routeMode})`} • {waypoints.length} waypoints defined
          </div>
          <Link
            href={isEditMode ? `/expedition/${expeditionId}` : '/select-expedition'}
            className="text-xs text-[#4676ac] hover:underline font-bold"
          >
            {isEditMode ? '← BACK TO EXPEDITION' : 'cancel and return to selection'}
          </Link>
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