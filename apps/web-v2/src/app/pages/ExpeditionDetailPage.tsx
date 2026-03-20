'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Compass } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useMapLayer, getMapStyle, getLineCasingColor } from '@/app/context/MapLayerContext';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { usePageOwner } from '@/app/context/PageOwnerContext';
import { UpdateLocationModal } from '@/app/components/UpdateLocationModal';
import { ExpeditionManagementModal } from '@/app/components/ExpeditionManagementModal';
import { expeditionApi, explorerApi, type ExplorerProfile } from '@/app/services/api';
import { ReportModal } from '@/app/components/ReportModal';
import { formatDate } from '@/app/utils/dateFormat';
import { formatCoords } from '@/app/utils/formatCoords';
import { renderClusteredMarkers, computePopupPosition, type EntryCluster } from '@/app/utils/mapClustering';
import { buildMergedRouteCoords } from '@/app/utils/routeSnapping';
import { HeroBanner } from '@/app/components/expedition-detail/HeroBanner';
import { StatsBar } from '@/app/components/expedition-detail/StatsBar';
import { ContentTabs } from '@/app/components/expedition-detail/ContentTabs';
import { Sidebar } from '@/app/components/expedition-detail/Sidebar';
import { MapModal } from '@/app/components/expedition-detail/MapModal';
import { useExpeditionData } from '@/app/hooks/useExpeditionData';
import { useExpeditionSponsors } from '@/app/hooks/useExpeditionSponsors';
import { useWeatherConditions } from '@/app/hooks/useWeatherConditions';
import { useExpeditionNotes } from '@/app/hooks/useExpeditionNotes';
import { useDebriefMode } from '@/app/hooks/useDebriefMode';
import type { JournalEntryType } from '@/app/components/expedition-detail/types';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

