import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Image, Platform, Keyboard, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { HTextField } from '@/components/ui/HTextField';
import { HButton } from '@/components/ui/HButton';
import { HCard } from '@/components/ui/HCard';
import { RadioOption } from '@/components/ui/RadioOption';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { CalendarPicker, fmtDateDisplay, todayISO } from '@/components/ui/CalendarPicker';
import HeimuMap, { WaypointMarker, HeimuMapRef, clusterMarkers } from '@/components/map/HeimuMap';
import { Svg, Path, Circle } from 'react-native-svg';
import { expeditionApi, uploadApi, ApiError } from '@/services/api';
let ExpoLocation: typeof import('expo-location') | null = null;
try { ExpoLocation = require('expo-location'); } catch { /* not available */ }
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available
}
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';
import { MAPBOX_TOKEN } from '@/services/mapConfig';
import { GEO_REGION_GROUPS, EXPEDITION_CATEGORIES } from '@/constants/geoRegions';
import {
  searchAlongRoute, clearRouteSearchCache,
  QUICK_PICK_CATEGORIES, type POIResult,
} from '@/utils/poiSearch';

type RouteMode = 'straight' | 'walking' | 'cycling' | 'driving';
const ROUTE_MODES: { value: RouteMode; label: string }[] = [
  { value: 'straight', label: 'LINE' },
  { value: 'walking', label: 'WALK' },
  { value: 'cycling', label: 'CYCLE' },
  { value: 'driving', label: 'DRIVE' },
];

const STEPS = ['DETAILS', 'ROUTE', 'FUNDING', 'REVIEW'];
const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', desc: 'Visible to all explorers' },
  { label: 'OFF-GRID', desc: 'Only accessible via direct link' },
  { label: 'PRIVATE', desc: 'Only you can see this' },
];

interface WaypointEntry {
  name: string;
  type: 'origin' | 'waypoint' | 'destination';
  coords?: string;
  lng?: number;
  lat?: number;
}

interface ExpeditionBuilderProps {
  editExpeditionId?: string;
}

