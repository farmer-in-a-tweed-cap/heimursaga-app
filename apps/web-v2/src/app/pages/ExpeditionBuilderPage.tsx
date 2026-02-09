'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { MapPin, Plus, Trash2, Save, FileText, Calendar, Upload, Info, X, Locate, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { CurrentLocationSelector } from '@/app/components/CurrentLocationSelector';
import { expeditionApi, uploadApi } from '@/app/services/api';
import { formatDateTime } from '@/app/utils/dateFormat';
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
}

interface ExpeditionData {
  title: string;
  region: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  isPublic: boolean;
}

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const MAPBOX_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

export function ExpeditionBuilderPage() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { isPro } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const isEditMode = !!expeditionId;
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const waypointsRef = useRef<Waypoint[]>([]);
  const originalWaypointIdsRef = useRef<string[]>([]); // Track API waypoint IDs loaded in edit mode
  const reorderNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionsAbortRef = useRef<AbortController | null>(null);
  const lastDirectionsCoordsRef = useRef<string>(''); // Fingerprint to prevent re-fetch loops

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Route mode / Directions API state
  const [routeMode, setRouteMode] = useState<RouteMode>('straight');
  const [directionsGeometry, setDirectionsGeometry] = useState<[number, number][] | null>(null);
  const [directionsLegDistances, setDirectionsLegDistances] = useState<number[] | null>(null);
  const [directionsLegDurations, setDirectionsLegDurations] = useState<number[] | null>(null); // seconds per leg
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [directionsWarnings, setDirectionsWarnings] = useState<string[]>([]);

  const [expeditionData, setExpeditionData] = useState<ExpeditionData>({
    title: '',
    region: '',
    description: '',
    category: '',
    startDate: '',
    endDate: '',
    isPublic: true
  });

  const [sponsorshipsEnabled, setSponsorshipsEnabled] = useState(false);
  const [sponsorshipGoal, setSponsorshipGoal] = useState<number | ''>('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentLocationSource, setCurrentLocationSource] = useState<'waypoint' | 'entry'>('waypoint');
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [tags, setTags] = useState('');
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null); // Uploaded URL for API
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [mockEntries, setMockEntries] = useState<Array<{id: string, title: string, location: string, date: string, coords: {lat: number, lng: number}, type: 'standard' | 'photo-essay' | 'data-log' | 'waypoint'}>>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Allowed image types for cover photo
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB

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
      setSubmitError('Cover photo must be less than 10MB');
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
    } catch (_err) {
      setSubmitError('Failed to upload cover photo');
      setCoverPhotoPreview(null);
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle expedition creation/update
  const handleCreateExpedition = async (createFirstEntry = false) => {
    if (!expeditionData.title.trim()) {
      setSubmitError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        title: expeditionData.title,
        description: expeditionData.description,
        public: expeditionData.isPublic,
        status: computeStatus(),
        startDate: expeditionData.startDate || undefined,
        endDate: expeditionData.endDate || undefined,
        coverImage: coverPhotoUrl || undefined,
        goal: sponsorshipsEnabled && sponsorshipGoal ? Number(sponsorshipGoal) : undefined,
        isRoundTrip,
        category: expeditionData.category || undefined,
        region: expeditionData.region || undefined,
        routeMode: routeMode !== 'straight' ? routeMode : undefined,
        routeGeometry: routeMode !== 'straight' && directionsGeometry ? directionsGeometry : undefined,
      };

      let expeditionPublicId: string;

      if (isEditMode && expeditionId) {
        await expeditionApi.update(expeditionId, payload);
        expeditionPublicId = expeditionId;

        // Sync waypoints: update existing, create new, delete removed
        const currentWaypointIds = new Set(
          waypoints.filter(w => !w.id.startsWith('waypoint-')).map(w => w.id)
        );

        // Delete waypoints that were removed (ones from API that are no longer in state)
        for (const originalId of originalWaypointIdsRef.current) {
          if (!currentWaypointIds.has(originalId)) {
            await expeditionApi.deleteWaypoint(expeditionPublicId, originalId);
          }
        }

        // Update existing and create new waypoints
        for (const waypoint of waypoints) {
          if (waypoint.id.startsWith('waypoint-')) {
            // New waypoint - create it
            await expeditionApi.createWaypoint(expeditionPublicId, {
              title: waypoint.name,
              lat: waypoint.coordinates.lat,
              lon: waypoint.coordinates.lng,
              date: waypoint.date || undefined,
              description: waypoint.description || undefined,
              sequence: waypoint.sequence,
            });
          } else {
            // Existing waypoint - update it
            await expeditionApi.updateWaypoint(expeditionPublicId, waypoint.id, {
              title: waypoint.name,
              lat: waypoint.coordinates.lat,
              lon: waypoint.coordinates.lng,
              date: waypoint.date || undefined,
              description: waypoint.description || undefined,
              sequence: waypoint.sequence,
            });
          }
        }
      } else {
        const result = await expeditionApi.create(payload);
        expeditionPublicId = (result as any).expeditionId || (result as any).id;

        // Create waypoints for the new expedition
        for (const waypoint of waypoints) {
          await expeditionApi.createWaypoint(expeditionPublicId, {
            title: waypoint.name,
            lat: waypoint.coordinates.lat,
            lon: waypoint.coordinates.lng,
            date: waypoint.date || undefined,
            description: waypoint.description || undefined,
            sequence: waypoint.sequence,
          });
        }
      }

      if (createFirstEntry) {
        router.push(`/create-entry/${expeditionPublicId}`);
      } else {
        router.push(`/expedition/${expeditionPublicId}`);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create expedition');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-compute status based on dates
  const computeStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    
    if (!expeditionData.startDate) return 'planned';
    
    if (expeditionData.endDate && expeditionData.endDate < today) {
      return 'completed';
    }
    
    if (expeditionData.startDate > today) {
      return 'planned';
    }
    
    return 'active';
  };

  const status = computeStatus();

  // Calculate end date from start date + duration
  const handleDurationChange = (days: string) => {
    setExpectedDuration(days);
    
    if (days && expeditionData.startDate) {
      const start = new Date(expeditionData.startDate);
      const durationNum = parseInt(days);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum);
        setExpeditionData({ ...expeditionData, endDate: end.toISOString().split('T')[0] });
      }
    }
  };

  // Calculate duration from start and end dates
  const handleEndDateChange = (date: string) => {
    setExpeditionData({ ...expeditionData, endDate: date });
    
    if (date && expeditionData.startDate) {
      const start = new Date(date);
      const end = new Date(expeditionData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  // Update duration when start date changes
  const handleStartDateChange = (date: string) => {
    setExpeditionData({ ...expeditionData, startDate: date });

    // Recalculate end date if duration is set
    if (expectedDuration && date) {
      const start = new Date(date);
      const durationNum = parseInt(expectedDuration);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum);
        setExpeditionData({ ...expeditionData, startDate: date, endDate: end.toISOString().split('T')[0] });
      }
    } else if (expeditionData.endDate && date) {
      // Recalculate duration if end date is set
      const start = new Date(date);
      const end = new Date(expeditionData.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  // Keep ref in sync with state
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);

  // Calculate distance between two coordinates (Haversine formula - as the crow flies)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Update distances when waypoints change
  const updateDistances = (points: Waypoint[]): Waypoint[] => {
    let cumulative = 0;
    return points.map((point, index) => {
      if (index === 0) {
        return { ...point, distanceFromPrevious: 0, cumulativeDistance: 0 };
      }
      const prev = points[index - 1];
      const distance = calculateDistance(
        prev.coordinates.lat,
        prev.coordinates.lng,
        point.coordinates.lat,
        point.coordinates.lng
      );
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
  const describeDirectionsError = (data: any, points: Waypoint[], profile: string): string => {
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
            badWaypoints.push(points[idx]?.name || `Waypoint ${idx + 1}`);
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
  const fetchDirectionsRoute = async (points: Waypoint[], profile: string) => {
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
        setDirectionsLegDistances(allLegDistances);
        setDirectionsLegDurations(allLegDurations);

        // Check for waypoints that were snapped far from their input location
        const warnings: string[] = [];
        const waypointCount = isRoundTrip ? snapDistances.length - 1 : snapDistances.length;
        for (let i = 0; i < waypointCount && i < points.length; i++) {
          if (snapDistances[i] > SNAP_THRESHOLD_M) {
            const name = points[i].name || `Waypoint ${i + 1}`;
            const km = (snapDistances[i] / 1000).toFixed(1);
            warnings.push(`${name} is ${km} km from the nearest ${profile} route`);
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
          region: expedition.region || '',
          description: expedition.description || '',
          category: expedition.category || '',
          startDate: expedition.startDate ? new Date(expedition.startDate).toISOString().split('T')[0] : '',
          endDate: expedition.endDate ? new Date(expedition.endDate).toISOString().split('T')[0] : '',
          isPublic: expedition.public !== false
        });

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

        // Set round trip status
        if (expedition.isRoundTrip) {
          setIsRoundTrip(true);
        }

        // Restore route mode from saved expedition
        if (expedition.routeMode && expedition.routeMode !== 'straight') {
          setRouteMode(expedition.routeMode as RouteMode);
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
            type: index === 0 ? 'start' : (index === expedition.waypoints!.length - 1 ? 'end' : 'standard'),
            coordinates: { lat: wp.lat || 0, lng: wp.lon || 0 },
            location: '', // Not in API response
            date: wp.date ? new Date(wp.date).toISOString().split('T')[0] : '',
            description: wp.description || ''
          }));
          originalWaypointIdsRef.current = transformedWaypoints.map(wp => wp.id);
          setWaypoints(updateDistances(transformedWaypoints));
        }

        setIsLoading(false);
      } catch (_err) {
        setIsLoading(false);
        setSubmitError('Failed to load expedition data');
      }
    };

    loadExpedition();
  }, [expeditionId, isEditMode]);

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
        style: theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
        center: [-98.5795, 39.8283],
        zoom: 3,
        projection: 'mercator'
      });

      map.current = newMap;

      // Add error handler - suppress style evaluation warnings
      newMap.on('error', (e) => {
        // Suppress Mapbox style expression evaluation warnings (non-critical)
        if (e.error?.message?.includes('evaluated to null but was expected to be of type') ||
            e.error?.message?.includes('Failed to evaluate expression')) {
          return; // These are harmless warnings from Mapbox's internal style
        }
        setMapError('Failed to load map. Please check your Mapbox token.');
      });

      // Add geocoder control
      const geocoder = new MapboxGeocoder({
        accessToken: MAPBOX_TOKEN,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: 'Search for a location...',
      });
      newMap.addControl(geocoder as any, 'top-left');

      // Add navigation control
      newMap.addControl(new mapboxgl.NavigationControl(), 'top-left');

      // Set map loaded when style is loaded
      newMap.on('load', () => {
        setMapLoaded(true);
        // Force resize to ensure map renders properly
        setTimeout(() => {
          newMap.resize();
        }, 100);
      });

      // Add click handler for adding waypoints
      newMap.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        const currentWaypoints = waypointsRef.current;

        // Create new waypoint - simply append to end (no date, no resequencing)
        const newWaypoint: Waypoint = {
          id: `waypoint-${Date.now()}`,
          sequence: currentWaypoints.length,
          name: `Waypoint ${currentWaypoints.length + 1}`,
          type: 'standard',
          coordinates: { lat, lng },
          location: '',
          date: '',
          description: ''
        };

        setWaypoints(prev => {
          const all = [...prev, newWaypoint];
          // Just update sequence numbers and types, no date-based sorting
          const resequenced = all.map((w, index) => ({
            ...w,
            sequence: index,
            type: (index === 0 ? 'start' : index === all.length - 1 ? 'end' : 'standard') as 'start' | 'end' | 'standard',
          }));
          return updateDistances(resequenced);
        });
      });

    } catch (_error) {
      setMapError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isLoading, theme]);

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    setMapLoaded(false); // Will be set back to true when new style loads
    const newStyle = theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT;
    map.current.setStyle(newStyle);

    // Wait for new style to load
    map.current.once('styledata', () => {
      setMapLoaded(true);
    });
  }, [theme]);

  // Hide instructions overlay when map moves
  useEffect(() => {
    if (!map.current) return;

    const hideInstructions = () => setShowInstructions(false);
    map.current.on('movestart', hideInstructions);

    return () => {
      map.current?.off('movestart', hideInstructions);
    };
  }, [mapLoaded]);

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
    lastDirectionsCoordsRef.current = fingerprint;

    // Clear stale directions data so the applyDirectionsDistances effect
    // doesn't re-apply old distances and trigger a waypoints update that
    // would cancel our timer before it fires.
    setDirectionsGeometry(null);
    setDirectionsLegDistances(null);
    setDirectionsLegDurations(null);
    setDirectionsWarnings([]);
    setDirectionsLoading(true);

    directionsTimerRef.current = setTimeout(() => {
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

    // Add new markers
    waypoints.forEach((waypoint, index) => {
      const el = document.createElement('div');
      el.className = 'waypoint-marker';
      el.style.cssText = 'cursor: pointer;';

      const isStart = waypoint.type === 'start';
      const isEnd = waypoint.type === 'end' && !isRoundTrip;
      const isStartEnd = isStart || isEnd;

      if (isStartEnd) {
        // Start/End markers — larger with letter label
        const size = 36;
        const fillColor = (isStart && isRoundTrip) ? '#ac6d46' : isStart ? '#ac6d46' : '#4676ac';
        const strokeColor = (isStart && isRoundTrip) ? '#4676ac' : 'white';
        const label = isStart ? 'S' : 'E';
        el.style.cssText += ` width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;`;
        el.innerHTML = `
          <div style="position: relative; width: ${size}px; height: ${size}px;">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block;">
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3"/>
            </svg>
            <div style="position: absolute; top: 0; left: 0; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; pointer-events: none;">${label}</div>
          </div>
        `;
      } else {
        // Standard waypoint markers — gray numbered circles
        const size = 28;
        el.style.cssText += ` width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;`;
        el.innerHTML = `
          <div style="position: relative; width: ${size}px; height: ${size}px;">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display: block;">
              <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1.5}" fill="#616161" stroke="white" stroke-width="2"/>
            </svg>
            <div style="position: absolute; top: 0; left: 0; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; pointer-events: none;">${index + 1}</div>
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
        draggable: true
      })
        .setLngLat([waypoint.coordinates.lng, waypoint.coordinates.lat])
        .addTo(map.current!);

      // Handle marker drag end to update waypoint coordinates
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

      markers.current.push(marker);
    });

    // Draw route line - only if style is loaded
    if (!map.current.isStyleLoaded()) return;

    if (map.current.getSource('route')) {
      map.current.removeLayer('route-line');
      map.current.removeSource('route');
    }

    if (waypoints.length > 1) {
      // Use directions geometry if available, otherwise straight lines
      const useDirections = routeMode !== 'straight' && directionsGeometry && directionsGeometry.length > 0;

      let routeCoordinates: number[][];
      if (useDirections) {
        routeCoordinates = directionsGeometry;
      } else {
        routeCoordinates = waypoints.map(w => [w.coordinates.lng, w.coordinates.lat]);
        // If round trip is enabled, add the start point to the end
        if (isRoundTrip && waypoints.length > 0) {
          routeCoordinates.push([waypoints[0].coordinates.lng, waypoints[0].coordinates.lat]);
        }
      }

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
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#202020',
          'line-width': useDirections ? 4 : 3,
          'line-opacity': 0.8,
          ...(useDirections ? {} : { 'line-dasharray': [2, 2] })
        }
      });
    }
    
    // Zoom map to fit all waypoints (especially useful in edit mode)
    // Only animate if not already zoomed in past the target level
    if (waypoints.length > 0 && map.current) {
      const currentZoom = map.current.getZoom();
      const targetZoom = 8;
      
      // Skip fitBounds if already zoomed in past target level
      if (currentZoom <= targetZoom) {
        const bounds = new mapboxgl.LngLatBounds();
        waypoints.forEach(waypoint => {
          bounds.extend([waypoint.coordinates.lng, waypoint.coordinates.lat]);
        });
        
        map.current.fitBounds(bounds, {
          padding: 100,
          maxZoom: targetZoom,
          duration: 1000
        });
      }
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
    };
  }, [waypoints, mapLoaded, isRoundTrip, routeMode, directionsGeometry, directionsLoading]);

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

    // Update sequence numbers and types without date-based reordering
    const updated = filtered.map((w, index) => ({
      ...w,
      sequence: index,
      type: (index === 0 ? 'start' : index === filtered.length - 1 ? 'end' : 'standard') as 'start' | 'end' | 'standard',
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

    // Update sequence and type based on final position
    const resequenced = result.map((w, index) => ({
      ...w,
      sequence: index,
      type: (index === 0 ? 'start' : index === result.length - 1 ? 'end' : 'standard') as 'start' | 'end' | 'standard',
    }));

    return updateDistances(resequenced);
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

  // Calculate total statistics
  const totalDistance = waypoints[waypoints.length - 1]?.cumulativeDistance || 0;
  const totalTravelTime = waypoints[waypoints.length - 1]?.cumulativeTravelTime || 0;
  const waypointCount = waypoints.length;

  const selectedWaypointData = waypoints.find(w => w.id === selectedWaypoint);

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
                onClick={() => router.push('/auth?from=' + pathname)}
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

  // Show loading state in edit mode
  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8 text-center">
          <div className="text-[#616161] dark:text-[#b5bcc4] font-mono">
            Loading expedition data...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 text-xs text-[#b5bcc4] font-mono">
        <Link href="/" className="hover:text-[#ac6d46]">HOME</Link>
        {' > '}
        <Link href="/select-expedition" className="hover:text-[#ac6d46]">SELECT EXPEDITION</Link>
        {' > '}
        <span className="text-[#e5e5e5]">
          {isEditMode ? `EDIT: ${expeditionData.title || 'EXPEDITION'}` : 'CREATE NEW EXPEDITION'}
        </span>
      </div>

      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-2xl font-bold dark:text-[#e5e5e5]">
              EXPEDITION BUILDER
            </h1>
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${isEditMode ? 'bg-[#4676ac] text-white' : 'bg-[#ac6d46] text-white'}`}>
              {isEditMode ? 'EDIT' : 'CREATE'}
            </span>
            <div className="hidden md:block h-6 w-px bg-[#616161]" />
            <span className="hidden md:block text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
              {user?.username || 'explorer'} • {formatDateTime(new Date())}
            </span>
          </div>
          
          {/* Statistics - Responsive */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-[#ac6d46]">{waypointCount}</div>
              <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Waypoints</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-[#4676ac]">{totalDistance.toFixed(1)} km</div>
              <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Total Distance</div>
            </div>
            {totalTravelTime > 0 && routeMode !== 'straight' && (
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-[#616161] dark:text-[#e5e5e5]">{formatTravelTime(totalTravelTime)}</div>
                <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Travel Time</div>
              </div>
            )}
          </div>
        </div>
      </div>

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
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161]"
            />
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
              Clear, descriptive title for this expedition • Will appear in your journal and public listings
            </p>
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              REGION / LOCATION <span className="text-[#ac6d46]">*REQUIRED</span>
              {/* isEditMode && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span> - DISABLED FOR TESTING */}
            </label>
            <input
              type="text"
              value={expeditionData.region}
              onChange={(e) => setExpeditionData({ ...expeditionData, region: e.target.value })}
              placeholder="e.g., Russia, Eastern Europe to Pacific Coast"
              className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] placeholder:text-[#b5bcc4] dark:placeholder:text-[#616161]"
              /* disabled={isEditMode} - DISABLED FOR TESTING */
            />
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
              Geographic region or location identifier • Be as specific or broad as needed
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              START DATE <span className="text-[#ac6d46]">*</span>
              {isEditMode && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span>}
            </label>
            <div className="relative">
              <input
                type="date"
                value={expeditionData.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
                disabled={isEditMode}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161] dark:text-[#b5bcc4] pointer-events-none" />
            </div>
          </div>

          {/* End Date / Duration - same layout as start date */}
          <div>
            <label className="block text-xs font-medium mb-2 dark:text-[#e5e5e5]">
              END DATE <span className="text-[#ac6d46]">*</span>
              <span className="text-[#616161] dark:text-[#b5bcc4] ml-2 font-normal">or duration in days</span>
            </label>
            <div className="grid grid-cols-[1fr_auto_80px] gap-2 items-center">
              <div className="relative">
                <input
                  type="date"
                  value={expeditionData.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={expeditionData.startDate || undefined}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161] dark:text-[#b5bcc4] pointer-events-none" />
              </div>
              <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-bold">OR</span>
              <input
                type="number"
                value={expectedDuration}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
                placeholder="Days"
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
                      href="/select-expedition"
                      className="flex-1 px-4 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs md:text-sm font-bold text-center"
                    >
                      BACK TO SELECTION
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
                  <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                    <h3 className="text-sm font-bold">EDIT WAYPOINT</h3>
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
                            NAME <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">({(selectedWaypointData.name || '').length}/100)</span>
                          </label>
                          <input
                            type="text"
                            value={selectedWaypointData.name || ''}
                            onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { name: e.target.value })}
                            maxLength={100}
                            className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                            placeholder="e.g., Mountain Pass Summit"
                          />
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            Min 3 • Max 100 characters
                          </p>
                        </div>

                        {/* Location */}
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            LOCATION <span className="text-[#616161] dark:text-[#b5bcc4]">(Optional)</span> <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">({(selectedWaypointData.location || '').length}/150)</span>
                          </label>
                          <input
                            type="text"
                            value={selectedWaypointData.location || ''}
                            onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { location: e.target.value })}
                            maxLength={150}
                            className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                            placeholder="e.g., Near Almaty, Kazakhstan"
                          />
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            Max 150 characters • City, region, or landmark name
                          </p>
                        </div>

                        {/* Date */}
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            DATE
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              value={selectedWaypointData.date || ''}
                              onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { date: e.target.value })}
                              min={expeditionData.startDate || undefined}
                              max={expeditionData.endDate || undefined}
                              className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5] font-mono"
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161] dark:text-[#b5bcc4] pointer-events-none" />
                          </div>
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            {expeditionData.startDate && expeditionData.endDate
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
                            {selectedWaypointData.coordinates.lat.toFixed(6)}°N, {selectedWaypointData.coordinates.lng.toFixed(6)}°E
                          </div>
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            Coordinates are set automatically when you place the marker
                          </p>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-3">
                        {/* Description */}
                        <div>
                          <label className="block text-xs font-medium mb-1 dark:text-[#e5e5e5]">
                            DESCRIPTION <span className="text-[#616161] dark:text-[#b5bcc4]">(Optional)</span> <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">({(selectedWaypointData.description || '').length}/500)</span>
                          </label>
                          <textarea
                            value={selectedWaypointData.description || ''}
                            onChange={(e) => handleUpdateWaypoint(selectedWaypoint!, { description: e.target.value })}
                            maxLength={500}
                            className="w-full px-3 py-2 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none text-sm dark:text-[#e5e5e5]"
                            rows={8}
                            placeholder="Add notes about this waypoint..."
                          />
                          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            Max 500 characters • Add notes, observations, or details
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
                          {selectedWaypointData.distanceFromPrevious !== undefined && selectedWaypointData.distanceFromPrevious > 0 && (
                            <div className="flex justify-between">
                              <span>Distance from Previous:</span>
                              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{selectedWaypointData.distanceFromPrevious.toFixed(1)} km</span>
                            </div>
                          )}
                          {selectedWaypointData.travelTimeFromPrevious !== undefined && selectedWaypointData.travelTimeFromPrevious > 0 && (
                            <div className="flex justify-between">
                              <span>Travel Time from Previous:</span>
                              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{formatTravelTime(selectedWaypointData.travelTimeFromPrevious)}</span>
                            </div>
                          )}
                          {selectedWaypointData.cumulativeDistance !== undefined && (
                            <div className="flex justify-between">
                              <span>Cumulative Distance:</span>
                              <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{selectedWaypointData.cumulativeDistance.toFixed(1)} km</span>
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
                        All changes are saved automatically as you edit
                      </div>
                      
                      <div className="flex gap-3">
                        {/* Round Trip button - only for start point */}
                        {selectedWaypointData.type === 'start' && waypoints.length > 1 && (
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

                        {/* Delete Button - not for start point */}
                        {selectedWaypointData.type !== 'start' && (
                          <button
                            onClick={() => setConfirmingDelete(selectedWaypoint)}
                            className="flex-1 px-3 py-2 border-2 border-[#616161] dark:border-[#616161] bg-[#616161] dark:bg-[#4a4a4a] text-white hover:bg-[#202020] dark:hover:bg-[#616161] transition-all text-xs font-bold flex items-center justify-center gap-2"
                          >
                            <Trash2 size={14} />
                            DELETE WAYPOINT
                          </button>
                        )}

                        {/* Done Button */}
                        <button
                          onClick={() => { setSelectedWaypoint(null); setConfirmingDelete(null); }}
                          className="flex-1 px-3 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold flex items-center justify-center gap-2"
                        >
                          <Save size={14} />
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
                <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold dark:text-[#e5e5e5]">WAYPOINT LIST ({waypoints.length})</h3>
                    <div className="flex items-center gap-3">
                      {waypoints.length > 0 && (
                        <button
                          onClick={() => setConfirmingClearAll(true)}
                          className="text-xs text-[#ac6d46] hover:text-[#8a5738] font-bold transition-all"
                        >
                          CLEAR ALL
                        </button>
                      )}
                      <div className="text-xs text-[#4676ac] font-mono">
                        {totalDistance.toFixed(1)} km total
                        {totalTravelTime > 0 && routeMode !== 'straight' && (
                          <> • {formatTravelTime(totalTravelTime)}</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {waypoints.length === 0 ? (
                  <div className="p-6 text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-[#b5bcc4]" />
                    <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-1">No waypoints yet</p>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Click on the map to add your first waypoint
                    </p>
                  </div>
                ) : (
                  <div className="divide-y-2 divide-[#202020] dark:divide-[#616161]">
                    {waypoints.map((waypoint, index) => (
                      <div
                        key={waypoint.id}
                        onClick={() => setSelectedWaypoint(waypoint.id)}
                        className={`p-3 cursor-pointer transition-all ${
                          selectedWaypoint === waypoint.id
                            ? 'bg-[#fff8dc] dark:bg-[#3a2f1f]'
                            : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Marker Badge */}
                          <div
                            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{
                              width: waypoint.type === 'start' || (waypoint.type === 'end' && !isRoundTrip) ? '32px' : '28px',
                              height: waypoint.type === 'start' || (waypoint.type === 'end' && !isRoundTrip) ? '32px' : '28px',
                              fontSize: waypoint.type === 'start' || (waypoint.type === 'end' && !isRoundTrip) ? '14px' : '12px',
                              backgroundColor: waypoint.type === 'start' ? '#ac6d46' : (waypoint.type === 'end' && !isRoundTrip) ? '#4676ac' : '#616161',
                              border: waypoint.type === 'start' && isRoundTrip ? '3px solid #4676ac' : '2px solid white',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                            }}
                          >
                            {waypoint.type === 'start' ? 'S' : (waypoint.type === 'end' && !isRoundTrip) ? 'E' : index + 1}
                          </div>

                          {/* Waypoint Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5] truncate">
                              {waypoint.name || `Waypoint ${index + 1}`}
                            </div>
                            {waypoint.location && (
                              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] truncate mb-1">
                                {waypoint.location}
                              </div>
                            )}
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono space-y-0.5">
                              <div className="truncate">{waypoint.coordinates.lat.toFixed(4)}°N, {waypoint.coordinates.lng.toFixed(4)}°E</div>
                              {index > 0 && waypoint.distanceFromPrevious !== undefined && (
                                <div className="text-[#4676ac]">
                                  +{waypoint.distanceFromPrevious.toFixed(1)} km
                                  {waypoint.travelTimeFromPrevious ? ` (${formatTravelTime(waypoint.travelTimeFromPrevious)})` : ''}
                                  {waypoint.cumulativeDistance !== undefined && (
                                    <> • {waypoint.cumulativeDistance.toFixed(1)} km total</>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmingDelete(waypoint.id);
                            }}
                            className="text-[#ac6d46] hover:text-[#8a5738] transition-all flex-shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
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
                    journalEntries={mockEntries}
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
              <div className="relative border-2 border-[#ac6d46]">
                <img
                  src={coverPhotoPreview}
                  alt="Cover preview"
                  className="w-full h-48 object-cover"
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
                  Click or drag file here • JPG, PNG • Max 5MB • Recommended: 1200x600px
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
                    setExpeditionData({ ...expeditionData, isPublic: true });
                  }
                }}
                disabled={!isPro}
              />
              <label htmlFor="enable-sponsorships" className={`text-xs ${!isPro ? 'text-[#b5bcc4] dark:text-[#616161]' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                Allow others to financially support this expedition through the platform
              </label>
            </div>
            {!isPro && (
              <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <strong className="text-[#ac6d46]">PRO FEATURE:</strong> Receiving sponsorships requires Explorer Pro.
                <Link href="/settings/billing" className="text-[#4676ac] hover:underline ml-1">Upgrade to Pro</Link>
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
                  Set a funding goal for your expedition • Platform fee: 5% • Processing: 2.9% + $0.30
                </div>
              </div>
            )}
          </div>

          {/* Privacy Settings - Radio buttons matching quick entry */}
          <div className="mt-6 border-2 border-[#4676ac] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">
              VISIBILITY:
              {isEditMode && <span className="ml-2 text-xs text-[#616161] dark:text-[#b5bcc4]">(LOCKED)</span>}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="visibility-public"
                  name="visibility"
                  className="mt-1"
                  checked={expeditionData.isPublic}
                  onChange={() => setExpeditionData({ ...expeditionData, isPublic: true })}
                  disabled={isEditMode}
                />
                <label htmlFor="visibility-public" className={`text-xs ${isEditMode ? 'opacity-50' : ''}`}>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PUBLIC EXPEDITION</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Expedition and all journal entries are visible to everyone. Individual entries can still be set to private.
                  </div>
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  id="visibility-private"
                  name="visibility"
                  className="mt-1"
                  checked={!expeditionData.isPublic}
                  onChange={() => setExpeditionData({ ...expeditionData, isPublic: false })}
                  disabled={sponsorshipsEnabled || isEditMode}
                />
                <label htmlFor="visibility-private" className={`text-xs ${sponsorshipsEnabled || isEditMode ? 'opacity-50' : ''}`}>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PRIVATE EXPEDITION</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Expedition is hidden. <span className="font-bold text-[#ac6d46]">ALL journal entries in this expedition will be automatically locked to private.</span>
                  </div>
                </label>
              </div>
            </div>

            {sponsorshipsEnabled && (
              <div className="mt-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <strong className="text-[#ac6d46]">SPONSORSHIPS ENABLED:</strong> Expeditions with sponsorships enabled must remain public so sponsors can view the expedition they're supporting.
              </div>
            )}

            {!isEditMode && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-600 text-xs">
                <strong className="text-yellow-700 dark:text-yellow-500">⚠️ PERMANENT SETTING:</strong>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Visibility, category, region, and start date <span className="font-bold">cannot be edited after creation.</span> These fundamental expedition properties are locked to maintain expedition integrity and consistency for sponsors and readers.
                </div>
              </div>
            )}
            
            {isEditMode && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-[#4676ac] text-xs">
                <strong className="text-[#4676ac]">LOCKED FIELDS:</strong>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Visibility, category, region, and start date are locked for existing expeditions. Other fields including description, tags, and waypoints can be modified.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons - Bottom */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mt-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm font-bold flex items-center justify-center gap-2">
            <Save size={18} />
            <span>SAVE AS DRAFT</span>
          </button>
          <button
            onClick={() => handleCreateExpedition(false)}
            disabled={isSubmitting}
            className="px-6 py-3 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (isEditMode ? <Save size={18} /> : <Plus size={18} />)}
            <span>{isSubmitting ? 'SAVING...' : (isEditMode ? 'SAVE CHANGES' : 'CREATE EXPEDITION')}</span>
          </button>
          {!isEditMode && (
            <button
              onClick={() => handleCreateExpedition(true)}
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileText size={18} />
              <span>SAVE AND LOG FIRST ENTRY</span>
            </button>
          )}
          {submitError && (
            <div className="text-red-500 text-sm mt-2">{submitError}</div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-[#b5bcc4] dark:border-[#616161] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            Expedition builder v1.0 • Route: {routeMode === 'straight' ? 'Haversine (straight-line)' : `Mapbox Directions (${routeMode})`} • {waypoints.length} waypoints defined
          </div>
          <Link
            href="/select-expedition"
            className="text-xs text-[#4676ac] hover:underline font-bold"
          >
            ← CANCEL AND RETURN TO SELECTION
          </Link>
        </div>
      </div>

      {/* Delete Waypoint Confirmation Modal */}
      {confirmingDelete && (() => {
        const wp = waypoints.find(w => w.id === confirmingDelete);
        if (!wp) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#202020]/60" onClick={() => setConfirmingDelete(null)} />
            <div className="relative w-[90%] max-w-md bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
                <Trash2 size={18} />
                <h3 className="text-sm font-bold">DELETE WAYPOINT</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-1">
                  Are you sure you want to delete this waypoint?
                </p>
                <p className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-4">
                  "{wp.name}"
                </p>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6">
                  This action cannot be undone. The waypoint will be removed from your route.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmingDelete(null)}
                    className="flex-1 px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-xs font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteWaypoint(confirmingDelete);
                      setConfirmingDelete(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-xs font-bold"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Clear All Waypoints Confirmation Modal */}
      {confirmingClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#202020]/60" onClick={() => setConfirmingClearAll(false)} />
          <div className="relative w-[90%] max-w-md bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
              <Trash2 size={18} />
              <h3 className="text-sm font-bold">CLEAR ALL WAYPOINTS</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-4">
                Are you sure you want to remove all {waypoints.length} waypoints from this route?
              </p>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6">
                This action cannot be undone. All waypoints will be removed from the map and route.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmingClearAll(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-xs font-bold"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    setWaypoints([]);
                    setSelectedWaypoint(null);
                    setIsRoundTrip(false);
                    setConfirmingClearAll(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-xs font-bold"
                >
                  CLEAR ALL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}