export function ExpeditionDetailPage() {
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { mapLayer } = useMapLayer();
  const { formatDistance } = useDistanceUnit();
  const { isPro } = useProFeatures();
  const { setIsOwnContent } = usePageOwner();
  const [selectedView, setSelectedView] = useState<'notes' | 'entries' | 'waypoints' | 'sponsors'>('entries');
  const [showUpdateLocationModal, setShowUpdateLocationModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => Date.now(), []);

  // Core data hook
  const {
    apiExpedition,
    setApiExpedition,
    loading,
    expedition,
    totalDuration,
    isOwner,
    showSponsorshipSection,
    waypoints,
    journalEntries,
    totalRouteDistance,
    currentLocationData,
    isFollowingExplorer,
    followLoading,
    isBookmarked,
    bookmarkLoading,
    entryBookmarked,
    entryBookmarkLoading,
    handleFollowExplorer,
    handleBookmarkExpedition,
    handleBookmarkEntry,
  } = useExpeditionData(expeditionId, user, isAuthenticated);

  // Signal ownership to Header nav highlighting
  useEffect(() => {
    setIsOwnContent(isOwner);
    return () => setIsOwnContent(false);
  }, [isOwner, setIsOwnContent]);

  // Derived data hooks
  const { sponsors, fundingStats } = useExpeditionSponsors(apiExpedition);
  const { weatherCondition, weatherLocalTime } = useWeatherConditions(apiExpedition, expeditionId);
  const notesVisibility = (apiExpedition as any)?.notesVisibility || 'public';
  const {
    expeditionNotes, noteCount, dailyLimit, isSponsoring, isPublicNotes,
    handlePostNote, handlePostReply,
    handleEditNote, handleDeleteNote,
    handleEditReply, handleDeleteReply,
  } = useExpeditionNotes(expeditionId, isAuthenticated, isOwner, notesVisibility);

  // Explorer profile data (for global stats in HeroBanner)
  const [explorerProfile, setExplorerProfile] = useState<ExplorerProfile | null>(null);
  useEffect(() => {
    if (!expedition?.explorerId) return;
    explorerApi.getByUsername(expedition.explorerId).then(setExplorerProfile).catch(() => {});
  }, [expedition?.explorerId]);

  // Total raised = one-time sponsorships + recurring committed during expedition lifetime
  const totalRaised = (expedition?.raised || 0) + fundingStats.totalRecurringToDate;

  // Map popup state
  const [clickedEntry, setClickedEntry] = useState<JournalEntryType | null>(null);
  const [clickedCluster, setClickedCluster] = useState<EntryCluster<JournalEntryType> | null>(null);
  const [sourceCluster, setSourceCluster] = useState<EntryCluster<JournalEntryType> | null>(null);
  const [popupPosition, setPopupPosition] = useState<'bottom-left' | 'bottom-right'>('bottom-right');
  const markerClickedRef = useRef(false);

  // Map & modal state
  const bannerMapContainerRef = useRef<HTMLDivElement | null>(null);
  const bannerMapRef = useRef<mapboxgl.Map | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [modalMapReady, setModalMapReady] = useState(false);
  const [pendingFlyTo, setPendingFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Mapbox map reference (modal)
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Handler for waypoint click - open modal and fly to waypoint
  const handleWaypointClick = (coords: { lat: number; lng: number }) => {
    setPendingFlyTo(coords);
    setIsMapModalOpen(true);
  };

  // Handler for closing the map modal
  const handleCloseModal = () => {
    if (isDebriefMode) exitDebriefMode();
    setIsMapModalOpen(false);
    setPendingFlyTo(null);
  };

  // Handler for sponsor update button - scrolls to notes and focuses input
  const handleSponsorUpdate = () => {
    // Switch to notes tab
    setSelectedView('notes');
    
    // Scroll to notes section after a brief delay to allow tab switch
    setTimeout(() => {
      if (notesSectionRef.current) {
        notesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Focus the textarea after scrolling
      setTimeout(() => {
        if (notesInputRef.current) {
          notesInputRef.current.focus();
        }
      }, 500);
    }, 100);
  };

  // Handler for sharing expedition
  const handleShare = async () => {
    const url = `${window.location.origin}/expedition/${expeditionId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: expedition?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      // User cancelled share dialog
    }
  };

  // Handler for updating location from modal
  const handleLocationUpdate = async (source: 'waypoint' | 'entry', id: string, visibility: 'public' | 'sponsors' | 'private') => {
    if (!expedition?.id) return;
    await expeditionApi.updateLocation(expedition.id, source, id, visibility);
    // Refetch expedition to get updated state
    const updated = await expeditionApi.getById(expedition.id);
    setApiExpedition(updated);
  };

  // Handler for completing an expedition
  const handleComplete = async (actualEndDate: string) => {
    if (!expedition?.id) return;
    await expeditionApi.complete(expedition.id, actualEndDate);
    const refreshed = await expeditionApi.getById(expedition.id);
    setApiExpedition(refreshed);
  };

  // Handler to fit map to all expedition markers
  const handleFitBounds = useCallback(() => {
    if (!mapRef.current) return;

    const allCoords: [number, number][] = [
      ...waypoints.map(wp => [wp.coords.lng, wp.coords.lat] as [number, number]),
      ...journalEntries.map(entry => [entry.coords.lng, entry.coords.lat] as [number, number]),
    ];

    if (allCoords.length === 0) return;

    const bounds = allCoords.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));

    mapRef.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 14,
      duration: 1000,
    });
  }, [waypoints, journalEntries]);

  // Debrief mode hook
  const {
    isDebriefMode,
    debriefIndex,
    debriefDistance,
    debriefRoute,
    canDebrief,
    entryTimelinePositions,
    routeCoordsRef,
    markersRef,
    waypointMarkersRef,
    clusteredRef,
    enterDebriefMode: enterDebriefModeRaw,
    exitDebriefMode,
    flyToDebriefStop,
  } = useDebriefMode({
    waypoints,
    journalEntries,
    apiExpedition,
    mapRef,
    handleFitBounds,
    formatDistance,
  });

  const enterDebriefMode = useCallback(() => {
    enterDebriefModeRaw(setClickedEntry);
  }, [enterDebriefModeRaw]);





  // Modal Escape handler (when not in debrief mode)
  useEffect(() => {
    if (!isMapModalOpen || isDebriefMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMapModalOpen(false);
        setPendingFlyTo(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMapModalOpen, isDebriefMode]);

  // Helper: check if any coordinate data exists for maps
  const hasMapData = waypoints.length > 0 || journalEntries.some(e => e.coords.lat !== 0 || e.coords.lng !== 0);

  // Initialize non-interactive banner map
  useEffect(() => {
    if (!bannerMapContainerRef.current) return;

    // Guard: skip if no coordinate data exists
    const hasCoords = waypoints.length > 0 || journalEntries.some(e => e.coords.lat !== 0 || e.coords.lng !== 0);
    if (!hasCoords) return;

    const map = new mapboxgl.Map({
      container: bannerMapContainerRef.current,
      style: getMapStyle(mapLayer, theme),
      center: [0, 0],
      zoom: 2,
      interactive: false,
      attributionControl: false,
    });

    bannerMapRef.current = map;

    // Suppress style evaluation warnings
    map.on('error', (e) => {
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) return;
    });

    map.on('load', () => {
      // Route lines — fallback merges waypoints + entries by geographic proximity
      const hasDirectionsRoute = apiExpedition?.routeGeometry && apiExpedition.routeGeometry.length > 0;
      const routeCoordinates = hasDirectionsRoute
        ? apiExpedition.routeGeometry!
        : buildMergedRouteCoords(
            waypoints.map(wp => wp.coords),
            journalEntries.map(e => e.coords),
          );

      const casingColor = getLineCasingColor(mapLayer, theme);

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
          paint: {
            'line-color': casingColor,
            'line-width': hasDirectionsRoute ? 8 : 7,
            'line-opacity': 0.3,
          },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': theme === 'dark' ? '#4676ac' : '#202020',
            'line-width': hasDirectionsRoute ? 4 : 3,
            'line-opacity': 0.8,
            ...(hasDirectionsRoute ? {} : { 'line-dasharray': [2, 2] }),
          },
        });
      }

      // Completed route overlay
      let currentLocCoords: { lng: number; lat: number } | null = null;
      const curSrc = apiExpedition?.currentLocationSource;
      const curId = apiExpedition?.currentLocationId;
      if (curSrc === 'waypoint' && curId) {
        const wp = waypoints.find(w => w.id === curId);
        if (wp) currentLocCoords = { lng: wp.coords.lng, lat: wp.coords.lat };
      } else if (curSrc === 'entry' && curId) {
        const entry = journalEntries.find(e => e.id === curId);
        if (entry && (entry.coords.lat !== 0 || entry.coords.lng !== 0)) {
          currentLocCoords = { lng: entry.coords.lng, lat: entry.coords.lat };
        }
      }

      if (currentLocCoords && routeCoordinates.length >= 2) {
        let completedCoords: number[][];
        if (hasDirectionsRoute) {
          // Dense point set — nearest-coordinate search works fine
          let closestIdx = 0;
          let closestDist = Infinity;
          for (let i = 0; i < routeCoordinates.length; i++) {
            const [lng, lat] = routeCoordinates[i];
            const d = Math.pow(lng - currentLocCoords.lng, 2) + Math.pow(lat - currentLocCoords.lat, 2);
            if (d < closestDist) { closestDist = d; closestIdx = i; }
          }
          completedCoords = routeCoordinates.slice(0, closestIdx + 1);
        } else {
          // Fallback route (waypoint-to-waypoint) — use waypoint status
          completedCoords = waypoints
            .filter(w => (w.status === 'completed' || w.status === 'current') && (w.coords.lat !== 0 || w.coords.lng !== 0))
            .map(w => [w.coords.lng, w.coords.lat]);
          if (curSrc === 'entry') {
            completedCoords.push([currentLocCoords.lng, currentLocCoords.lat]);
          }
        }
        if (completedCoords.length >= 2) {
          map.addSource('completed-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: completedCoords },
            },
          });
          map.addLayer({
            id: 'completed-route-casing',
            type: 'line',
            source: 'completed-route',
            paint: { 'line-color': casingColor, 'line-width': 8, 'line-opacity': 0.3 },
          });
          map.addLayer({
            id: 'completed-route',
            type: 'line',
            source: 'completed-route',
            paint: { 'line-color': '#ac6d46', 'line-width': 4, 'line-opacity': 0.9 },
          });
        }
      }

      // Pulse animation style
      if (!document.getElementById('wp-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'wp-pulse-style';
        style.textContent = `@keyframes wp-pulse { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 100% { box-shadow: 0 0 0 16px rgba(255,255,255,0); } }`;
        document.head.appendChild(style);
      }

      const isRoundTrip = apiExpedition?.isRoundTrip;

      // Unified waypoint markers — all markers rendered from waypoints array
      // Converted waypoints (with entries) show as circles, unconverted as diamonds
      const linkedEntryIds = new Set<string>();
      waypoints.forEach((wp) => {
        (wp.entryIds || []).forEach(eid => linkedEntryIds.add(eid));
      });

      // Entry numbers: sorted by date asc, route position as tiebreaker for same-date entries
      const entryRoutePosition = new Map<string, number>();
      waypoints.forEach((wp, wpIdx) => {
        (wp.entryIds || []).forEach(eid => entryRoutePosition.set(eid, wpIdx));
      });
      const sortedEntriesForNumbering = [...journalEntries].sort((a, b) => {
        const da = new Date(a.date).getTime(), db = new Date(b.date).getTime();
        if (da !== db) return da - db;
        const ra = entryRoutePosition.get(a.id) ?? Infinity, rb = entryRoutePosition.get(b.id) ?? Infinity;
        if (ra !== rb) return ra - rb;
        return (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      });
      const entryNumberMap = new Map(sortedEntriesForNumbering.map((e, i) => [e.id, i + 1]));

      // Waypoint numbers: independent sequence counting only unconverted waypoints in route order
      const waypointNumberMap = new Map<string, number>();
      let wpNum = 0;
      waypoints.forEach((wp) => {
        if (!(wp.entryIds && wp.entryIds.length > 0)) {
          wpNum++;
          waypointNumberMap.set(wp.id, wpNum);
        }
      });

      waypoints.forEach((wp, idx) => {
        const isStart = idx === 0;
        const isEnd = !isRoundTrip && idx === waypoints.length - 1 && waypoints.length > 1;
        const isCurrent = wp.status === 'current';
        const entryIds = wp.entryIds || [];

        const wrapper = document.createElement('div');
        wrapper.className = 'banner-waypoint-marker';

        if (entryIds.length > 1) {
          // Multi-entry cluster badge (circle)
          Object.assign(wrapper.style, {
            width: '30px', height: '30px', borderRadius: '50%',
            backgroundColor: '#8a5738', border: '3px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            fontSize: '12px', color: 'white', textAlign: 'center', lineHeight: '24px',
            fontWeight: 'bold', fontFamily: 'Jost, system-ui, sans-serif',
          });
          wrapper.textContent = String(entryIds.length);
        } else if (entryIds.length === 1) {
          // Single-entry circle marker
          const linkedEntry = journalEntries.find(e => e.id === entryIds[0]);
          const milestone = linkedEntry?.isMilestone || false;
          Object.assign(wrapper.style, {
            width: milestone ? '26px' : '22px', height: milestone ? '26px' : '22px', borderRadius: '50%',
            backgroundColor: '#ac6d46', border: '2px solid white',
            boxShadow: milestone ? '0 0 0 3px #ac6d46, 0 2px 6px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: milestone ? '12px' : '11px', color: 'white', fontWeight: 'bold',
            fontFamily: 'Jost, system-ui, sans-serif',
          });
          wrapper.textContent = String(entryNumberMap.get(entryIds[0]) ?? idx + 1);
        } else {
          // Unconverted — diamond marker
          const diamond = document.createElement('div');
          Object.assign(diamond.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)' });

          const label = document.createElement('span');
          Object.assign(label.style, { transform: 'rotate(-45deg)', color: 'white', fontWeight: 'bold', lineHeight: '1' });

          if (isStart && isRoundTrip) {
            Object.assign(diamond.style, { width: '30px', height: '30px', backgroundColor: '#ac6d46', border: '3px solid #4676ac', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' });
            label.style.fontSize = '13px'; label.textContent = 'S';
          } else if (isStart || isEnd) {
            Object.assign(diamond.style, { width: '30px', height: '30px', backgroundColor: isStart ? '#ac6d46' : '#4676ac', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' });
            label.style.fontSize = '13px'; label.textContent = isStart ? 'S' : 'E';
          } else {
            Object.assign(diamond.style, { width: '24px', height: '24px', backgroundColor: '#616161', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' });
            label.style.fontSize = '11px'; label.textContent = String(waypointNumberMap.get(wp.id) ?? idx + 1);
          }

          diamond.appendChild(label);
          wrapper.appendChild(diamond);
          if (isCurrent) diamond.style.animation = 'wp-pulse 2s ease-out infinite';
        }

        if (isCurrent && entryIds.length > 0) {
          wrapper.style.animation = 'wp-pulse 2s ease-out infinite';
        }

        new mapboxgl.Marker(wrapper).setLngLat([wp.coords.lng, wp.coords.lat]).addTo(map);
      });

      // Legacy entry markers — entries not linked to any waypoint
      journalEntries
        .filter(entry => (entry.coords.lat !== 0 || entry.coords.lng !== 0) && !linkedEntryIds.has(entry.id))
        .forEach((entry) => {
          const el = document.createElement('div');
          el.className = 'banner-entry-marker';
          const milestone = entry.isMilestone || false;
          Object.assign(el.style, {
            width: milestone ? '26px' : '24px', height: milestone ? '26px' : '24px', borderRadius: '50%',
            backgroundColor: '#ac6d46', border: '2px solid white',
            boxShadow: milestone ? '0 0 0 3px #ac6d46, 0 2px 6px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.3)',
          });

          if (curSrc === 'entry' && curId === entry.id) {
            el.style.animation = 'wp-pulse 2s ease-out infinite';
          }

          new mapboxgl.Marker(el).setLngLat([entry.coords.lng, entry.coords.lat]).addTo(map);
        });

      // Fit bounds (instant, no animation)
      const allCoords: [number, number][] = [
        ...waypoints.map(wp => [wp.coords.lng, wp.coords.lat] as [number, number]),
        ...journalEntries
          .filter(entry => entry.coords.lat !== 0 || entry.coords.lng !== 0)
          .map(entry => [entry.coords.lng, entry.coords.lat] as [number, number]),
      ];

      if (allCoords.length > 0) {
        const bounds = allCoords.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 0 });
      }
    });

    return () => {
      map.remove();
      bannerMapRef.current = null;
    };
  }, [theme, mapLayer, waypoints, journalEntries, apiExpedition, debriefRoute]);

  // Phase 1: When modal opens, wait for browser paint then signal ready
  useEffect(() => {
    if (!isMapModalOpen) {
      setModalMapReady(false);
      return;
    }
    document.body.style.overflow = 'hidden';
    let cancelled = false;
    // Double requestAnimationFrame guarantees the modal DOM has been painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setModalMapReady(true);
      });
    });
    return () => {
      cancelled = true;
      document.body.style.overflow = '';
    };
  }, [isMapModalOpen]);

  // Phase 2: Create interactive map only after modal is confirmed painted
  useEffect(() => {
    if (!modalMapReady || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(mapLayer, theme),
      center: currentLocationData?.coords ? [currentLocationData.coords.lng, currentLocationData.coords.lat] : [0, 0],
      zoom: 5,
    });

    mapRef.current = map;

    // Add error handler - suppress style evaluation warnings
    map.on('error', (e) => {
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) return;
      console.error('Mapbox error:', e);
    });

    // Add navigation control (zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Close popup when clicking on the map background (not on a marker)
    map.on('click', () => {
      if (markerClickedRef.current) {
        markerClickedRef.current = false;
        return;
      }
      setClickedEntry(null);
      setClickedCluster(null);
      clusteredRef.current?.removeAllHighlights();
    });

    // Wait for map to load
    map.on('load', () => {
      map.resize();

      const hasDirectionsRoute = apiExpedition?.routeGeometry && apiExpedition.routeGeometry.length > 0;
      const isRoundTrip = apiExpedition?.isRoundTrip;
      const routeCoordinates = hasDirectionsRoute
        ? apiExpedition.routeGeometry!
        : buildMergedRouteCoords(
            waypoints.map(wp => wp.coords),
            journalEntries.map(e => e.coords),
          );

      routeCoordsRef.current = routeCoordinates;
      const casingColor = getLineCasingColor(mapLayer, theme);

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
          paint: {
            'line-color': casingColor,
            'line-width': hasDirectionsRoute ? 8 : 7,
            'line-opacity': 0.3,
          },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: {
            'line-color': theme === 'dark' ? '#4676ac' : '#202020',
            'line-width': hasDirectionsRoute ? 4 : 3,
            'line-opacity': 0.8,
            ...(hasDirectionsRoute ? {} : { 'line-dasharray': [2, 2] }),
          },
        });
      }

      // Add completed route line based on current location
      let currentLocCoords: { lng: number; lat: number } | null = null;
      const curSrc = apiExpedition?.currentLocationSource;
      const curId = apiExpedition?.currentLocationId;

      if (curSrc === 'waypoint' && curId) {
        const wp = waypoints.find(w => w.id === curId);
        if (wp) currentLocCoords = { lng: wp.coords.lng, lat: wp.coords.lat };
      } else if (curSrc === 'entry' && curId) {
        const entry = journalEntries.find(e => e.id === curId);
        if (entry && (entry.coords.lat !== 0 || entry.coords.lng !== 0)) {
          currentLocCoords = { lng: entry.coords.lng, lat: entry.coords.lat };
        }
      }

      if (currentLocCoords && routeCoordinates.length >= 2) {
        let completedCoords: number[][];
        if (hasDirectionsRoute) {
          // Dense point set — nearest-coordinate search works fine
          let closestIdx = 0;
          let closestDist = Infinity;
          for (let i = 0; i < routeCoordinates.length; i++) {
            const [lng, lat] = routeCoordinates[i];
            const d = Math.pow(lng - currentLocCoords.lng, 2) + Math.pow(lat - currentLocCoords.lat, 2);
            if (d < closestDist) { closestDist = d; closestIdx = i; }
          }
          completedCoords = routeCoordinates.slice(0, closestIdx + 1);
        } else {
          // Fallback route (waypoint-to-waypoint) — use waypoint status
          completedCoords = waypoints
            .filter(w => (w.status === 'completed' || w.status === 'current') && (w.coords.lat !== 0 || w.coords.lng !== 0))
            .map(w => [w.coords.lng, w.coords.lat]);
          if (curSrc === 'entry') {
            completedCoords.push([currentLocCoords.lng, currentLocCoords.lat]);
          }
        }
        if (completedCoords.length >= 2) {
          map.addSource('completed-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: completedCoords },
            },
          });
          map.addLayer({
            id: 'completed-route-casing',
            type: 'line',
            source: 'completed-route',
            paint: { 'line-color': casingColor, 'line-width': 8, 'line-opacity': 0.3 },
          });
          map.addLayer({
            id: 'completed-route',
            type: 'line',
            source: 'completed-route',
            paint: { 'line-color': '#ac6d46', 'line-width': 4, 'line-opacity': 0.9 },
          });
        }
      }

      // Inject pulse keyframe animation (once)
      if (!document.getElementById('wp-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'wp-pulse-style';
        style.textContent = `
          @keyframes wp-pulse {
            0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
            100% { box-shadow: 0 0 0 16px rgba(255,255,255,0); }
          }
        `;
        document.head.appendChild(style);
      }

      // Unified waypoint markers with click handlers
      const linkedEntryIds = new Set<string>();
      waypoints.forEach((wp) => {
        (wp.entryIds || []).forEach(eid => linkedEntryIds.add(eid));
      });

      // Entry numbers: sorted by date asc, route position as tiebreaker for same-date entries
      const entryRoutePosition = new Map<string, number>();
      waypoints.forEach((wp, wpIdx) => {
        (wp.entryIds || []).forEach(eid => entryRoutePosition.set(eid, wpIdx));
      });
      const sortedEntriesForNumbering = [...journalEntries].sort((a, b) => {
        const da = new Date(a.date).getTime(), db = new Date(b.date).getTime();
        if (da !== db) return da - db;
        const ra = entryRoutePosition.get(a.id) ?? Infinity, rb = entryRoutePosition.get(b.id) ?? Infinity;
        if (ra !== rb) return ra - rb;
        return (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      });
      const entryNumberMap = new Map(sortedEntriesForNumbering.map((e, i) => [e.id, i + 1]));

      // Waypoint numbers: independent sequence counting only unconverted waypoints in route order
      const waypointNumberMap = new Map<string, number>();
      let wpNum = 0;
      waypoints.forEach((wp) => {
        if (!(wp.entryIds && wp.entryIds.length > 0)) {
          wpNum++;
          waypointNumberMap.set(wp.id, wpNum);
        }
      });

      waypoints.forEach((wp, idx) => {
        const isStart = idx === 0;
        const isEnd = !isRoundTrip && idx === waypoints.length - 1 && waypoints.length > 1;
        const isCurrent = wp.status === 'current';
        const entryIds = wp.entryIds || [];

        const wrapper = document.createElement('div');
        wrapper.className = 'waypoint-marker';

        if (entryIds.length > 1) {
          // Multi-entry cluster badge
          Object.assign(wrapper.style, {
            width: '30px', height: '30px', borderRadius: '50%',
            backgroundColor: '#8a5738', border: '3px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            fontSize: '12px', color: 'white', textAlign: 'center', lineHeight: '24px',
            fontWeight: 'bold', fontFamily: 'Jost, system-ui, sans-serif',
            cursor: 'pointer',
          });
          wrapper.textContent = String(entryIds.length);

          wrapper.addEventListener('click', () => {
            markerClickedRef.current = true;
            const entries = entryIds
              .map(eid => journalEntries.find(e => e.id === eid))
              .filter(Boolean) as JournalEntryType[];
            if (entries.length > 0) {
              const cluster = {
                id: entryIds.sort().join('-'),
                center: wp.coords,
                entries,
              };
              setClickedEntry(null);
              setSourceCluster(null);
              const containerEl = mapContainerRef.current;
              if (containerEl) setPopupPosition(computePopupPosition(wrapper, containerEl));
              setClickedCluster(cluster);
            }
          });
        } else if (entryIds.length === 1) {
          // Single-entry circle marker
          const linkedEntry = journalEntries.find(e => e.id === entryIds[0]);
          const milestone = linkedEntry?.isMilestone || false;
          Object.assign(wrapper.style, {
            width: milestone ? '26px' : '22px', height: milestone ? '26px' : '22px', borderRadius: '50%',
            backgroundColor: '#ac6d46', border: '2px solid white',
            boxShadow: milestone ? '0 0 0 3px #ac6d46, 0 2px 6px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: milestone ? '12px' : '11px', color: 'white', fontWeight: 'bold',
            fontFamily: 'Jost, system-ui, sans-serif',
          });
          wrapper.textContent = String(entryNumberMap.get(entryIds[0]) ?? idx + 1);

          wrapper.addEventListener('click', () => {
            markerClickedRef.current = true;
            const entry = linkedEntry || journalEntries.find(e => e.id === entryIds[0]);
            if (entry) {
              setClickedCluster(null);
              setSourceCluster(null);
              const containerEl = mapContainerRef.current;
              if (containerEl) setPopupPosition(computePopupPosition(wrapper, containerEl));
              setClickedEntry(entry);
            }
          });
        } else {
          // Unconverted — diamond marker
          const diamond = document.createElement('div');
          diamond.style.display = 'flex';
          diamond.style.alignItems = 'center';
          diamond.style.justifyContent = 'center';
          diamond.style.transform = 'rotate(45deg)';

          const label = document.createElement('span');
          label.style.transform = 'rotate(-45deg)';
          label.style.color = 'white';
          label.style.fontWeight = 'bold';
          label.style.lineHeight = '1';

          if (isStart && isRoundTrip) {
            diamond.style.width = '26px'; diamond.style.height = '26px';
            diamond.style.backgroundColor = '#ac6d46'; diamond.style.border = '3px solid #4676ac';
            diamond.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            label.style.fontSize = '14px'; label.textContent = 'S';
          } else if (isStart || isEnd) {
            diamond.style.width = '26px'; diamond.style.height = '26px';
            diamond.style.backgroundColor = isStart ? '#ac6d46' : '#4676ac'; diamond.style.border = '3px solid white';
            diamond.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            label.style.fontSize = '14px'; label.textContent = isStart ? 'S' : 'E';
          } else {
            diamond.style.width = '22px'; diamond.style.height = '22px';
            diamond.style.backgroundColor = '#616161'; diamond.style.border = '2px solid white';
            diamond.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
            label.style.fontSize = '12px'; label.textContent = String(waypointNumberMap.get(wp.id) ?? idx + 1);
          }

          diamond.appendChild(label);
          wrapper.appendChild(diamond);
          if (isCurrent) diamond.style.animation = 'wp-pulse 2s ease-out infinite';
        }

        if (isCurrent && entryIds.length > 0) {
          wrapper.style.animation = 'wp-pulse 2s ease-out infinite';
        }

        const wpMarker = new mapboxgl.Marker(wrapper)
          .setLngLat([wp.coords.lng, wp.coords.lat])
          .addTo(map);
        waypointMarkersRef.current.push(wpMarker);
      });

      // Clear existing entry markers
      clusteredRef.current?.cleanup();
      markersRef.current = [];

      // Legacy entry markers — only for entries not linked to any waypoint
      const legacyEntries = journalEntries.filter(e =>
        (e.coords.lat !== 0 || e.coords.lng !== 0) && !linkedEntryIds.has(e.id)
      );

      if (legacyEntries.length > 0) {
        const highlightId = curSrc === 'entry' ? curId : undefined;
        const numberedEntries = legacyEntries.map(e => ({
          ...e,
          timelinePosition: entryTimelinePositions.get(e.id),
        }));
        const result = renderClusteredMarkers<JournalEntryType>({
          entries: numberedEntries,
          map,
          mapContainerRef,
          onSingleEntryClick: (entry, position) => {
            markerClickedRef.current = true;
            setClickedCluster(null);
            setSourceCluster(null);
            setPopupPosition(position);
            setClickedEntry(entry);
          },
          onClusterClick: (cluster, position) => {
            markerClickedRef.current = true;
            setClickedEntry(null);
            setSourceCluster(null);
            setPopupPosition(position);
            setClickedCluster(cluster);
          },
          onMarkerClicked: () => { markerClickedRef.current = true; },
          highlightEntryId: highlightId,
        });
        markersRef.current = result.markers;
        clusteredRef.current = result;
        map.on('zoomend', result.recalculate);
      }

      // Fit bounds to show all markers
      const allCoords: [number, number][] = [
        ...waypoints.map(wp => [wp.coords.lng, wp.coords.lat] as [number, number]),
        ...journalEntries
          .filter(entry => entry.coords.lat !== 0 || entry.coords.lng !== 0)
          .map(entry => [entry.coords.lng, entry.coords.lat] as [number, number]),
      ];

      if (allCoords.length > 0) {
        const bounds = allCoords.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));

        map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 500 });
      }

      // If a pending flyTo was requested, fly there after initial bounds
      if (pendingFlyTo) {
        setTimeout(() => {
          map.flyTo({ center: [pendingFlyTo.lng, pendingFlyTo.lat], zoom: 12, duration: 1500 });
          setPendingFlyTo(null);
        }, 600);
      }
    });

    // Cleanup
    return () => {
      waypointMarkersRef.current.forEach(marker => marker.remove());
      waypointMarkersRef.current = [];
      clusteredRef.current?.cleanup();
      clusteredRef.current = null;
      markersRef.current = [];
      setClickedEntry(null);
      setClickedCluster(null);
      try { map.remove(); } catch { /* container may already be unmounted */ }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalMapReady, theme, mapLayer, waypoints, journalEntries, apiExpedition]);

  // Handle pendingFlyTo when modal is already open (clicking different waypoints)
  useEffect(() => {
    if (isMapModalOpen && pendingFlyTo && mapRef.current) {
      const map = mapRef.current;
      const timer = setTimeout(() => {
        map.flyTo({ center: [pendingFlyTo.lng, pendingFlyTo.lat], zoom: 12, duration: 1500 });
        setPendingFlyTo(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMapModalOpen, pendingFlyTo]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#ac6d46]" />
          <span className="ml-3 text-[#616161]">Loading expedition...</span>
        </div>
      </div>
    );
  }

  // Not found state
  if (!expedition) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Compass className="w-16 h-16 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            Expedition not found
          </h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
            The expedition you're looking for doesn't exist or may have been removed.
          </p>
          <button
            onClick={() => router.push('/expeditions')}
            className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
          >
            BROWSE EXPEDITIONS
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Hero Banner + Stats Bar */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <HeroBanner
          expedition={expedition}
          hasMapData={hasMapData}
          bannerMapContainerRef={bannerMapContainerRef}
          currentLocationData={currentLocationData}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          showSponsorshipSection={showSponsorshipSection}
          isFollowingExplorer={isFollowingExplorer}
          followLoading={followLoading}
          isBookmarked={isBookmarked}
          bookmarkLoading={bookmarkLoading}
          shareCopied={shareCopied}
          apiExpedition={apiExpedition}
          totalDuration={totalDuration}
          formatDate={formatDate}
          formatCoords={formatCoords}
          onOpenMapModal={() => setIsMapModalOpen(true)}
          onFollow={handleFollowExplorer}
          onBookmark={handleBookmarkExpedition}
          onShare={handleShare}
          onCurrentLocationClick={(coords) => {
            setPendingFlyTo(coords);
            setIsMapModalOpen(true);
          }}
          explorerProfile={explorerProfile}
          onReport={() => setReportOpen(true)}
        />
        {/* Mobile description - shown below banner since banner has limited space */}
        {expedition.description && (
          <div className="md:hidden px-6 py-4 border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <p className="text-sm font-serif text-[#202020] dark:text-[#e5e5e5]" style={{ lineHeight: 1.75 }}>{expedition.description}</p>
          </div>
        )}
        <StatsBar
          expedition={expedition}
          showSponsorshipSection={showSponsorshipSection}
          totalRaised={totalRaised}
          totalRouteDistance={totalRouteDistance}
          now={now}
          apiExpedition={apiExpedition}
          formatDistance={formatDistance}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Tabs - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <ContentTabs
            selectedView={selectedView}
            onSelectView={setSelectedView}
            expedition={expedition}
            showSponsorshipSection={showSponsorshipSection}
            journalEntries={journalEntries}
            waypoints={waypoints}
            sponsors={sponsors}
            expeditionNotes={expeditionNotes}
            noteCount={noteCount}
            dailyLimit={dailyLimit}
            isSponsoring={isSponsoring}
            isPublicNotes={isPublicNotes}
            isOwner={isOwner}
            isAuthenticated={isAuthenticated}
            notesSectionRef={notesSectionRef}
            onPostNote={handlePostNote}
            onPostReply={handlePostReply}
            onEditNote={handleEditNote}
            onDeleteNote={handleDeleteNote}
            onEditReply={handleEditReply}
            onDeleteReply={handleDeleteReply}
            onWaypointClick={handleWaypointClick}
            router={router}
          />
        </div>

        {/* Right Sidebar */}
        <Sidebar
          expedition={expedition}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          showSponsorshipSection={showSponsorshipSection}
          waypoints={waypoints}
          totalRouteDistance={totalRouteDistance}
          totalRaised={totalRaised}
          totalDuration={totalDuration}
          fundingStats={fundingStats}
          weatherCondition={weatherCondition}
          weatherLocalTime={weatherLocalTime}
          formatDistance={formatDistance}
          formatDate={formatDate}
          onShowUpdateLocationModal={() => setShowUpdateLocationModal(true)}
          onShowManagementModal={() => setShowManagementModal(true)}
          sponsors={sponsors}
          onSponsorUpdate={handleSponsorUpdate}
        />
      </div>

      {/* Update Location Modal */}
      <UpdateLocationModal
        isOpen={showUpdateLocationModal}
        onClose={() => setShowUpdateLocationModal(false)}
        expeditionTitle={expedition.title}
        waypoints={waypoints}
        journalEntries={journalEntries}
        currentLocationSource={expedition.currentLocationSource}
        currentLocationId={expedition.currentLocationId}
        currentLocationVisibility={expedition.currentLocationVisibility as 'public' | 'sponsors' | 'private' | undefined}
        expeditionStatus={expedition.status as 'active' | 'planned' | 'completed'}
        onSave={handleLocationUpdate}
      />

      {/* Expedition Management Modal */}
      <ExpeditionManagementModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        expedition={{
          id: expedition.id,
          title: expedition.title,
          status: (['active', 'planned', 'completed', 'cancelled'].includes(expedition.status)
            ? expedition.status
            : 'active') as 'active' | 'planned' | 'completed' | 'cancelled',
          startDate: expedition.startDate,
          estimatedEndDate: expedition.estimatedEndDate,
          daysActive: expedition.daysActive,
          journalEntries: expedition.totalEntries,
          totalFunding: expedition.raised,
          backers: expedition.sponsors,
        }}
        isPro={isPro}
        onComplete={handleComplete}
        onCancel={async (reason) => {
          await expeditionApi.cancel(expedition.id, reason);
          const refreshed = await expeditionApi.getById(expedition.id);
          setApiExpedition(refreshed);
        }}
      />

      {/* Fullscreen Map Modal */}
      <MapModal
        isOpen={isMapModalOpen}
        expedition={expedition}
        mapContainerRef={mapContainerRef}
        isDebriefMode={isDebriefMode}
        debriefIndex={debriefIndex}
        debriefDistance={debriefDistance}
        debriefRoute={debriefRoute}
        canDebrief={canDebrief}
        clickedEntry={clickedEntry}
        clickedCluster={clickedCluster}
        sourceCluster={sourceCluster}
        popupPosition={popupPosition}
        entryBookmarked={entryBookmarked}
        entryBookmarkLoading={entryBookmarkLoading}
        currentLocationData={currentLocationData}
        totalRouteDistance={totalRouteDistance}
        formatDistance={formatDistance}
        formatDate={formatDate}
        formatCoords={formatCoords}
        onClose={handleCloseModal}
        onEnterDebrief={enterDebriefMode}
        onExitDebrief={exitDebriefMode}
        onFitBounds={handleFitBounds}
        onFlyToDebriefStop={flyToDebriefStop}
        onClickedEntryChange={setClickedEntry}
        onClickedClusterChange={setClickedCluster}
        onSourceClusterChange={setSourceCluster}
        onBookmarkEntry={handleBookmarkEntry}
        clusteredRef={clusteredRef}
      />

      {expeditionId && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          contentType="expedition"
          contentId={expeditionId}
        />
      )}
    </div>
  );
}