export function ExpeditionBuilder({ editExpeditionId }: ExpeditionBuilderProps) {
  const isEditMode = !!editExpeditionId;
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { ready, user } = useRequireAuth();

  // ── Edit mode state ──
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [editExpedition, setEditExpedition] = useState<Expedition | null>(null);
  const [originalVisibility, setOriginalVisibility] = useState<string | null>(null);

  // Check for existing active/planned expeditions (skip in edit mode)
  const { data: userTripsData, loading: tripsLoading } = useApi<{ data: Expedition[] }>(
    ready && !isEditMode ? '/user/trips' : null,
  );
  const userExpeditions = userTripsData?.data ?? [];
  const blockingExpedition = !isEditMode ? userExpeditions.find(e => e.status === 'active' || e.status === 'planned') : undefined;

  const handleCompleteExpedition = useCallback(async (exp: Expedition) => {
    Alert.alert(
      'Complete Expedition',
      `Mark "${exp.title}" as completed so you can start a new one?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await expeditionApi.updateExpedition(exp.id, { status: 'completed' } as any);
              router.replace('/expedition/create');
            } catch (err: any) {
              const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }, [router]);

  const [step, setStepRaw] = useState(0);
  const setStep = useCallback((s: number | ((prev: number) => number)) => {
    Keyboard.dismiss();
    setStepRaw(s);
  }, []);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [datePicker, setDatePicker] = useState<'start' | 'end' | null>(null);
  const [visibility, setVisibility] = useState(0);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  // Step 2 state
  const [waypoints, setWaypoints] = useState<WaypointEntry[]>([]);
  const [routeView, setRouteView] = useState<'map' | 'list'>('map');
  const [showInstruction, setShowInstruction] = useState(true);
  const [selectedWpIdx, setSelectedWpIdx] = useState<number | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [routeMode, setRouteMode] = useState<RouteMode>('straight');
  const [directionsGeometry, setDirectionsGeometry] = useState<[number, number][] | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const directionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionsAbortRef = useRef<AbortController | null>(null);
  const lastDirectionsFingerprintRef = useRef('');
  const mapRef = useRef<HeimuMapRef>(null);
  const [mapZoom, setMapZoom] = useState(10); // conservative default — camera events will refine

  // Geolocate state
  const [geolocating, setGeolocating] = useState(false);
  const handleGeolocate = useCallback(async () => {
    if (!ExpoLocation) return;
    setGeolocating(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Location access was denied. You can enable it in Settings.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      mapRef.current?.flyTo([loc.coords.longitude, loc.coords.latitude], 12);
    } catch { /* ignore */ }
    finally { setGeolocating(false); }
  }, []);

  // Route search (find along route) state
  const [showRouteSearch, setShowRouteSearch] = useState(false);
  const [routeSearchResults, setRouteSearchResults] = useState<POIResult[]>([]);
  const [routeSearchLoading, setRouteSearchLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const allRouteResultsRef = useRef<POIResult[]>([]);
  const routeSearchAbortRef = useRef<AbortController | null>(null);

  // Step 3 state
  const [fundingEnabled, setFundingEnabled] = useState(false);
  const [fundingGoal, setFundingGoal] = useState('');
  const [notesVisibility, setNotesVisibility] = useState<'public' | 'sponsor'>('public');
  const [notesAccessThreshold, setNotesAccessThreshold] = useState('');

  // ── Load expedition data in edit mode ──
  useEffect(() => {
    if (!isEditMode || !ready || !editExpeditionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await expeditionApi.getExpedition(editExpeditionId);
        const exp = (res as any)?.data ?? res;
        if (cancelled) return;
        setEditExpedition(exp);

        // Pre-populate form state
        setName(exp.title || '');
        setDescription(exp.description || '');
        if (exp.category) setSelectedCat(exp.category);
        if (exp.region) {
          setSelectedRegions(exp.region.split(',').map((r: string) => r.trim()).filter(Boolean));
        }
        if (exp.startDate) setStartDateStr(exp.startDate.split('T')[0]);
        if (exp.endDate) setEndDateStr(exp.endDate.split('T')[0]);
        if (exp.visibility) {
          const visIdx = VISIBILITY_OPTIONS.findIndex(v => v.label.toLowerCase() === exp.visibility);
          if (visIdx >= 0) setVisibility(visIdx);
          setOriginalVisibility(exp.visibility);
        }
        if (exp.coverImage) {
          setCoverImageUri(exp.coverImage);
          setCoverImageUrl(exp.coverImage);
        }
        if (exp.goal && exp.goal > 0) {
          setFundingEnabled(true);
          setFundingGoal(String(exp.goal));
        }
        if (exp.notesVisibility) setNotesVisibility(exp.notesVisibility);
        if (exp.notesAccessThreshold) setNotesAccessThreshold(String(exp.notesAccessThreshold));
        if (exp.isRoundTrip) setIsRoundTrip(true);
        if (exp.routeMode && exp.routeMode !== 'straight') setRouteMode(exp.routeMode as RouteMode);

        // Map API waypoints to builder format
        if (exp.waypoints && exp.waypoints.length > 0) {
          const sorted = [...exp.waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
          const mapped: WaypointEntry[] = sorted.map((wp, i) => {
            const lat = wp.lat ?? wp.latitude;
            const lon = wp.lon ?? wp.longitude;
            const isFirst = i === 0;
            const isLast = i === sorted.length - 1 && sorted.length > 1;
            return {
              name: wp.title || wp.name || `Waypoint ${i + 1}`,
              type: isFirst ? 'origin' : isLast ? 'destination' : 'waypoint',
              coords: lat != null && lon != null ? `${lon},${lat}` : undefined,
              lng: lon ?? undefined,
              lat: lat ?? undefined,
            };
          });
          setWaypoints(mapped);
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
        Alert.alert('Error', msg, [{ text: 'OK', onPress: () => router.back() }]);
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEditMode, ready, editExpeditionId]);

  const updateWaypoint = useCallback((index: number, updates: Partial<WaypointEntry>) => {
    setWaypoints((prev) => prev.map((wp, i) => i === index ? { ...wp, ...updates } : wp));
  }, []);

  const addWaypointFromMap = useCallback((coords: [number, number]) => {
    setWaypoints((prev) => {
      const idx = prev.length + 1;
      return [...prev, {
        name: `Waypoint ${idx}`,
        type: prev.length === 0 ? 'origin' : 'waypoint',
        coords: `${coords[0]},${coords[1]}`,
        lng: coords[0],
        lat: coords[1],
      }];
    });
  }, []);

  const removeWaypoint = useCallback((index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveWaypoint = useCallback((from: number, dir: -1 | 1) => {
    setWaypoints((prev) => {
      const to = from + dir;
      if (to < 0 || to >= prev.length) return prev;
      const arr = [...prev];
      [arr[from], arr[to]] = [arr[to], arr[from]];
      return arr;
    });
  }, []);

  // Derive map markers and route from waypoints, then cluster by zoom level
  const routeMapMarkers: WaypointMarker[] = useMemo(() => {
    const markers = waypoints
      .filter(wp => wp.lng != null && wp.lat != null)
      .map((wp, i, arr): WaypointMarker => {
        const isStart = i === 0;
        const isEnd = i === arr.length - 1 && arr.length > 1;
        const type = isStart
          ? 'origin'
          : (isEnd && !isRoundTrip) ? 'destination' : 'waypoint';
        return {
          coordinates: [wp.lng!, wp.lat!],
          type,
          label: wp.name,
          text: String(i + 1),
          ...(isStart && isRoundTrip && arr.length > 1 ? { strokeColor: brandColors.blue } : {}),
        };
      });
    return clusterMarkers(markers, mapZoom);
  }, [waypoints, isRoundTrip, mapZoom]);

  const routeCoords: [number, number][] = useMemo(() => {
    const coords = waypoints
      .filter(wp => wp.lng != null && wp.lat != null)
      .map(wp => [wp.lng!, wp.lat!] as [number, number]);
    if (isRoundTrip && coords.length > 1) {
      coords.push(coords[0]);
    }
    return coords;
  }, [waypoints, isRoundTrip]);

  const routeBounds = useMemo(() => {
    const coords = waypoints.filter(wp => wp.lng != null && wp.lat != null);
    if (coords.length < 2) return undefined;
    return {
      ne: [
        Math.max(...coords.map(c => c.lng!)),
        Math.max(...coords.map(c => c.lat!)),
      ] as [number, number],
      sw: [
        Math.min(...coords.map(c => c.lng!)),
        Math.min(...coords.map(c => c.lat!)),
      ] as [number, number],
      padding: 60,
    };
  }, [waypoints]);

  // ── Directions API ──────────────────────────────────────────────────────────

  const fetchDirectionsRoute = useCallback(async (
    coords: [number, number][],
    profile: string,
  ) => {
    if (directionsAbortRef.current) directionsAbortRef.current.abort();
    const abort = new AbortController();
    directionsAbortRef.current = abort;
    const timeout = setTimeout(() => abort.abort(), 15000);

    setDirectionsLoading(true);
    setDirectionsError(null);

    try {
      const MAX_WP = 25;
      let allCoords: [number, number][] = [];

      if (coords.length <= MAX_WP) {
        const coordStr = coords.map(c => `${c[0].toFixed(6)},${c[1].toFixed(6)}`).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) throw new Error(`Directions API error: ${res.status}`);
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.[0]) {
          throw new Error(data.message || 'No route found between waypoints');
        }
        allCoords = data.routes[0].geometry.coordinates;
      } else {
        for (let i = 0; i < coords.length - 1; i += MAX_WP - 1) {
          const chunk = coords.slice(i, Math.min(i + MAX_WP, coords.length));
          if (chunk.length < 2) break;
          const coordStr = chunk.map(c => `${c[0].toFixed(6)},${c[1].toFixed(6)}`).join(';');
          const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
          const res = await fetch(url, { signal: abort.signal });
          if (!res.ok) throw new Error(`Directions API error: ${res.status}`);
          const data = await res.json();
          if (data.code !== 'Ok' || !data.routes?.[0]) {
            throw new Error(data.message || 'No route found between waypoints');
          }
          const chunkCoords: [number, number][] = data.routes[0].geometry.coordinates;
          allCoords = allCoords.length > 0 ? allCoords.concat(chunkCoords.slice(1)) : chunkCoords;
        }
      }

      if (!abort.signal.aborted) {
        setDirectionsGeometry(allCoords);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (directionsAbortRef.current === abort) {
          setDirectionsError('Route calculation timed out');
          setDirectionsGeometry(null);
          setDirectionsLoading(false);
        }
        return;
      }
      setDirectionsError(err instanceof Error ? err.message : 'Failed to fetch route');
      setDirectionsGeometry(null);
    } finally {
      clearTimeout(timeout);
      if (!abort.signal.aborted) setDirectionsLoading(false);
    }
  }, []);

  // Debounced directions fetch
  useEffect(() => {
    if (directionsTimerRef.current) {
      clearTimeout(directionsTimerRef.current);
      directionsTimerRef.current = null;
    }

    if (routeMode === 'straight' || waypoints.length < 2) {
      lastDirectionsFingerprintRef.current = '';
      setDirectionsGeometry(null);
      setDirectionsError(null);
      setDirectionsLoading(false);
      return;
    }

    const validWps = waypoints.filter(wp => wp.lng != null && wp.lat != null);
    if (validWps.length < 2) return;

    const fingerprint = validWps.map(w => `${w.lat},${w.lng}`).join('|')
      + `::${routeMode}::${isRoundTrip}`;

    if (fingerprint === lastDirectionsFingerprintRef.current) return;

    setDirectionsGeometry(null);
    setDirectionsLoading(true);

    directionsTimerRef.current = setTimeout(() => {
      lastDirectionsFingerprintRef.current = fingerprint;
      const coords = validWps.map(w => [w.lng!, w.lat!] as [number, number]);
      if (isRoundTrip && coords.length > 1) coords.push(coords[0]);
      fetchDirectionsRoute(coords, routeMode);
    }, 500);

    return () => {
      if (directionsTimerRef.current) clearTimeout(directionsTimerRef.current);
      const controller = directionsAbortRef.current;
      directionsAbortRef.current = null;
      controller?.abort();
    };
  }, [waypoints, routeMode, isRoundTrip, fetchDirectionsRoute]);

  // Effective route coords: directions geometry when available, else straight line
  const effectiveRouteCoords = useMemo(() => {
    if (routeMode !== 'straight' && directionsGeometry && directionsGeometry.length > 0) {
      return directionsGeometry;
    }
    return routeCoords.length > 1 ? routeCoords : undefined;
  }, [routeMode, directionsGeometry, routeCoords]);

  // Combine waypoint markers + POI search result markers
  const allMapMarkers: WaypointMarker[] = useMemo(() => {
    const poiMarkers: WaypointMarker[] = routeSearchResults.map(poi => ({
      coordinates: [poi.coordinates.lng, poi.coordinates.lat] as [number, number],
      type: 'poi' as const,
      label: poi.name,
      text: '',
    }));
    return [...routeMapMarkers, ...poiMarkers];
  }, [routeMapMarkers, routeSearchResults]);

  // ── Find along route ────────────────────────────────────────────────────────

  const handleRouteSearch = useCallback(async (categoryId: string) => {
    if (waypoints.length < 2) return;
    if (routeMode !== 'straight' && directionsLoading) return;

    // Abort previous search
    routeSearchAbortRef.current?.abort();
    const abort = new AbortController();
    routeSearchAbortRef.current = abort;

    setActiveCategory(categoryId);
    setRouteSearchLoading(true);
    setRouteSearchResults([]);

    try {
      // Use directions geometry if available, otherwise straight-line coords
      const coords = (routeMode !== 'straight' && directionsGeometry && directionsGeometry.length > 0)
        ? directionsGeometry
        : waypoints
            .filter(wp => wp.lng != null && wp.lat != null)
            .map(wp => [wp.lng!, wp.lat!] as [number, number]);

      if (coords.length < 2) return;

      const results = await searchAlongRoute(categoryId, coords, {
        timeDeviation: 30,
        signal: abort.signal,
      });

      if (!abort.signal.aborted) {
        allRouteResultsRef.current = results;
        setRouteSearchResults(results);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        Alert.alert('Search failed', 'Could not search along route');
      }
    } finally {
      if (!abort.signal.aborted) setRouteSearchLoading(false);
    }
  }, [waypoints, routeMode, directionsLoading, directionsGeometry]);

  const handleAddPOIAsWaypoint = useCallback((poi: POIResult) => {
    const newWp: WaypointEntry = {
      name: poi.name,
      type: 'waypoint' as const,
      coords: `${poi.coordinates.lng},${poi.coordinates.lat}`,
      lng: poi.coordinates.lng,
      lat: poi.coordinates.lat,
    };

    setWaypoints((prev) => {
      // Find the closest leg to insert after
      const validWps = prev.filter(wp => wp.lng != null && wp.lat != null);
      if (validWps.length < 2) return [...prev, newWp];

      const pLng = poi.coordinates.lng;
      const pLat = poi.coordinates.lat;
      let bestLeg = prev.length - 1; // default: append at end
      let bestDist = Infinity;

      for (let i = 0; i < prev.length - 1; i++) {
        const a = prev[i];
        const b = prev[i + 1];
        if (a.lng == null || b.lng == null) continue;

        // Project point onto segment a→b (cosLat corrects longitude at high latitudes)
        const cosLat = Math.cos((pLat * Math.PI) / 180);
        const dx = (b.lng! - a.lng!) * cosLat;
        const dy = b.lat! - a.lat!;
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        if (lenSq > 0) {
          t = Math.max(0, Math.min(1, (((pLng - a.lng!) * cosLat) * dx + (pLat - a.lat!) * dy) / lenSq));
        }
        const projLng = a.lng! + t * (b.lng! - a.lng!);
        const projLat = a.lat! + t * (b.lat! - a.lat!);
        const dxP = (pLng - projLng) * cosLat;
        const dyP = pLat - projLat;
        const dist = dxP * dxP + dyP * dyP;

        if (dist < bestDist) {
          bestDist = dist;
          bestLeg = i + 1; // insert after waypoint i
        }
      }

      const arr = [...prev];
      arr.splice(bestLeg, 0, newWp);
      return arr;
    });

    // Remove from results
    allRouteResultsRef.current = allRouteResultsRef.current.filter(r => r.id !== poi.id);
    setRouteSearchResults(prev => prev.filter(r => r.id !== poi.id));
  }, []);

  const handleCloseRouteSearch = useCallback(() => {
    routeSearchAbortRef.current?.abort();
    setShowRouteSearch(false);
    setRouteSearchResults([]);
    allRouteResultsRef.current = [];
    setActiveCategory(null);
    setRouteSearchLoading(false);
  }, []);

  // Clear search cache when route changes
  useEffect(() => {
    clearRouteSearchCache();
  }, [waypoints, routeMode, isRoundTrip]);

  const today = useMemo(() => todayISO(), []);

  const derivedStatus: 'planned' | 'active' | 'completed' = useMemo(() => {
    if (isEditMode && editExpedition?.status) {
      return editExpedition.status as 'planned' | 'active' | 'completed';
    }
    if (!startDateStr) return 'planned';
    if (endDateStr && endDateStr <= today) return 'completed';
    if (startDateStr > today) return 'planned';
    return 'active';
  }, [isEditMode, editExpedition, startDateStr, endDateStr, today]);

  const handlePickCoverImage = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Unavailable', 'Image picker requires a development build.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;

    setCoverImageUri(uri);
    setCoverUploading(true);
    try {
      const uploadResult = await uploadApi.upload(uri, 'image/jpeg');
      setCoverImageUrl(uploadResult.original);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Upload failed', msg);
      setCoverImageUri(null);
    } finally {
      setCoverUploading(false);
    }
  }, []);

  // ── Edit mode: save changes ──
  const handleSaveEdit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please name your expedition.');
      return;
    }
    if (fundingEnabled) {
      const goalNum = parseFloat((fundingGoal || '0').replace(/,/g, ''));
      if (!goalNum || goalNum < 1) {
        Alert.alert('Funding goal required', 'Please set a funding goal of at least $1.');
        return;
      }
    }
    if (notesVisibility === 'sponsor') {
      const threshold = Number(notesAccessThreshold);
      if (!threshold || threshold < 1) {
        Alert.alert('Threshold required', 'Sponsor-exclusive notes require an access threshold of at least $1.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const fullPayload = {
        title: name.trim(),
        description: description.trim() || undefined,
        endDate: endDateStr || undefined,
        visibility: VISIBILITY_OPTIONS[visibility].label.toLowerCase() as Expedition['visibility'],
        goal: fundingEnabled && fundingGoal && !isNaN(parseFloat(fundingGoal.replace(/,/g, ''))) ? parseFloat(fundingGoal.replace(/,/g, '')) : 0,
        notesVisibility,
        notesAccessThreshold: notesVisibility === 'sponsor' && notesAccessThreshold ? Number(notesAccessThreshold) : 0,
        coverImage: coverImageUrl || undefined,
        isRoundTrip,
        routeMode: routeMode !== 'straight' ? routeMode : undefined,
        routeGeometry: routeMode !== 'straight' && directionsGeometry ? directionsGeometry : null,
      } as Partial<Expedition>;

      // Completed expeditions can only update title, description, cover image, and route
      const payload = isCompletedExpedition
        ? { title: fullPayload.title, description: fullPayload.description, coverImage: fullPayload.coverImage, routeGeometry: fullPayload.routeGeometry }
        : fullPayload;

      await expeditionApi.updateExpedition(editExpeditionId!, payload as Partial<Expedition>);

      // Sync waypoints (skip for cancelled expeditions)
      if (editExpedition?.status !== 'cancelled') {
        const validWps = waypoints.filter(wp => wp.lng != null && wp.lat != null);
        await expeditionApi.syncWaypoints(editExpeditionId!, validWps.map((wp, i) => ({
          title: wp.name,
          lat: wp.lat!,
          lon: wp.lng!,
          sequence: i,
        })));
      }

      Alert.alert('Saved', 'Expedition updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [editExpeditionId, name, description, endDateStr, visibility, fundingEnabled, fundingGoal, notesVisibility, notesAccessThreshold, waypoints, router, coverImageUrl, isRoundTrip, routeMode, directionsGeometry]);

  // ── Edit mode: delete expedition ──
  const handleDeleteExpedition = useCallback(() => {
    if (!editExpeditionId) return;
    const hasEntries = (editExpedition?.entriesCount ?? 0) > 0;
    if (hasEntries) return;

    Alert.alert(
      'Delete Expedition',
      'Are you sure you want to permanently delete this expedition? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expeditionApi.deleteExpedition(editExpeditionId);
              Alert.alert('Deleted', 'Expedition has been deleted.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') },
              ]);
            } catch (err) {
              const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }, [editExpeditionId, editExpedition, router]);

  const handleLaunch = useCallback(async (isDraft: boolean) => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please name your expedition.');
      return;
    }
    if (fundingEnabled) {
      const goalNum = parseFloat((fundingGoal || '0').replace(/,/g, ''));
      if (!goalNum || goalNum < 1) {
        Alert.alert('Funding goal required', 'Please set a funding goal of at least $1.');
        return;
      }
      if (goalNum > 999999.99) {
        Alert.alert('Funding goal too high', 'Funding goal cannot exceed $999,999.99.');
        return;
      }
    }
    if (notesVisibility === 'sponsor') {
      const threshold = Number(notesAccessThreshold);
      if (!threshold || threshold < 1) {
        Alert.alert('Threshold required', 'Sponsor-exclusive notes require an access threshold of at least $1.');
        return;
      }
      if (threshold > 999999.99) {
        Alert.alert('Threshold too high', 'Notes access threshold cannot exceed $999,999.99.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await expeditionApi.createExpedition({
        title: name.trim(),
        description: description.trim() || undefined,
        category: selectedCat || undefined,
        region: selectedRegions.length > 0 ? selectedRegions.join(', ') : undefined,
        startDate: startDateStr || undefined,
        endDate: endDateStr || undefined,
        visibility: VISIBILITY_OPTIONS[visibility].label.toLowerCase(),
        goal: fundingEnabled && fundingGoal && !isNaN(parseFloat(fundingGoal.replace(/,/g, ''))) ? parseFloat(fundingGoal.replace(/,/g, '')) : undefined,
        notesVisibility,
        notesAccessThreshold: notesVisibility === 'sponsor' && notesAccessThreshold ? Number(notesAccessThreshold) : 0,
        status: isDraft ? 'planned' : derivedStatus,
        coverImage: coverImageUrl || undefined,
        routeMode: routeMode !== 'straight' ? routeMode : undefined,
        routeGeometry: routeMode !== 'straight' && directionsGeometry ? directionsGeometry : null,
      });

      // Save waypoints to the newly created expedition
      const tripId = (res as any)?.data?.expeditionId ?? (res as any)?.expeditionId ?? (res as any)?.data?.id;
      if (tripId) {
        const validWps = waypoints.filter(wp => wp.lng != null && wp.lat != null);
        await Promise.all(validWps.map((wp, i) =>
          expeditionApi.createWaypoint(tripId, {
            title: wp.name,
            lat: wp.lat!,
            lon: wp.lng!,
            sequence: i,
          }),
        ));
      }

      Alert.alert(
        isDraft ? 'Draft saved' : 'Expedition launched!',
        undefined,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [name, description, selectedCat, selectedRegions, startDateStr, endDateStr, visibility, fundingEnabled, fundingGoal, waypoints, router, coverImageUrl, derivedStatus, routeMode, directionsGeometry]);

  // Locked field helpers for edit mode
  const isCompletedExpedition = isEditMode && editExpedition?.status === 'completed';
  const isStartDateLocked = isEditMode;
  const isCategoryLocked = isEditMode;
  const isRegionLocked = isEditMode;
  const isVisibilityPrivateLocked = isEditMode && originalVisibility === 'private';
  const isVisibilityPrivateDisabled = isEditMode && originalVisibility !== 'private';
  const isSponsorshipLocked = isEditMode && editExpedition?.status === 'completed';

  if (!ready || (!isEditMode && tripsLoading) || editLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title={isEditMode ? 'EDIT EXPEDITION' : 'NEW EXPEDITION'} />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  if (!isEditMode && blockingExpedition) {
    const isActive = blockingExpedition.status === 'active';
    const endDatePassed = blockingExpedition.endDate && new Date(blockingExpedition.endDate) < new Date();
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="NEW EXPEDITION" />
        <View style={styles.blockedWrap}>
          <HCard>
            <View style={styles.blockedInner}>
              <Text style={[styles.blockedTitle, { color: colors.text }]}>
                {isActive ? 'ACTIVE' : 'PLANNED'} EXPEDITION IN PROGRESS
              </Text>
              <Text style={[styles.blockedName, { color: brandColors.copper }]}>
                {blockingExpedition.title}
              </Text>
              <Text style={[styles.blockedDesc, { color: colors.textSecondary }]}>
                You can only have one active or planned expedition at a time. Complete or cancel your current expedition to start a new one.
              </Text>
              <View style={styles.blockedActions}>
                <HButton
                  variant="copper"
                  outline
                  onPress={() => router.push(`/expedition/${blockingExpedition.id}`)}
                >
                  VIEW EXPEDITION
                </HButton>
                {(isActive || endDatePassed) && (
                  <>
                    <View style={styles.blockedGap} />
                    <HButton
                      variant="copper"
                      onPress={() => handleCompleteExpedition(blockingExpedition)}
                    >
                      MARK AS COMPLETED
                    </HButton>
                  </>
                )}
              </View>
            </View>
          </HCard>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar
        onBack={() => (step > 0 ? setStep(isCompletedExpedition && step === 3 ? 0 : step - 1) : router.back())}
        title={isEditMode ? 'EDIT EXPEDITION' : 'NEW EXPEDITION'}
        right={
          <Text style={styles.stepCounter}>{step + 1}/{STEPS.length}</Text>
        }
      />

      {/* Step indicator */}
      <View style={[styles.stepBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {STEPS.map((s, i) => (
          <TouchableOpacity
            key={s}
            style={[styles.stepItem, i === step && styles.stepItemActive]}
            onPress={() => setStep(i)}
          >
            <Text
              style={[
                styles.stepLabel,
                {
                  color: i === step
                    ? brandColors.copper
                    : i < step
                      ? colors.text
                      : colors.textTertiary,
                },
              ]}
            >
              {s}
            </Text>
            {i < step && (
              <View style={styles.checkmark}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={brandColors.green} strokeWidth={3}>
                  <Path d="M20 6L9 17l-5-5" />
                </Svg>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── STEP 2: ROUTE — map/list toggle layout ────────────────────── */}
      {step === 1 && (
        <View style={styles.routeContainer}>
          {/* ── Toolbar: view toggle + route mode + find along route ─── */}
          <View style={[styles.routeToolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.routeToolbarRow}>
              {/* Map / List toggle */}
              <View style={[styles.viewToggle, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, routeView === 'map' && styles.viewToggleBtnActive]}
                  onPress={() => setRouteView('map')}
                >
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={routeView === 'map' ? '#fff' : colors.textSecondary} strokeWidth={2}>
                    <Path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
                  </Svg>
                  <Text style={[styles.viewToggleText, { color: routeView === 'map' ? '#fff' : colors.textSecondary }]}>MAP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewToggleBtn, routeView === 'list' && styles.viewToggleBtnActive]}
                  onPress={() => setRouteView('list')}
                >
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={routeView === 'list' ? '#fff' : colors.textSecondary} strokeWidth={2}>
                    <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </Svg>
                  <Text style={[styles.viewToggleText, { color: routeView === 'list' ? '#fff' : colors.textSecondary }]}>LIST</Text>
                </TouchableOpacity>
              </View>

              {/* Route mode selector */}
              <View style={[styles.routeModeBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {ROUTE_MODES.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.routeModeBtn, routeMode === m.value && styles.routeModeBtnActive]}
                    onPress={() => setRouteMode(m.value)}
                  >
                    <Text style={[styles.routeModeBtnText, { color: routeMode === m.value ? '#fff' : colors.textSecondary }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {directionsLoading && (
                  <ActivityIndicator size="small" color={brandColors.copper} style={{ marginLeft: 4 }} />
                )}
              </View>
            </View>

            {/* Find along route + waypoint count */}
            <View style={styles.routeToolbarRow}>
              <Text style={[styles.routeWpCount, { color: colors.textSecondary }]}>
                {waypoints.length} WAYPOINT{waypoints.length !== 1 ? 'S' : ''}
              </Text>
              {waypoints.length >= 2 && (
                <TouchableOpacity
                  style={styles.findRouteBtn}
                  onPress={() => setShowRouteSearch(true)}
                  hitSlop={4}
                >
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                    <Circle cx={11} cy={11} r={8} />
                    <Path d="M21 21l-4.35-4.35" />
                  </Svg>
                  <Text style={styles.findRouteBtnText}>FIND ALONG ROUTE</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Directions error */}
            {directionsError && routeMode !== 'straight' && (
              <View style={[styles.routeErrorBar, { borderColor: brandColors.copper }]}>
                <Text style={[styles.routeErrorText, { color: brandColors.copper }]} numberOfLines={2}>
                  {directionsError} — showing straight line
                </Text>
              </View>
            )}
          </View>

          {/* ── Find along route panel (overlays content) ─────────── */}
          {showRouteSearch && (
            <View style={[styles.searchPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={styles.searchPanelHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                    <Circle cx={11} cy={11} r={8} />
                    <Path d="M21 21l-4.35-4.35" />
                  </Svg>
                  <Text style={styles.searchPanelTitle}>FIND ALONG ROUTE</Text>
                </View>
                <TouchableOpacity onPress={handleCloseRouteSearch} hitSlop={8}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                    <Path d="M18 6L6 18M6 6l12 12" />
                  </Svg>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.searchCatScroll}
                contentContainerStyle={styles.searchCatContent}
              >
                {QUICK_PICK_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.searchCatBtn,
                      {
                        backgroundColor: activeCategory === cat.id ? brandColors.blue : colors.inputBackground,
                        borderColor: activeCategory === cat.id ? brandColors.blue : colors.border,
                      },
                    ]}
                    onPress={() => handleRouteSearch(cat.id)}
                    disabled={routeSearchLoading}
                  >
                    <Text style={[
                      styles.searchCatText,
                      { color: activeCategory === cat.id ? '#fff' : colors.textSecondary },
                    ]}>
                      {cat.name.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {(routeSearchLoading || routeSearchResults.length > 0 || activeCategory) && (
                <View style={[styles.searchResults, { borderTopColor: colors.borderThin }]}>
                  {routeSearchLoading ? (
                    <View style={styles.searchResultsHeader}>
                      <ActivityIndicator size="small" color={brandColors.blue} />
                      <Text style={[styles.searchResultsCount, { color: colors.textSecondary }]}>Searching...</Text>
                    </View>
                  ) : routeSearchResults.length > 0 ? (
                    <Text style={[styles.searchResultsCount, { color: colors.text, paddingHorizontal: 12, paddingTop: 8 }]}>
                      {routeSearchResults.length} result{routeSearchResults.length !== 1 ? 's' : ''}
                    </Text>
                  ) : activeCategory ? (
                    <Text style={[styles.searchResultsCount, { color: colors.textTertiary, paddingHorizontal: 12, paddingTop: 8 }]}>
                      No results found along this route
                    </Text>
                  ) : null}

                  <ScrollView style={styles.searchResultsList}>
                    {routeSearchResults.map(poi => (
                      <TouchableOpacity
                        key={poi.id}
                        style={[styles.searchResultRow, { borderBottomColor: colors.borderThin }]}
                        onPress={() => {
                          setRouteView('map');
                          mapRef.current?.flyTo([poi.coordinates.lng, poi.coordinates.lat], 15);
                        }}
                      >
                        <View style={styles.searchResultInfo}>
                          <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>{poi.name}</Text>
                          {poi.address ? (
                            <Text style={[styles.searchResultAddr, { color: colors.textTertiary }]} numberOfLines={1}>{poi.address}</Text>
                          ) : null}
                          {poi.distanceFromRoute != null && (
                            <Text style={styles.searchResultDist}>
                              ~{poi.distanceFromRoute < 1000
                                ? `${Math.round(poi.distanceFromRoute)}m`
                                : `${(poi.distanceFromRoute / 1000).toFixed(1)}km`
                              } from route
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.searchAddBtn}
                          onPress={() => handleAddPOIAsWaypoint(poi)}
                          hitSlop={6}
                        >
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={brandColors.blue} strokeWidth={2.5}>
                            <Path d="M12 5v14M5 12h14" />
                          </Svg>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* ── MAP VIEW ──────────────────────────────────────────── */}
          {routeView === 'map' && (
            <View
              style={styles.routeMapWrap}
              onTouchStart={() => showInstruction && setShowInstruction(false)}
            >
              <HeimuMap
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                center={[-98, 40]}
                zoom={2}
                bounds={routeBounds}
                interactive
                waypoints={allMapMarkers}
                routeCoords={effectiveRouteCoords}
                onMapPress={addWaypointFromMap}
                onZoomChange={setMapZoom}
                onWaypointPress={(i) => {
                  if (i < routeMapMarkers.length) setSelectedWpIdx(i);
                }}
              />

              {waypoints.length === 0 && showInstruction && (
                <View style={styles.routeInstruction} pointerEvents="none">
                  <View style={[styles.routeInstructionBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2}>
                      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <Circle cx={12} cy={10} r={3} />
                    </Svg>
                    <Text style={[styles.routeInstructionTitle, { color: colors.text }]}>TAP TO ADD WAYPOINTS</Text>
                    <Text style={[styles.routeInstructionSub, { color: colors.textTertiary }]}>
                      Tap anywhere on the map to place route markers
                    </Text>
                  </View>
                </View>
              )}

              {/* Geolocate button */}
              <TouchableOpacity
                style={[styles.geolocateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleGeolocate}
                disabled={geolocating}
              >
                {geolocating
                  ? <ActivityIndicator size="small" color={brandColors.copper} />
                  : <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2}>
                      <Circle cx={12} cy={12} r={3} />
                      <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    </Svg>
                }
              </TouchableOpacity>

              {/* Compact legend */}
              <View style={[styles.routeLegend, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: brandColors.copper, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>S</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#616161', width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#fff' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>WP</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: brandColors.blue, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>E</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={{ width: 12, height: 2, backgroundColor: brandColors.copper, borderRadius: 1 }} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Route</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── LIST VIEW ─────────────────────────────────────────── */}
          {routeView === 'list' && (
            <ScrollView style={styles.routeListView} keyboardShouldPersistTaps="handled">
              {waypoints.length === 0 ? (
                <View style={styles.routeListEmpty}>
                  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={1.5}>
                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <Circle cx={12} cy={10} r={3} />
                  </Svg>
                  <Text style={[styles.routeListEmptyText, { color: colors.textTertiary }]}>
                    No waypoints yet{'\n'}Switch to map view to add markers
                  </Text>
                </View>
              ) : (
                waypoints.map((wp, i) => {
                  const isStart = i === 0;
                  const isEnd = i === waypoints.length - 1 && waypoints.length > 1;
                  const dotColor = isStart ? brandColors.copper : (isEnd && !isRoundTrip) ? brandColors.blue : '#616161';
                  const dotBorder = isStart && isRoundTrip && waypoints.length > 1 ? brandColors.blue : '#fff';
                  const typeLabel = isStart
                    ? (isRoundTrip && waypoints.length > 1 ? 'START / END' : 'START')
                    : (isEnd && !isRoundTrip) ? 'END' : 'WAYPOINT';
                  return (
                    <View
                      key={i}
                      style={[styles.routeWpRow, { backgroundColor: colors.card }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin }]}
                    >
                      {/* Reorder */}
                      <View style={styles.routeWpReorder}>
                        <TouchableOpacity onPress={() => moveWaypoint(i, -1)} disabled={i === 0} hitSlop={6}>
                          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={i === 0 ? colors.borderThin : colors.textTertiary} strokeWidth={2.5}>
                            <Path d="M18 15l-6-6-6 6" />
                          </Svg>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moveWaypoint(i, 1)} disabled={i === waypoints.length - 1} hitSlop={6}>
                          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={i === waypoints.length - 1 ? colors.borderThin : colors.textTertiary} strokeWidth={2.5}>
                            <Path d="M6 9l6 6 6-6" />
                          </Svg>
                        </TouchableOpacity>
                      </View>
                      {/* Dot */}
                      <View style={[styles.routeWpDot, { backgroundColor: dotColor, borderColor: dotBorder }]}>
                        <Text style={styles.routeWpDotText}>{String(i + 1)}</Text>
                      </View>
                      {/* Info — tap to edit */}
                      <TouchableOpacity style={styles.routeWpInfo} onPress={() => setSelectedWpIdx(i)}>
                        <Text style={[styles.routeWpName, { color: colors.text }]} numberOfLines={1}>{wp.name}</Text>
                        <Text style={[styles.routeWpType, { color: dotColor }]}>{typeLabel}</Text>
                        {wp.lng != null && (
                          <Text style={[styles.routeWpCoords, { color: colors.textTertiary }]}>
                            {wp.lat!.toFixed(4)}, {wp.lng!.toFixed(4)}
                          </Text>
                        )}
                      </TouchableOpacity>
                      {/* Fly to on map */}
                      {wp.lng != null && (
                        <TouchableOpacity
                          onPress={() => { setRouteView('map'); mapRef.current?.flyTo([wp.lng!, wp.lat!], 10); }}
                          hitSlop={8}
                          style={styles.routeWpAction}
                        >
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <Circle cx={12} cy={12} r={3} />
                          </Svg>
                        </TouchableOpacity>
                      )}
                      {/* Delete */}
                      <TouchableOpacity onPress={() => removeWaypoint(i)} hitSlop={8} style={styles.routeWpAction}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={brandColors.red} strokeWidth={2}>
                          <Path d="M18 6L6 18M6 6l12 12" />
                        </Svg>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* ── Navigation buttons ────────────────────────────────── */}
          <SafeAreaView edges={['bottom']} style={[styles.routeNavWrap, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.routeNavRow}>
              <TouchableOpacity style={[styles.routeNavBtn, { borderColor: colors.border }]} onPress={() => setStep(0)}>
                <Text style={[styles.routeNavBtnText, { color: brandColors.blue }]}>← BACK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.routeNavBtn, { backgroundColor: brandColors.copper, borderColor: brandColors.copper }]} onPress={() => setStep(2)}>
                <Text style={[styles.routeNavBtnText, { color: '#fff' }]}>NEXT: FUNDING →</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* ── Waypoint edit modal ────────────────────────────────── */}
          <Modal
            visible={selectedWpIdx !== null}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedWpIdx(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Header */}
                <View style={[styles.modalHeader, { borderBottomColor: colors.borderThin }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>EDIT WAYPOINT</Text>
                  <TouchableOpacity onPress={() => setSelectedWpIdx(null)} hitSlop={8}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2.5}>
                      <Path d="M18 6L6 18M6 6l12 12" />
                    </Svg>
                  </TouchableOpacity>
                </View>

                {selectedWpIdx !== null && waypoints[selectedWpIdx] && (
                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    {/* Name field */}
                    <HTextField
                      label="NAME"
                      placeholder="Waypoint name"
                      value={waypoints[selectedWpIdx].name}
                      onChangeText={(val) => updateWaypoint(selectedWpIdx, { name: val.slice(0, 100) })}
                    />

                    {/* Coordinates (read-only) */}
                    {waypoints[selectedWpIdx].lng != null && (
                      <View style={styles.modalCoords}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>COORDINATES</Text>
                        <Text style={[styles.modalCoordsText, { color: colors.textTertiary }]}>
                          {waypoints[selectedWpIdx].lat!.toFixed(5)}, {waypoints[selectedWpIdx].lng!.toFixed(5)}
                        </Text>
                      </View>
                    )}

                    {/* Round trip toggle — only for first waypoint with 2+ waypoints */}
                    {selectedWpIdx === 0 && waypoints.length >= 2 && (
                      <TouchableOpacity
                        style={[
                          styles.modalRoundTrip,
                          {
                            borderColor: isRoundTrip ? brandColors.blue : colors.border,
                            backgroundColor: isRoundTrip ? brandColors.blue : 'transparent',
                          },
                        ]}
                        onPress={() => setIsRoundTrip(!isRoundTrip)}
                      >
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={isRoundTrip ? '#fff' : brandColors.blue} strokeWidth={2.5}>
                          <Path d="M17 1l4 4-4 4" />
                          <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <Path d="M7 23l-4-4 4-4" />
                          <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </Svg>
                        <Text style={[styles.modalRoundTripText, { color: isRoundTrip ? '#fff' : brandColors.blue }]}>
                          {isRoundTrip ? '✓ ROUND TRIP ENABLED' : 'MARK AS ROUND TRIP'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}

                {/* Footer */}
                <View style={[styles.modalFooter, { borderTopColor: colors.borderThin }]}>
                  <TouchableOpacity
                    style={[styles.modalDeleteBtn, { borderColor: brandColors.red }]}
                    onPress={() => {
                      removeWaypoint(selectedWpIdx!);
                      setSelectedWpIdx(null);
                    }}
                  >
                    <Text style={[styles.modalDeleteText, { color: brandColors.red }]}>DELETE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalDoneBtn, { backgroundColor: brandColors.copper }]}
                    onPress={() => setSelectedWpIdx(null)}
                  >
                    <Text style={styles.modalDoneText}>DONE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}

      <ScrollView
        style={[styles.scroll, step === 1 && { display: 'none' }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        <View style={styles.form}>

          {/* STEP 1: DETAILS */}
          {step === 0 && (
            <>
              {isCompletedExpedition && (
                <View style={[styles.infoBanner, { backgroundColor: brandColors.blue + '18', borderColor: brandColors.blue }]}>
                  <Text style={[styles.infoBannerText, { color: brandColors.blue }]}>
                    This expedition is completed. You can update the title, description, cover image, and waypoints.
                  </Text>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>EXPEDITION DETAILS</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>

              <HCard>
                <View style={styles.stepBody}>
                  <HTextField label="EXPEDITION NAME" placeholder="e.g. Trans-Siberian Journey" value={name} onChangeText={setName} />

                  {/* Cover image */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>COVER IMAGE</Text>
                    {coverImageUri ? (
                      <View>
                        <Image source={{ uri: coverImageUri }} style={styles.coverPreview} />
                        {coverUploading && (
                          <View style={styles.coverUploading}>
                            <ActivityIndicator color="#fff" />
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.coverRemove}
                          onPress={() => { setCoverImageUri(null); setCoverImageUrl(null); }}
                        >
                          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                            <Path d="M18 6L6 18M6 6l12 12" />
                          </Svg>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.dashedBox, { borderColor: colors.textTertiary }]} onPress={handlePickCoverImage}>
                        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={1.5}>
                          <Path d="M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21" />
                        </Svg>
                        <Text style={[styles.dashedText, { color: colors.textTertiary }]}>Tap to add cover photo</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Description */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
                    <TextInput
                      style={[styles.textarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                      multiline
                      placeholder="Describe your expedition..."
                      placeholderTextColor={colors.textTertiary}
                      value={description}
                      onChangeText={setDescription}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Category chips */}
                  <View style={[styles.fieldGroup, isCategoryLocked && { opacity: 0.4 }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY{isCategoryLocked ? ' (LOCKED)' : ''}</Text>
                    <View style={styles.chipGrid}>
                      {EXPEDITION_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selectedCat === cat ? brandColors.copper : colors.inputBackground,
                              borderColor: selectedCat === cat ? brandColors.copper : colors.border,
                            },
                          ]}
                          onPress={isCategoryLocked ? undefined : () => setSelectedCat(selectedCat === cat ? '' : cat)}
                          activeOpacity={isCategoryLocked ? 1 : 0.7}
                        >
                          <Text style={[styles.chipText, { color: selectedCat === cat ? '#fff' : colors.textTertiary }]}>
                            {cat.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Region chips – grouped by macro-region */}
                  <View style={[styles.fieldGroup, isRegionLocked && { opacity: 0.4 }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>REGION{isRegionLocked ? ' (LOCKED)' : ''}</Text>
                    {GEO_REGION_GROUPS.map((group) => (
                      <View key={group.label} style={styles.regionGroup}>
                        <Text style={[styles.regionGroupLabel, { color: colors.textTertiary }]}>
                          {group.label.toUpperCase()}
                        </Text>
                        <View style={styles.chipGrid}>
                          {group.regions.map((r) => {
                            const selected = selectedRegions.includes(r);
                            return (
                              <TouchableOpacity
                                key={r}
                                style={[
                                  styles.chip,
                                  {
                                    backgroundColor: selected ? brandColors.blue : colors.inputBackground,
                                    borderColor: selected ? brandColors.blue : colors.border,
                                  },
                                ]}
                                onPress={isRegionLocked ? undefined : () =>
                                  setSelectedRegions((prev) =>
                                    selected ? prev.filter((v) => v !== r) : [...prev, r],
                                  )
                                }
                                activeOpacity={isRegionLocked ? 1 : 0.7}
                              >
                                <Text style={[styles.chipText, { color: selected ? '#fff' : colors.textTertiary }]}>
                                  {r.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Dates */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.dateRow}>
                      <View style={[styles.dateField, isStartDateLocked && { opacity: 0.4 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>START DATE{isStartDateLocked ? ' (LOCKED)' : ''}</Text>
                        <TouchableOpacity
                          style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                          onPress={isStartDateLocked ? undefined : () => setDatePicker('start')}
                          activeOpacity={isStartDateLocked ? 1 : 0.7}
                        >
                          <Text style={[styles.dateButtonText, { color: startDateStr ? colors.text : colors.textTertiary }]}>
                            {startDateStr ? fmtDateDisplay(startDateStr) : 'Select date'}
                          </Text>
                        </TouchableOpacity>
                        {!!startDateStr && !isStartDateLocked && (
                          <TouchableOpacity onPress={() => setStartDateStr('')} style={styles.dateClear}>
                            <Text style={[styles.dateClearText, { color: colors.textTertiary }]}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={[styles.dateField, isCompletedExpedition && { opacity: 0.4 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>END DATE{isCompletedExpedition ? ' (LOCKED)' : ''}</Text>
                        <TouchableOpacity
                          style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                          onPress={isCompletedExpedition ? undefined : () => setDatePicker('end')}
                          activeOpacity={isCompletedExpedition ? 1 : 0.7}
                        >
                          <Text style={[styles.dateButtonText, { color: endDateStr ? colors.text : colors.textTertiary }]}>
                            {endDateStr ? fmtDateDisplay(endDateStr) : 'Optional'}
                          </Text>
                        </TouchableOpacity>
                        {!!endDateStr && (
                          <TouchableOpacity onPress={() => setEndDateStr('')} style={styles.dateClear}>
                            <Text style={[styles.dateClearText, { color: colors.textTertiary }]}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Derived status */}
                    <View style={[styles.statusIndicator, {
                      backgroundColor: derivedStatus === 'active' ? brandColors.green
                        : derivedStatus === 'completed' ? brandColors.red
                        : brandColors.blue,
                    }]}>
                      <Text style={styles.statusText}>
                        {derivedStatus === 'active' ? 'ACTIVE — expedition is underway'
                          : derivedStatus === 'completed' ? 'COMPLETED — end date has passed'
                          : !startDateStr ? 'PLANNED — no start date set'
                          : 'PLANNED — start date is in the future'}
                      </Text>
                    </View>
                  </View>

                  {/* Visibility */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      VISIBILITY{isVisibilityPrivateLocked ? ' (LOCKED)' : ''}
                    </Text>
                    {VISIBILITY_OPTIONS.map((opt, i) => {
                      const isPrivateOpt = opt.label === 'PRIVATE';
                      // In edit: if original was private, all locked; if original was public/off-grid, private is disabled
                      const optDisabled = isCompletedExpedition || isVisibilityPrivateLocked || (isPrivateOpt && isVisibilityPrivateDisabled);
                      return (
                        <RadioOption
                          key={opt.label}
                          label={opt.label}
                          description={opt.desc}
                          selected={visibility === i}
                          onSelect={() => setVisibility(i)}
                          disabled={optDisabled}
                        />
                      );
                    })}
                    {isEditMode && (
                      <Text style={[styles.lockedFieldInfo, { color: brandColors.blue }]}>
                        {originalVisibility === 'private'
                          ? 'Private visibility cannot be changed after creation.'
                          : 'Public and Off-Grid can be toggled freely. Private cannot be selected after creation.'}
                      </Text>
                    )}
                  </View>

                  {isEditMode && (
                    <Text style={[styles.lockedFieldInfo, { color: brandColors.blue }]}>
                      Start date, category, and region are locked after creation.
                    </Text>
                  )}
                </View>
              </HCard>

              <HButton variant="copper" onPress={() => setStep(isCompletedExpedition ? 3 : 1)}>
                {isCompletedExpedition ? 'NEXT: REVIEW →' : 'NEXT: PLAN ROUTE →'}
              </HButton>
            </>
          )}

          {/* STEP 2: ROUTE — rendered outside ScrollView, placeholder here */}
          {step === 1 && null}

          {/* STEP 3: FUNDING */}
          {step === 2 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>FUNDING GOAL</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>

              <HCard>
                <View style={styles.infoCard}>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Set a funding goal for this expedition. Sponsors will use your account-level sponsorship tiers.
                  </Text>
                </View>
              </HCard>

              <HCard>
                <View style={[styles.stepBody, isSponsorshipLocked && { opacity: 0.4 }]}>
                  {/* Toggle */}
                  <TouchableOpacity
                    style={[styles.toggleRow, { borderBottomColor: colors.borderThin }]}
                    onPress={isSponsorshipLocked ? undefined : () => {
                      setFundingEnabled(!fundingEnabled);
                    }}
                    activeOpacity={isSponsorshipLocked ? 1 : 0.7}
                  >
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>Enable sponsorship</Text>
                    <View style={[styles.toggle, fundingEnabled && styles.toggleActive]}>
                      <View style={[styles.toggleKnob, fundingEnabled && styles.toggleKnobActive]} />
                    </View>
                  </TouchableOpacity>

                  {fundingEnabled && (
                    <HTextField
                      label="FUNDING GOAL ($)"
                      placeholder="e.g., 15000"
                      value={fundingGoal}
                      onChangeText={isSponsorshipLocked ? undefined : setFundingGoal}
                      keyboardType="numeric"
                      editable={!isSponsorshipLocked}
                    />
                  )}
                  {isSponsorshipLocked && (
                    <Text style={[styles.lockedFieldInfo, { color: brandColors.blue }]}>
                      Sponsorship settings are locked for completed expeditions.
                    </Text>
                  )}
                </View>
              </HCard>

              {/* Notes visibility — only for Pro users with Stripe Connect and non-private expeditions */}
              {(user?.is_pro || user?.isPremium) && user?.stripeAccountConnected && visibility !== 2 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>EXPEDITION NOTES</Text>
                    <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
                  </View>

                  <HCard>
                    <View style={styles.stepBody}>
                      <RadioOption
                        label="PUBLIC"
                        description="Anyone can read expedition notes"
                        selected={notesVisibility === 'public'}
                        onSelect={() => setNotesVisibility('public')}
                        disabled={isSponsorshipLocked}
                      />
                      <RadioOption
                        label="SPONSOR EXCLUSIVE"
                        description="Only sponsors meeting the threshold can read notes"
                        selected={notesVisibility === 'sponsor'}
                        onSelect={() => {
                          setNotesVisibility('sponsor');
                          setFundingEnabled(true);
                        }}
                        disabled={isSponsorshipLocked}
                      />
                      {notesVisibility === 'sponsor' && fundingEnabled && (
                        <View style={{ marginTop: 8 }}>
                          <HTextField
                            label="NOTES ACCESS THRESHOLD ($)"
                            placeholder="e.g., 15"
                            value={notesAccessThreshold}
                            onChangeText={setNotesAccessThreshold}
                            keyboardType="numeric"
                          />
                        </View>
                      )}
                    </View>
                  </HCard>
                </>
              )}

              <View style={styles.navButtons}>
                <View style={styles.navBtnSmall}>
                  <HButton variant="blue" outline onPress={() => setStep(1)}>← BACK</HButton>
                </View>
                <View style={styles.navBtnLarge}>
                  <HButton variant="copper" onPress={() => setStep(3)}>NEXT: REVIEW →</HButton>
                </View>
              </View>
            </>
          )}

          {/* STEP 4: REVIEW */}
          {step === 3 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>REVIEW EXPEDITION</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Preview card */}
              <HCard>
                {coverImageUri ? (
                  <Image source={{ uri: coverImageUri }} style={{ width: '100%', height: 120 }} />
                ) : (
                  <ImagePlaceholder height={120} />
                )}
                <View style={styles.previewContent}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>
                    {name || 'Untitled Expedition'}
                  </Text>
                  <Text style={[styles.previewMeta, { color: colors.textTertiary }]}>
                    {selectedCat || '—'}
                    {selectedRegions.length > 0 ? ` · ${selectedRegions.join(', ')}` : ''}
                  </Text>
                  {description ? (
                    <Text style={[styles.previewDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {description}
                    </Text>
                  ) : null}
                  <View style={[styles.previewDivider, { borderTopColor: colors.borderThin }]}>
                    <Text style={[styles.previewInfo, { color: colors.textTertiary }]}>
                      {startDateStr ? fmtDateDisplay(startDateStr) : '—'} → {endDateStr ? fmtDateDisplay(endDateStr) : '—'} · {waypoints.length} waypoints · {derivedStatus.toUpperCase()}
                    </Text>
                  </View>
                  {fundingEnabled && fundingGoal && (
                    <View style={[styles.previewDivider, { borderTopColor: colors.borderThin }]}>
                      <Text style={styles.fundingLabel}>FUNDING GOAL</Text>
                      <Text style={[styles.fundingAmount, { color: colors.text }]}>${fundingGoal}</Text>
                    </View>
                  )}
                  {notesVisibility === 'sponsor' && (
                    <View style={[styles.previewDivider, { borderTopColor: colors.borderThin }]}>
                      <Text style={styles.fundingLabel}>NOTES ACCESS</Text>
                      <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
                        Sponsor exclusive{notesAccessThreshold ? ` · $${notesAccessThreshold} threshold` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </HCard>

              {/* Launch Checklist */}
              <HCard>
                <View style={[styles.checklistHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderThin }]}>
                  <Text style={[styles.checklistTitle, { color: colors.text }]}>
                    {isEditMode ? 'SAVE CHECKLIST' : 'LAUNCH CHECKLIST'}
                  </Text>
                </View>
                {[
                  { label: 'Expedition name', done: !!name.trim() },
                  ...(!isEditMode ? [{ label: 'Cover image', done: !!coverImageUrl }] : []),
                  { label: 'Description', done: !!description.trim() },
                  { label: 'Route with waypoints', done: waypoints.length > 0 },
                  { label: 'Funding goal', done: !fundingEnabled || (!!fundingGoal && parseFloat(fundingGoal.replace(/,/g, '')) > 0) },
                  { label: 'Notes threshold', done: notesVisibility !== 'sponsor' || (!!notesAccessThreshold && Number(notesAccessThreshold) > 0) },
                  ...(!isEditMode ? [{ label: 'Dates set', done: !!startDateStr }] : []),
                ].map((item, i) => (
                  <View
                    key={item.label}
                    style={[
                      styles.checklistItem,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                    ]}
                  >
                    <View style={[
                      styles.checklistBox,
                      {
                        borderColor: item.done ? brandColors.green : colors.textTertiary,
                        backgroundColor: item.done ? brandColors.green : 'transparent',
                      }
                    ]}>
                      {item.done && (
                        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                          <Path d="M20 6L9 17l-5-5" />
                        </Svg>
                      )}
                    </View>
                    <Text style={[styles.checklistLabel, { color: item.done ? colors.text : colors.textTertiary }]}>
                      {item.label}
                    </Text>
                    {!item.done && (
                      <Text style={styles.checklistAdd}>ADD</Text>
                    )}
                  </View>
                ))}
              </HCard>

              {isEditMode ? (
                <View style={styles.launchActions}>
                  <HButton variant="copper" onPress={handleSaveEdit} disabled={submitting}>
                    {submitting ? 'SAVING...' : 'SAVE CHANGES'}
                  </HButton>
                </View>
              ) : (
                <View style={styles.launchActions}>
                  <HButton variant="copper" onPress={() => handleLaunch(false)} disabled={submitting}>
                    {submitting ? 'LAUNCHING...' : 'LAUNCH EXPEDITION'}
                  </HButton>
                  <View style={styles.gap} />
                  <HButton variant="copper" outline onPress={() => handleLaunch(true)} disabled={submitting}>
                    SAVE AS DRAFT
                  </HButton>
                </View>
              )}

              {/* Danger Zone — edit mode only */}
              {isEditMode && (
                <View style={styles.dangerZone}>
                  <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                    <Text style={[styles.sectionTitle, { color: brandColors.red }]}>DANGER ZONE</Text>
                    <View style={[styles.sectionLine, { backgroundColor: brandColors.red }]} />
                  </View>
                  <HCard>
                    <View style={styles.stepBody}>
                      <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
                        Permanently delete this expedition and all its data.
                      </Text>
                      {(editExpedition?.entriesCount ?? 0) > 0 && (
                        <Text style={[styles.dangerDisabledText, { color: colors.textTertiary }]}>
                          Cannot delete — this expedition has {editExpedition?.entriesCount} {editExpedition?.entriesCount === 1 ? 'entry' : 'entries'}. Remove all entries first.
                        </Text>
                      )}
                      <HButton
                        variant="destructive"
                        outline
                        onPress={handleDeleteExpedition}
                        disabled={(editExpedition?.entriesCount ?? 0) > 0}
                      >
                        DELETE EXPEDITION
                      </HButton>
                    </View>
                  </HCard>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <CalendarPicker
        visible={!!datePicker}
        value={datePicker === 'start' ? startDateStr : endDateStr}
        minDate={datePicker === 'end' ? startDateStr : undefined}
        onSelect={(val) => {
          if (datePicker === 'start') {
            setStartDateStr(val);
            if (endDateStr && val > endDateStr) setEndDateStr('');
          } else {
            setEndDateStr(val);
          }
        }}
        onClose={() => setDatePicker(null)}
      />
    </View>
  );
}

export default function ExpeditionBuilderScreen() {
  return <ExpeditionBuilder />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  loader: { flex: 1 },
  blockedWrap: { padding: 16, paddingTop: 24 },
  blockedInner: { padding: 16 },
  blockedTitle: { fontFamily: mono, fontSize: 14, fontWeight: '700', letterSpacing: 0.8 },
  blockedName: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  blockedDesc: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  blockedActions: { marginTop: 20 },
  blockedGap: { height: 8 },
  scroll: { flex: 1 },
  form: { padding: 16 },
  infoBanner: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  stepCounter: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.copper,
  },
  stepBar: {
    flexDirection: 'row',
    borderBottomWidth: borders.thick,
  },
  stepItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    position: 'relative',
  },
  stepItemActive: {
    borderBottomColor: brandColors.copper,
  },
  stepLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.54,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 6,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.66,
    marginBottom: 6,
  },
  sectionLine: {
    height: 2,
  },
  stepBody: { padding: 14 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  textarea: {
    borderWidth: borders.thick,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 90,
  },
  dashedBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  dashedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  coverPreview: {
    width: '100%',
    height: 180,
    borderRadius: 4,
  },
  coverUploading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  regionGroup: {
    marginBottom: 12,
  },
  regionGroupLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
  },
  chipText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '600',
  },
  dateClear: {
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  dateClearText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusIndicator: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtnSmall: { flex: 1 },
  navBtnLarge: { flex: 2 },
  infoCard: {
    padding: 14,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#616161',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: brandColors.copper,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  previewContent: {
    padding: 14,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
  },
  previewMeta: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  previewDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  previewDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  previewInfo: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  fundingLabel: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.copper,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  fundingAmount: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: '700',
  },
  launchActions: {
    marginTop: 24,
  },
  gap: { height: 8 },
  spacer: { height: 32 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: {},
  legendText: { fontFamily: mono, fontSize: 10, fontWeight: '600' },
  // ── Route builder (map/list toggle) ──
  routeContainer: { flex: 1 },
  routeToolbar: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: borders.thick,
  },
  routeToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: borders.thick,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  viewToggleBtnActive: {
    backgroundColor: brandColors.copper,
  },
  viewToggleText: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  routeWpCount: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  routeMapWrap: { flex: 1 },
  routeInstruction: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInstructionBox: {
    alignItems: 'center',
    padding: 20,
    paddingHorizontal: 28,
    borderWidth: borders.thick,
    gap: 8,
  },
  routeInstructionTitle: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  routeInstructionSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  geolocateBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderWidth: borders.thick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLegend: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: borders.thick,
  },
  routeListView: {
    flex: 1,
  },
  routeListEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  routeListEmptyText: {
    fontFamily: mono,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  routeWpCoords: {
    fontFamily: mono,
    fontSize: 10,
    marginTop: 2,
  },
  routeNavWrap: {
    borderTopWidth: borders.thick,
  },
  routeWpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  routeWpReorder: {
    alignItems: 'center',
    gap: 4,
  },
  routeWpDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeWpDotText: {
    fontFamily: mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  routeWpInfo: { flex: 1 },
  routeWpName: { fontSize: 13, fontWeight: '600' },
  routeWpType: { fontFamily: mono, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, marginTop: 1 },
  routeWpAction: { padding: 4 },
  routeNavRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  routeNavBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: borders.thick,
  },
  routeNavBtnText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  checklistHeader: { padding: 10, paddingHorizontal: 14 },
  checklistTitle: { fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 14 },
  checklistBox: { width: 16, height: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checklistLabel: { fontSize: 12, flex: 1 },
  checklistAdd: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: brandColors.copper },
  // ── Route mode selector ──
  routeModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: borders.thick,
    overflow: 'hidden',
  },
  routeModeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  routeModeBtnActive: {
    backgroundColor: brandColors.copper,
  },
  routeModeBtnText: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  routeErrorBar: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: borders.thick,
  },
  routeErrorText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Find along route ──
  findRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brandColors.blue,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  findRouteBtnText: {
    fontFamily: mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#fff',
  },
  searchPanel: {
    borderBottomWidth: borders.thick,
  },
  searchPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.blue,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  searchPanelTitle: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#fff',
  },
  searchCatScroll: {
    maxHeight: 40,
  },
  searchCatContent: {
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchCatBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
  },
  searchCatText: {
    fontFamily: mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  searchResults: {
    borderTopWidth: 1,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchResultsCount: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
  },
  searchResultsList: {
    maxHeight: 160,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchResultAddr: {
    fontSize: 10,
    marginTop: 1,
  },
  searchResultDist: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '600',
    color: brandColors.blue,
    marginTop: 2,
  },
  searchAddBtn: {
    padding: 6,
    borderWidth: borders.thick,
    borderColor: brandColors.blue,
  },
  // ── Waypoint edit modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderWidth: borders.thick,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  modalBody: {
    padding: 16,
  },
  modalCoords: {
    marginTop: 12,
    marginBottom: 4,
  },
  modalCoordsText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  modalRoundTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
  },
  modalRoundTripText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  modalDeleteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: borders.thick,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modalDoneBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#fff',
  },
  lockedFieldInfo: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 8,
  },
  dangerZone: {
    marginTop: 16,
  },
  dangerText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  dangerDisabledText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
});
