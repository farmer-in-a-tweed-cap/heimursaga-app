'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Users, UserPlus, Bookmark, Share2, Maximize2, Settings, Loader2, Compass, X, BookmarkCheck, UserCheck, Lock, ChevronLeft, ChevronRight, Play, EyeOff } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { EntryCardLandscape } from '@/app/components/EntryCardLandscape';
import { WaypointCardLandscape } from '@/app/components/WaypointCardLandscape';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { ExpeditionNotes } from '@/app/components/ExpeditionNotes';
import { UpdateLocationModal } from '@/app/components/UpdateLocationModal';
import { ExpeditionManagementModal } from '@/app/components/ExpeditionManagementModal';
import { expeditionApi, explorerApi, entryApi, type Expedition, type ExpeditionNote } from '@/app/services/api';
import { formatDate, formatDateTime } from '@/app/utils/dateFormat';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const MAPBOX_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

// Type definitions for map data
type WaypointType = {
  id: string;
  title: string;
  location: string;
  description?: string;
  coords: { lat: number; lng: number };
  date: string;
  status: 'completed' | 'current' | 'planned';
  notes?: string;
};

type JournalEntryType = {
  id: string;
  title: string;
  date: string;
  location: string;
  coords: { lat: number; lng: number };
  excerpt: string;
  type: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
  mediaCount: number;
  views: number;
  visibility: 'public' | 'off-grid' | 'private';
};

type DebriefStop = {
  type: 'waypoint' | 'entry';
  id: string;
  title: string;
  location: string;
  date: string;
  coords: { lat: number; lng: number };
  description?: string;
  status?: 'completed' | 'current' | 'planned';
  notes?: string;
  waypointIndex?: number;
  excerpt?: string;
  mediaCount?: number;
};

export function ExpeditionDetailPage() {
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { formatDistance } = useDistanceUnit();
  const [selectedView, setSelectedView] = useState<'notes' | 'entries' | 'waypoints' | 'sponsors'>('entries');
  const [showUpdateLocationModal, setShowUpdateLocationModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const notesSectionRef = useRef<HTMLDivElement>(null);
  const now = useMemo(() => Date.now(), []);

  // API data state
  const [apiExpedition, setApiExpedition] = useState<Expedition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowingExplorer, setIsFollowingExplorer] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // Sponsorship funding stats (from API expedition response - public data)
  const fundingStats = {
    activeSubscribers: apiExpedition?.recurringStats?.activeSponsors || 0,
    monthlyRecurring: apiExpedition?.recurringStats?.monthlyRevenue || 0,
    totalRecurringToDate: apiExpedition?.recurringStats?.totalCommitted || 0,
  };

  // Map popup state
  const [clickedEntry, setClickedEntry] = useState<JournalEntryType | null>(null);
  const [popupPosition, setPopupPosition] = useState<'bottom-left' | 'bottom-right'>('bottom-right');
  const [entryBookmarked, setEntryBookmarked] = useState<Set<string>>(new Set());
  const [entryBookmarkLoading, setEntryBookmarkLoading] = useState<string | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const waypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const markerClickedRef = useRef(false);
  const routeCoordsRef = useRef<number[][]>([]);       // route geometry for debrief

  const prevDebriefIndexRef = useRef<number>(0);        // "from" stop for segment extraction
  const debriefRouteIndicesRef = useRef<number[]>([]);  // pre-computed route index per debrief stop

  // Debrief mode state
  const [isDebriefMode, setIsDebriefMode] = useState(false);
  const [debriefIndex, setDebriefIndex] = useState(0);
  const mapCardRef = useRef<HTMLDivElement>(null);

  // Expedition notes state
  const [expeditionNotes, setExpeditionNotes] = useState<ExpeditionNote[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [isSponsoring, setIsSponsoring] = useState(false);
  const [, setNotesLoading] = useState(false);
  const [, setDailyNoteLimit] = useState<{ used: number; max: number }>({ used: 0, max: 1 });

  // Sponsors leaderboard state
  const [sponsors, setSponsors] = useState<any[]>([]);
  // sponsorsLoading no longer needed - sponsors come from expedition API

  // Handle follow/unfollow explorer
  const handleFollowExplorer = async (username: string) => {
    if (!isAuthenticated || !username) {
      router.push('/login');
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowingExplorer) {
        await explorerApi.unfollow(username);
        setIsFollowingExplorer(false);
      } else {
        await explorerApi.follow(username);
        setIsFollowingExplorer(true);
      }
    } catch (err) {
      console.error('Error following/unfollowing explorer:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle bookmark/unbookmark expedition
  const handleBookmarkExpedition = async () => {
    if (!isAuthenticated || !expeditionId) {
      router.push('/login');
      return;
    }
    setBookmarkLoading(true);
    try {
      await expeditionApi.bookmark(expeditionId);
      setIsBookmarked(prev => !prev);
    } catch (err) {
      console.error('Error bookmarking expedition:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Handle bookmark/unbookmark entry from map popup
  const handleBookmarkEntry = async (entryId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setEntryBookmarkLoading(entryId);
    try {
      await entryApi.bookmark(entryId);
      setEntryBookmarked(prev => {
        const next = new Set(prev);
        if (next.has(entryId)) {
          next.delete(entryId);
        } else {
          next.add(entryId);
        }
        return next;
      });
    } catch (err) {
      console.error('Error bookmarking entry:', err);
    } finally {
      setEntryBookmarkLoading(null);
    }
  };

  // Fetch expedition from API
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!expeditionId) return;
      setLoading(true);
      try {
        const data = await expeditionApi.getById(expeditionId);
        if (!cancelled) {
          setApiExpedition(data);
          if (data.bookmarked !== undefined) {
            setIsBookmarked(data.bookmarked);
          }
          if (data.followingAuthor !== undefined) {
            setIsFollowingExplorer(data.followingAuthor);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching expedition:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [expeditionId]);

  // Build sponsors leaderboard from API data (public for all users)
  useEffect(() => {
    if (!apiExpedition?.sponsors) return;

    const now = new Date();
    const expStart = apiExpedition.createdAt ? new Date(apiExpedition.createdAt) : now;
    const expEnd = apiExpedition.endDate ? new Date(apiExpedition.endDate) : now;

    const sponsorsWithTotal = apiExpedition.sponsors
      .map((s) => {
        let totalContribution = s.amount || 0;
        if (s.type?.toUpperCase() === 'SUBSCRIPTION') {
          const subStart = s.createdAt ? new Date(s.createdAt) : now;
          const overlapStart = subStart > expStart ? subStart : expStart;
          if (overlapStart <= expEnd) {
            const months = Math.max(1,
              (expEnd.getFullYear() - overlapStart.getFullYear()) * 12 +
              (expEnd.getMonth() - overlapStart.getMonth()) + 1
            );
            totalContribution = months * (s.amount || 0);
          }
        }
        return { ...s, totalContribution };
      })
      .sort((a, b) => b.totalContribution - a.totalContribution);
    setSponsors(sponsorsWithTotal);
  }, [apiExpedition]);

  // Transform API expedition data to match component format
  const transformApiExpedition = (api: Expedition) => {
    const startDate = api.startDate ? new Date(api.startDate) : null;
    const endDate = api.endDate ? new Date(api.endDate) : null;
    const now = new Date();

    // For completed expeditions, use end date; otherwise use today
    const referenceDate = api.status === 'completed' && endDate ? endDate : now;

    // Day 1 = first day of expedition, so add 1 to the difference
    // If no start date or start date is in the future, show 0
    const daysActive = startDate
      ? Math.max(0, Math.floor((referenceDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 0;

    return {
      id: api.id || api.publicId || expeditionId || '',
      title: api.title,
      explorerId: api.author?.username || api.explorer?.username || '',
      explorerName: api.author?.username || api.explorer?.username || 'Unknown',
      explorerPicture: api.author?.picture || api.explorer?.picture,
      explorerIsPro: api.author?.creator === true,
      status: (api.status || 'active') as 'active' | 'planned' | 'completed',
      category: api.category || '',
      region: api.region || '',
      description: api.description || '',
      startDate: api.startDate || '',
      estimatedEndDate: api.endDate || '',
      daysActive,
      currentLocationSource: api.currentLocationSource,
      currentLocationId: api.currentLocationId,
      currentLocationVisibility: api.currentLocationVisibility || 'public',
      goal: api.goal || 0,
      raised: api.raised || 0,
      sponsors: api.sponsorsCount || 0,
      followers: 0, // Not in API yet
      totalViews: 0, // Not in API yet
      totalEntries: api.entriesCount || 0,
      totalWaypoints: api.waypointsCount || api.waypoints?.length || 0,
      tags: api.tags || [],
      privacy: api.visibility || (api.public !== false ? 'public' : 'private'),
      commentsEnabled: true, // Not in API yet
      imageUrl: api.coverImage || 'https://images.unsplash.com/photo-1503806837798-ea0ce2e6402e?w=800',
    };
  };

  // Transform API expedition data (returns null if no API data)
  const expedition = apiExpedition ? transformApiExpedition(apiExpedition) : null;

  // Calculate total expedition duration in days (inclusive of start and end dates)
  const calculateTotalDuration = (startDateStr: string, endDateStr: string): number => {
    if (!startDateStr || !endDateStr) return 0;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    // Add 1 to include both start and end dates
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  const totalDuration = expedition ? calculateTotalDuration(expedition.startDate, expedition.estimatedEndDate) : 0;

  // Check if user is expedition owner (will be false if expedition is null)
  const isOwner = !!(isAuthenticated && expedition && user?.username === expedition.explorerId);

  // Sponsorship UI only shows if goal > 0 (which implies explorer is Pro and sponsorships are enabled)
  const showSponsorshipSection = !!(expedition && expedition.goal > 0);

  // Total raised = one-time sponsorships + recurring committed during expedition lifetime
  const totalRaised = (expedition?.raised || 0) + fundingStats.totalRecurringToDate;

  // Use API waypoints only (memoized to prevent map recreation on re-render)
  // Status is derived from the persisted current location
  const waypoints: WaypointType[] = useMemo(() => {
    if (!apiExpedition?.waypoints) return [];

    const currentSource = apiExpedition.currentLocationSource;
    const currentLocId = apiExpedition.currentLocationId;

    // If no current location is set, all waypoints are "planned"
    if (!currentSource || !currentLocId) {
      return apiExpedition.waypoints.map((wp, idx) => ({
        id: String(wp.id),
        title: wp.title || `Waypoint ${idx + 1}`,
        location: wp.entry?.title || wp.title || '',
        description: wp.description || '',
        coords: { lat: wp.lat || 0, lng: wp.lon || 0 },
        date: wp.date || '',
        status: 'planned' as const,
        notes: wp.entry?.content?.substring(0, 100) || '',
      }));
    }

    // Determine the "current waypoint index" based on source
    let currentWpIdx = -1;

    if (currentSource === 'waypoint') {
      // Find the waypoint in the list
      currentWpIdx = apiExpedition.waypoints.findIndex(
        (wp) => String(wp.id) === currentLocId,
      );
    } else if (currentSource === 'entry') {
      // Find the entry's coordinates, then determine which waypoint segment it's nearest to
      const entry = apiExpedition.entries?.find((e) => e.id === currentLocId);
      if (entry && entry.lat != null && entry.lon != null) {
        // Find the nearest waypoint by simple distance (before or at the entry)
        let closestDist = Infinity;
        for (let i = 0; i < apiExpedition.waypoints.length; i++) {
          const wp = apiExpedition.waypoints[i];
          const d = Math.pow((wp.lat || 0) - entry.lat, 2) + Math.pow((wp.lon || 0) - entry.lon, 2);
          if (d < closestDist) {
            closestDist = d;
            currentWpIdx = i;
          }
        }
      }
    }

    return apiExpedition.waypoints.map((wp, idx) => {
      let status: 'completed' | 'current' | 'planned';
      if (currentWpIdx < 0) {
        status = 'planned';
      } else if (idx < currentWpIdx) {
        status = 'completed';
      } else if (idx === currentWpIdx) {
        status = 'current';
      } else {
        status = 'planned';
      }

      return {
        id: String(wp.id),
        title: wp.title || `Waypoint ${idx + 1}`,
        location: wp.entry?.title || wp.title || '',
        description: wp.description || '',
        coords: { lat: wp.lat || 0, lng: wp.lon || 0 },
        date: wp.date || '',
        status,
        notes: wp.entry?.content?.substring(0, 100) || '',
      };
    });
  }, [apiExpedition?.waypoints, apiExpedition?.currentLocationSource, apiExpedition?.currentLocationId, apiExpedition?.entries]);

  // Use API entries only (memoized to prevent map recreation on re-render)
  const journalEntries: JournalEntryType[] = useMemo(() => {
    if (!apiExpedition?.entries) return [];
    return apiExpedition.entries
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        date: entry.date || '',
        location: entry.place || 'Unknown location',
        coords: { lat: entry.lat || 0, lng: entry.lon || 0 },
        excerpt: entry.content?.substring(0, 200) || '',
        type: 'standard' as const,
        mediaCount: entry.mediaCount || 0,
        views: 0,
        visibility: (entry.visibility || 'public') as 'public' | 'off-grid' | 'private',
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [apiExpedition?.entries]);

  // Build chronologically sorted debrief route merging waypoints + entries
  const debriefRoute: DebriefStop[] = useMemo(() => {
    const stops: DebriefStop[] = [];

    // Add waypoints with valid coords
    waypoints.forEach((wp, idx) => {
      if (wp.coords.lat === 0 && wp.coords.lng === 0) return;
      stops.push({
        type: 'waypoint',
        id: wp.id,
        title: wp.title,
        location: wp.location,
        date: wp.date,
        coords: wp.coords,
        description: wp.description,
        status: wp.status,
        notes: wp.notes,
        waypointIndex: idx,
      });
    });

    // Add entries with valid coords
    journalEntries.forEach((entry) => {
      if (entry.coords.lat === 0 && entry.coords.lng === 0) return;
      stops.push({
        type: 'entry',
        id: entry.id,
        title: entry.title,
        location: entry.location,
        date: entry.date,
        coords: entry.coords,
        excerpt: entry.excerpt,
        mediaCount: entry.mediaCount,
      });
    });

    // Sort by date oldest-first; dateless waypoints sort by sequence index
    stops.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;

      // Both have dates — sort chronologically
      if (dateA && dateB) return dateA - dateB;

      // If only one has a date, the one without goes first (it's a dateless waypoint)
      if (dateA && !dateB) return 1;
      if (!dateA && dateB) return -1;

      // Neither has a date — sort waypoints by index, entries after waypoints
      if (a.type === 'waypoint' && b.type === 'waypoint') {
        return (a.waypointIndex ?? 0) - (b.waypointIndex ?? 0);
      }
      if (a.type === 'waypoint') return -1;
      if (b.type === 'waypoint') return 1;
      return 0;
    });

    // For round-trip expeditions, add a "return to start" stop so the debrief
    // animation follows the return leg back to the starting point
    if (apiExpedition?.isRoundTrip && stops.length >= 2) {
      const first = stops[0];
      stops.push({
        ...first,
        id: `${first.id}-return`,
        title: `Return: ${first.title}`,
      });
    }

    return stops;
  }, [waypoints, journalEntries, apiExpedition?.isRoundTrip]);

  const canDebrief = debriefRoute.length >= 2;

  // Helper function to get current location data from waypoints or entries
  const getCurrentLocationData = () => {
    if (!expedition?.currentLocationSource || !expedition?.currentLocationId) {
      return null;
    }

    if (expedition.currentLocationSource === 'waypoint') {
      const waypoint = waypoints.find(w => w.id === expedition?.currentLocationId);
      if (waypoint) {
        return {
          location: waypoint.location,
          coords: waypoint.coords,
          source: 'waypoint' as const,
          title: waypoint.title,
          date: waypoint.date,
          status: waypoint.status,
        };
      }
    } else {
      const entry = journalEntries.find(e => e.id === expedition?.currentLocationId);
      if (entry) {
        return {
          location: entry.location,
          coords: entry.coords,
          source: 'entry' as const,
          title: entry.title,
          date: entry.date,
          type: entry.type,
        };
      }
    }

    return null;
  };

  const currentLocationData = getCurrentLocationData();

  // Fetch expedition notes
  useEffect(() => {
    let cancelled = false;

    const fetchNotes = async () => {
      if (!expeditionId) return;

      // Always fetch note count (public)
      try {
        const countData = await expeditionApi.getNoteCount(expeditionId);
        if (!cancelled) {
          setNoteCount(countData.count);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching note count:', err);
        }
      }

      // Only fetch full notes if authenticated (owner or sponsor will have access)
      if (!isAuthenticated) return;

      if (!cancelled) {
        setNotesLoading(true);
      }
      try {
        const notesData = await expeditionApi.getNotes(expeditionId);
        if (!cancelled) {
          setExpeditionNotes(notesData.notes);
          setDailyNoteLimit(notesData.dailyLimit);
          // If we got notes, user has access (either owner or sponsor)
          if (!isOwner) {
            setIsSponsoring(true);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          // 403 means user doesn't have access (not owner and not sponsor)
          if (err?.status === 403) {
            setIsSponsoring(false);
          } else {
            console.error('Error fetching notes:', err);
          }
        }
      } finally {
        if (!cancelled) {
          setNotesLoading(false);
        }
      }
    };

    fetchNotes();

    return () => {
      cancelled = true;
    };
  }, [expeditionId, isAuthenticated, isOwner]);

  // Handle posting a new note
  const handlePostNote = async (text: string) => {
    if (!expeditionId) return;
    try {
      await expeditionApi.createNote(expeditionId, text);
      // Refetch notes to get the new note with all data
      const notesData = await expeditionApi.getNotes(expeditionId);
      setExpeditionNotes(notesData.notes);
      setDailyNoteLimit(notesData.dailyLimit);
      setNoteCount(prev => prev + 1);
    } catch (err) {
      throw err;
    }
  };

  // Handle posting a reply
  const handlePostReply = async (noteId: string, text: string) => {
    if (!expeditionId) return;
    try {
      await expeditionApi.createNoteReply(expeditionId, parseInt(noteId), text);
      // Refetch notes to get the new reply with all data
      const notesData = await expeditionApi.getNotes(expeditionId);
      setExpeditionNotes(notesData.notes);
    } catch (err) {
      throw err;
    }
  };

  // Mapbox map reference
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Handler for waypoint click - fly to waypoint on map
  const handleWaypointClick = (coords: { lat: number; lng: number }) => {
    if (mapRef.current && mapContainerRef.current) {
      // Scroll to map
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Fly to waypoint
      setTimeout(() => {
        mapRef.current?.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 12,
          duration: 1500,
        });
      }, 300);
    }
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

  // Handler for updating location from modal
  const handleLocationUpdate = async (source: 'waypoint' | 'entry', id: string, visibility: 'public' | 'sponsors' | 'private') => {
    if (!expedition?.id) return;
    await expeditionApi.updateLocation(expedition.id, source, id, visibility);
    // Refetch expedition to get updated state
    const updated = await expeditionApi.getById(expedition.id);
    setApiExpedition(updated);
  };

  // Handler for changing expedition status
  const handleStatusChange = async (_newStatus: 'active' | 'completed') => {
    // ============================================================
    // 🔴 BACKEND API CALL NEEDED
    // ============================================================
    // Endpoint: PATCH /api/expeditions/:expeditionId/status
    // Body: { status: newStatus }
    // Description: Update expedition status
    // Response: Updated expedition with new status
    // Note: This should also handle updating "one active expedition" rule
    // ============================================================

    // In production, this would update the expedition state and trigger a re-fetch
    // For now, just close the modal - user would need to refresh to see changes
    setShowManagementModal(false);
  };

  // Handler to fit map to all expedition markers
  const handleFitBounds = useCallback(() => {
    if (!mapRef.current) return;

    // Collect all coordinates from waypoints and entries
    const allCoords: [number, number][] = [
      ...waypoints.map(wp => [wp.coords.lng, wp.coords.lat] as [number, number]),
      ...journalEntries.map(entry => [entry.coords.lng, entry.coords.lat] as [number, number]),
    ];

    if (allCoords.length === 0) return;

    // Calculate bounds
    const bounds = allCoords.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));

    // Fit map to bounds with padding
    mapRef.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 10,
      duration: 1000,
    });
  }, [waypoints, journalEntries]);

  // Debrief mode helpers
  const removeAllHighlights = useCallback(() => {
    // Remove highlights from entry markers
    markersRef.current.forEach(m => {
      const el = m.getElement();
      if (el && (el as any).removeHighlight) {
        (el as any).removeHighlight();
      }
    });
    // Reset waypoint marker styles
    waypointMarkersRef.current.forEach(m => {
      const el = m.getElement();
      if (el) {
        el.style.outline = 'none';
        el.style.boxShadow = el.style.boxShadow?.includes('wp-pulse')
          ? el.style.boxShadow
          : (el.dataset.originalBoxShadow || '');
      }
    });
  }, []);

  const highlightDebriefStop = useCallback((stop: DebriefStop) => {
    removeAllHighlights();
    const COORD_THRESHOLD = 0.0001;

    if (stop.type === 'entry') {
      // Find entry marker by coordinate proximity
      markersRef.current.forEach(m => {
        const lngLat = m.getLngLat();
        if (
          Math.abs(lngLat.lat - stop.coords.lat) < COORD_THRESHOLD &&
          Math.abs(lngLat.lng - stop.coords.lng) < COORD_THRESHOLD
        ) {
          const el = m.getElement();
          const pin = el?.querySelector('div') as HTMLElement | null;
          if (pin) {
            pin.style.border = '4px solid #ac6d46';
            pin.style.boxShadow = '0 0 20px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.4)';
            pin.style.transform = 'translate(-50%, -70%) rotate(-45deg) scale(1.1)';
          }
        }
      });
    } else {
      // Find waypoint marker by coordinate proximity
      waypointMarkersRef.current.forEach(m => {
        const lngLat = m.getLngLat();
        if (
          Math.abs(lngLat.lat - stop.coords.lat) < COORD_THRESHOLD &&
          Math.abs(lngLat.lng - stop.coords.lng) < COORD_THRESHOLD
        ) {
          const el = m.getElement();
          if (el) {
            el.style.outline = '3px solid #ac6d46';
            el.style.outlineOffset = '3px';
            el.style.boxShadow = '0 0 20px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.4)';
          }
        }
      });
    }
  }, [removeAllHighlights]);

  // Find the closest route coordinate index for a given lat/lng, searching from a start index
  const findClosestRouteIndex = (
    coords: { lat: number; lng: number },
    route: number[][],
    searchFrom = 0,
  ): number => {
    let closest = searchFrom;
    let closestDist = Infinity;
    for (let i = searchFrom; i < route.length; i++) {
      const [lng, lat] = route[i];
      const d = (lng - coords.lng) ** 2 + (lat - coords.lat) ** 2;
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    }
    return closest;
  };

  // Pre-compute monotonically increasing route indices for each debrief stop
  // This ensures round-trip routes follow the return leg correctly
  const computeDebriefRouteIndices = useCallback(() => {
    const route = routeCoordsRef.current;
    if (route.length < 2 || debriefRoute.length === 0) {
      debriefRouteIndicesRef.current = [];
      return;
    }
    const indices: number[] = [];
    let searchFrom = 0;
    for (const stop of debriefRoute) {
      const idx = findClosestRouteIndex(stop.coords, route, searchFrom);
      indices.push(idx);
      searchFrom = idx;
    }
    debriefRouteIndicesRef.current = indices;
  }, [debriefRoute]);

  // Build cumulative distance array for a polyline segment
  const buildCumulativeDistances = (segment: number[][]): number[] => {
    const distances = [0];
    for (let i = 1; i < segment.length; i++) {
      const dx = segment[i][0] - segment[i - 1][0];
      const dy = segment[i][1] - segment[i - 1][1];
      distances.push(distances[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return distances;
  };

  // Continuously interpolate a position along a polyline at a given fraction (0-1)
  const interpolateAlongRoute = (
    segment: number[][],
    cumDist: number[],
    t: number, // 0..1
  ): [number, number] => {
    const totalLen = cumDist[cumDist.length - 1];
    if (totalLen === 0) return segment[0] as [number, number];

    const targetDist = t * totalLen;

    // Binary search for the segment containing targetDist
    let lo = 0;
    let hi = cumDist.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cumDist[mid] <= targetDist) lo = mid;
      else hi = mid;
    }

    const segStart = cumDist[lo];
    const segEnd = cumDist[hi];
    const segLen = segEnd - segStart;
    const frac = segLen > 0 ? (targetDist - segStart) / segLen : 0;

    return [
      segment[lo][0] + frac * (segment[hi][0] - segment[lo][0]),
      segment[lo][1] + frac * (segment[hi][1] - segment[lo][1]),
    ];
  };

  // Cancel any in-progress debrief animation
  const cancelDebriefAnimation = useCallback(() => {
    if ((mapRef.current as any)?._debriefCleanup) {
      (mapRef.current as any)._debriefCleanup();
      (mapRef.current as any)._debriefCleanup = null;
    }
  }, []);

  const flyToDebriefStop = useCallback((index: number) => {
    if (!mapRef.current || index < 0 || index >= debriefRoute.length) return;

    cancelDebriefAnimation();

    const stop = debriefRoute[index];
    setDebriefIndex(index);
    highlightDebriefStop(stop);

    const route = routeCoordsRef.current;
    const fromStop = debriefRoute[prevDebriefIndexRef.current];

    // Determine if we have route data and a valid "from" stop to animate along
    const hasFrom = fromStop && prevDebriefIndexRef.current !== index && route.length >= 2;

    if (!hasFrom) {
      // First stop or no route — simple flyTo
      mapRef.current.flyTo({
        center: [stop.coords.lng, stop.coords.lat],
        zoom: 13,
        duration: 1500,
      });
      prevDebriefIndexRef.current = index;
      return;
    }

    // Use pre-computed route indices (monotonically increasing, round-trip aware)
    const indices = debriefRouteIndicesRef.current;
    const fromIdx = indices[prevDebriefIndexRef.current] ?? 0;
    const toIdx = indices[index] ?? 0;

    // Extract sub-segment; reverse if navigating backward
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    let segment = route.slice(lo, hi + 1);
    if (fromIdx > toIdx) {
      segment = [...segment].reverse();
    }

    if (segment.length < 2) {
      // Segment too short — fallback to flyTo
      mapRef.current.flyTo({
        center: [stop.coords.lng, stop.coords.lat],
        zoom: 13,
        duration: 1500,
      });
      prevDebriefIndexRef.current = index;
      return;
    }

    // Pre-compute cumulative distances for interpolation
    const cumDist = buildCumulativeDistances(segment);
    const totalSegLen = cumDist[cumDist.length - 1];
    const map = mapRef.current;
    const startZoom = map.getZoom();
    const endZoom = 13;

    // Gentle zoom dip proportional to distance
    const zoomOutAmount = Math.min(2.5, Math.max(0, totalSegLen * 1.2));

    // Chain native easeTo calls for buttery-smooth Mapbox-rendered animation.
    // More steps for longer segments, fewer for short hops.
    const numSteps = Math.min(20, Math.max(6, Math.round(totalSegLen * 8)));
    // Total time: 8s–18s scaled to distance
    const totalDuration = Math.min(18000, Math.max(8000, totalSegLen * 6000));
    const stepDuration = totalDuration / numSteps;

    // Pre-compute waypoints along the route
    const waypoints: { center: [number, number]; zoom: number }[] = [];
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const center = interpolateAlongRoute(segment, cumDist, t);
      const zoomDip = Math.sin(t * Math.PI);
      const linearZoom = startZoom + t * (endZoom - startZoom);
      const zoom = linearZoom - zoomDip * zoomOutAmount;
      waypoints.push({ center, zoom });
    }

    let currentStep = 0;
    let cancelled = false;

    const advanceStep = () => {
      if (cancelled || !mapRef.current) return;
      if (currentStep >= waypoints.length) {
        // Final settle at exact destination
        mapRef.current.easeTo({
          center: [stop.coords.lng, stop.coords.lat],
          zoom: endZoom,
          duration: 400,
        });
        return;
      }
      const wp = waypoints[currentStep];
      mapRef.current.easeTo({
        center: wp.center,
        zoom: wp.zoom,
        duration: stepDuration,
        easing: (t) => t, // linear per-step; overall pacing comes from the step sequence
      });
      currentStep++;
    };

    const onMoveEnd = () => {
      if (!cancelled) advanceStep();
    };

    // Store cancel function on the ref for cleanup
    map.on('moveend', onMoveEnd);
    // Attach cleanup to a property we can call later
    (mapRef.current as any)._debriefCleanup = () => {
      cancelled = true;
      map.off('moveend', onMoveEnd);
      map.stop();
    };

    // Kick off first step
    advanceStep();
    prevDebriefIndexRef.current = index;
  }, [debriefRoute, highlightDebriefStop, cancelDebriefAnimation]);

  const enterDebriefMode = useCallback(() => {
    setIsDebriefMode(true);
    setClickedEntry(null);
    prevDebriefIndexRef.current = 0;
    computeDebriefRouteIndices();
    document.body.style.overflow = 'hidden';
    // Resize map after fullscreen transition
    setTimeout(() => {
      mapRef.current?.resize();
      // Fly to first stop after resize
      setTimeout(() => {
        flyToDebriefStop(0);
      }, 100);
    }, 150);
  }, [flyToDebriefStop, computeDebriefRouteIndices]);

  const exitDebriefMode = useCallback(() => {
    cancelDebriefAnimation();
    setIsDebriefMode(false);
    setDebriefIndex(0);
    removeAllHighlights();
    document.body.style.overflow = '';
    setTimeout(() => {
      mapRef.current?.resize();
      setTimeout(() => {
        handleFitBounds();
      }, 100);
    }, 150);
  }, [removeAllHighlights, handleFitBounds, cancelDebriefAnimation]);

  // Debrief mode keyboard navigation
  useEffect(() => {
    if (!isDebriefMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitDebriefMode();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setDebriefIndex(prev => {
          const next = Math.min(prev + 1, debriefRoute.length - 1);
          if (next !== prev) {
            // Use setTimeout so flyTo runs after state update
            setTimeout(() => flyToDebriefStop(next), 0);
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setDebriefIndex(prev => {
          const next = Math.max(prev - 1, 0);
          if (next !== prev) {
            setTimeout(() => flyToDebriefStop(next), 0);
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebriefMode, debriefRoute.length, exitDebriefMode, flyToDebriefStop]);

  // Resize map when debrief mode changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.resize();
      }, 200);
    }
  }, [isDebriefMode]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
      center: currentLocationData?.coords ? [currentLocationData.coords.lng, currentLocationData.coords.lat] : [0, 0],
      zoom: 5,
    });

    mapRef.current = map;

    // Add error handler - suppress style evaluation warnings
    map.on('error', (e) => {
      // Suppress Mapbox style expression evaluation warnings (non-critical)
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) {
        return; // These are harmless warnings from Mapbox's internal style
      }
      console.error('Mapbox error:', e);
    });

    // Add navigation control (zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Close popup when clicking on the map background (not on a marker)
    map.on('click', () => {
      // Skip if a marker was just clicked (the marker handler sets this flag)
      if (markerClickedRef.current) {
        markerClickedRef.current = false;
        return;
      }
      setClickedEntry(null);
      markersRef.current.forEach(m => {
        const el = m.getElement();
        if (el && (el as any).removeHighlight) {
          (el as any).removeHighlight();
        }
      });
    });

    // Wait for map to load
    map.on('load', () => {
      // Get valid entry coordinates (non-zero, sorted by date oldest first for route)
      const validEntries = journalEntries
        .filter(entry => entry.coords.lat !== 0 || entry.coords.lng !== 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Use saved directions geometry if available, otherwise straight lines
      const hasDirectionsRoute = apiExpedition?.routeGeometry && apiExpedition.routeGeometry.length > 0;
      let routeCoordinates = hasDirectionsRoute
        ? apiExpedition.routeGeometry!
        : waypoints.length > 0
          ? waypoints.map(wp => [wp.coords.lng, wp.coords.lat])
          : validEntries.map(entry => [entry.coords.lng, entry.coords.lat]);

      // If round trip and using straight lines, close the route by adding the first point to the end
      // (directions geometry already includes the return leg)
      const isRoundTrip = apiExpedition?.isRoundTrip;
      if (!hasDirectionsRoute && isRoundTrip && routeCoordinates.length > 0) {
        routeCoordinates = [...routeCoordinates, routeCoordinates[0]];
      }

      routeCoordsRef.current = routeCoordinates;

      if (routeCoordinates.length >= 2) {
        map.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates,
            },
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
      // Find the current location's coordinates (works for both waypoint and entry)
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
        // Find the closest point in the route geometry to the current location
        let closestIdx = 0;
        let closestDist = Infinity;
        for (let i = 0; i < routeCoordinates.length; i++) {
          const [lng, lat] = routeCoordinates[i];
          const d = Math.pow(lng - currentLocCoords.lng, 2) + Math.pow(lat - currentLocCoords.lat, 2);
          if (d < closestDist) {
            closestDist = d;
            closestIdx = i;
          }
        }
        const completedCoords = routeCoordinates.slice(0, closestIdx + 1);

        if (completedCoords.length >= 2) {
          map.addSource('completed-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: completedCoords,
              },
            },
          });

          map.addLayer({
            id: 'completed-route',
            type: 'line',
            source: 'completed-route',
            paint: {
              'line-color': '#ac6d46',
              'line-width': 4,
              'line-opacity': 0.9,
            },
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

      // Add waypoint markers
      waypoints.forEach((wp, idx) => {
        const isStart = idx === 0;
        const isEnd = !isRoundTrip && idx === waypoints.length - 1 && waypoints.length > 1;
        const isCurrent = wp.status === 'current';

        const el = document.createElement('div');
        el.className = 'waypoint-marker';

        if (isStart && isRoundTrip) {
          // Round trip: start is also the end — copper fill with blue border
          el.style.width = '36px';
          el.style.height = '36px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#ac6d46';
          el.style.border = '3px solid #4676ac';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.fontSize = '15px';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          el.textContent = 'S';
        } else if (isStart || isEnd) {
          // Start (copper) / End (blue) markers
          el.style.width = '36px';
          el.style.height = '36px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = isStart ? '#ac6d46' : '#4676ac';
          el.style.border = '3px solid white';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.fontSize = '15px';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          el.textContent = isStart ? 'S' : 'E';
        } else {
          // Standard waypoint markers — gray
          el.style.width = '28px';
          el.style.height = '28px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#616161';
          el.style.border = '2px solid white';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.fontSize = '12px';
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
          el.textContent = String(idx + 1);
        }

        // Add pulsing white glow for the current location marker
        if (isCurrent) {
          el.style.animation = 'wp-pulse 2s ease-out infinite';
        }

        const wpMarker = new mapboxgl.Marker(el)
          .setLngLat([wp.coords.lng, wp.coords.lat])
          .addTo(map);
        waypointMarkersRef.current.push(wpMarker);
      });

      // Clear existing entry markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add journal entry markers (only entries with valid coordinates)
      journalEntries
        .filter(entry => entry.coords.lat !== 0 || entry.coords.lng !== 0)
        .forEach((entry) => {
          const el = document.createElement('div');
          el.className = 'entry-marker';
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.cursor = 'pointer';

          const pin = document.createElement('div');
          pin.style.width = '28px';
          pin.style.height = '28px';
          pin.style.borderRadius = '50% 50% 50% 0';
          pin.style.backgroundColor = '#ac6d46';
          pin.style.border = '3px solid white';
          pin.style.position = 'absolute';
          pin.style.top = '50%';
          pin.style.left = '50%';
          pin.style.transform = 'translate(-50%, -70%) rotate(-45deg)';
          pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          pin.style.display = 'flex';
          pin.style.alignItems = 'center';
          pin.style.justifyContent = 'center';

          const dot = document.createElement('div');
          dot.style.width = '10px';
          dot.style.height = '10px';
          dot.style.borderRadius = '50%';
          dot.style.backgroundColor = 'white';
          dot.style.transform = 'rotate(45deg)';
          pin.appendChild(dot);

          el.appendChild(pin);

          // Add pulsing white glow if this entry is the current location
          if (curSrc === 'entry' && curId === entry.id) {
            pin.style.animation = 'wp-pulse 2s ease-out infinite';
          }

          const marker = new mapboxgl.Marker(el)
            .setLngLat([entry.coords.lng, entry.coords.lat])
            .addTo(map);

          // Click handler for popup
          el.addEventListener('click', (e) => {
            e.stopPropagation();

            // Set flag to prevent map click from closing the popup
            markerClickedRef.current = true;

            // Remove highlights from all markers
            markersRef.current.forEach(m => {
              const markerEl = m.getElement();
              if (markerEl && (markerEl as any).removeHighlight) {
                (markerEl as any).removeHighlight();
              }
            });

            // Calculate popup position based on marker location
            if (mapContainerRef.current) {
              const mapRect = mapContainerRef.current.getBoundingClientRect();
              const markerRect = el.getBoundingClientRect();
              const markerCenterX = markerRect.left + markerRect.width / 2 - mapRect.left;
              setPopupPosition(markerCenterX > mapRect.width / 2 ? 'bottom-left' : 'bottom-right');
            }

            setClickedEntry(entry);

            // Highlight the clicked marker
            pin.style.border = '4px solid #ac6d46';
            pin.style.boxShadow = '0 0 20px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.4)';
            pin.style.transform = 'translate(-50%, -70%) rotate(-45deg) scale(1.1)';
          });

          // Store function to remove highlight
          (el as any).removeHighlight = () => {
            pin.style.border = '3px solid white';
            pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            pin.style.transform = 'translate(-50%, -70%) rotate(-45deg)';
          };

          markersRef.current.push(marker);
        });

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

        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 10,
          duration: 500,
        });
      }
    });

    // Cleanup
    return () => {
      waypointMarkersRef.current.forEach(marker => marker.remove());
      waypointMarkersRef.current = [];
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      setClickedEntry(null);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, waypoints, journalEntries, apiExpedition]);

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
      {/* Hero Banner with Overlay Content */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="relative h-[600px] overflow-hidden">
          <ImageWithFallback
            src={expedition.imageUrl}
            alt={expedition.title}
            className="h-full w-full object-cover"
          />
          
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#202020]/70 via-[#202020]/60 to-[#202020]/90" />
          
          {/* Expedition Status Banner - Top Border */}
          <div className={`absolute top-0 left-0 right-0 py-2 px-6 ${
            expedition.status === 'active'
              ? 'bg-[#ac6d46]'
              : expedition.status === 'planned'
              ? 'bg-[#4676ac]'
              : 'bg-[#616161]'
          } z-10 flex items-center justify-between`}>
            <div className="text-white font-bold text-sm tracking-wide">
              {expedition.status === 'active' ? 'ACTIVE EXPEDITION' : expedition.status === 'planned' ? 'PLANNED EXPEDITION' : 'COMPLETED EXPEDITION'}
            </div>
            {expedition.privacy !== 'public' && (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold tracking-wide ${
                expedition.privacy === 'off-grid' ? 'bg-[#6b5c4e] text-white' : 'bg-[#202020] text-white'
              }`}>
                {expedition.privacy === 'off-grid' ? <EyeOff className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {expedition.privacy === 'off-grid' ? 'OFF-GRID' : 'PRIVATE'}
              </div>
            )}
          </div>
          
          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 text-white pt-16">
            {/* Top Section: Title, Explorer, Description */}
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="mb-3">
                  <h1 className="text-4xl font-bold whitespace-nowrap">{expedition.title}</h1>
                  {(expedition.category || expedition.region) && (
                    <div className="flex items-center gap-2 mt-2">
                      {expedition.category && (
                        <span className="px-3 py-1 bg-[#4676ac] text-white text-xs font-semibold whitespace-nowrap rounded-full">
                          {expedition.category.toUpperCase()}
                        </span>
                      )}
                      {expedition.region && (
                        <span className="px-3 py-1 bg-[#616161] text-white text-xs font-semibold whitespace-nowrap rounded-full">
                          {expedition.region.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-[#b5bcc4] mb-3 font-mono whitespace-nowrap">
                  <span>Day {expedition.daysActive} of {totalDuration || '?'}</span>
                  <span>•</span>
                  <span>{formatDate(expedition.startDate)} to {formatDate(expedition.estimatedEndDate)}</span>
                </div>

                <p className="text-sm text-white/90 max-w-4xl leading-relaxed">{expedition.description}</p>
              </div>
              
              {/* Explorer Info Card */}
              <div className="text-xs font-mono bg-[#202020]/80 border-2 border-[#ac6d46] p-4 min-w-[280px]">
                <div className="text-[#b5bcc4] mb-3 font-bold border-b-2 border-[#616161] pb-2">EXPLORER INFORMATION</div>
                
                <div className="flex items-center gap-3 mb-4">
                  <Link href={`/journal/${expedition.explorerId}`} className="flex-shrink-0">
                    <div className={`w-16 h-16 border-2 ${expedition.explorerIsPro ? 'border-[#ac6d46]' : 'border-[#616161]'} overflow-hidden bg-[#202020] hover:border-[#4676ac] transition-all`}>
                      <Image
                        src={expedition.explorerPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${expedition.explorerId}`}
                        alt={expedition.explorerName}
                        className="w-full h-full object-cover"
                        width={64}
                        height={64}
                      />
                    </div>
                  </Link>
                  <div className="flex-1">
                    <Link href={`/journal/${expedition.explorerId}`} className="text-white font-bold hover:text-[#ac6d46] transition-all focus-visible:outline-none focus-visible:underline block mb-1">
                      {expedition.explorerName}
                    </Link>
                    <div className="text-[#b5bcc4]">@{expedition.explorerId}</div>
                  </div>
                </div>
                
                <div className="space-y-2 border-t-2 border-[#616161] pt-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#b5bcc4]">Account Type:</span>
                    <span className="text-[#ac6d46] font-bold">EXPLORER PRO</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#b5bcc4]">Active Expeditions:</span>
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#b5bcc4]">Total Followers:</span>
                    <span className="text-white font-bold">{expedition.followers}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#b5bcc4]">Member Since:</span>
                    <span className="text-white font-bold">2024</span>
                  </div>
                </div>
                
                <Link 
                  href={`/journal/${expedition.explorerId}`}
                  className="block mt-4 w-full py-2 bg-[#4676ac] text-white text-center hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] font-bold"
                >
                  VIEW JOURNAL
                </Link>
              </div>
            </div>
            
            {/* Bottom Section: Current Location + Action Bar */}
            <div className="-mx-6 -mb-6">
              {/* Current Location Bar - showing for all statuses temporarily */}
              {currentLocationData?.location && (
                <button
                  onClick={() => currentLocationData.coords && handleWaypointClick(currentLocationData.coords)}
                  className="w-full bg-[#ac6d46] px-6 py-3 flex items-center justify-center gap-4 hover:bg-[#8a5738] transition-all cursor-pointer"
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-3 h-3 bg-white rounded-full animate-ping opacity-75" />
                    <div className="relative w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className="font-mono text-sm">
                    <span className="text-white/70 font-bold tracking-wide mr-3">CURRENT LOCATION</span>
                    <span className="text-white font-bold">{currentLocationData.location}</span>
                  </div>
                  {currentLocationData.coords && (
                    <div className="text-xs text-white/70 font-mono border-l border-white/30 pl-4">
                      {currentLocationData.coords.lat.toFixed(4)}°N, {currentLocationData.coords.lng.toFixed(4)}°E
                    </div>
                  )}
                  {/* Visibility indicator */}
                  {isOwner && expedition.currentLocationVisibility && expedition.currentLocationVisibility !== 'public' && (
                    <div className="flex items-center gap-1.5 border-l border-white/30 pl-4">
                      {expedition.currentLocationVisibility === 'sponsors' && (
                        <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                          <Users className="w-3.5 h-3.5 text-white" />
                          <span className="text-white text-xs font-bold font-mono tracking-wide">SPONSORS ONLY</span>
                        </div>
                      )}
                      {expedition.currentLocationVisibility === 'private' && (
                        <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
                          <Lock className="w-3.5 h-3.5 text-white" />
                          <span className="text-white text-xs font-bold font-mono tracking-wide">PRIVATE</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )}

              {/* Action Bar - Always visible */}
              <div className="bg-[#202020]/90 px-6 py-3 border-t-2 border-[#616161]">
              <div className="flex items-center justify-between gap-6">
                {/* Expedition Status */}
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm text-[#b5bcc4]">
                    {expedition.status === 'completed' ? 'COMPLETED EXPEDITION' : expedition.status === 'planned' ? 'PLANNED EXPEDITION' : 'ACTIVE EXPEDITION'}
                  </div>
                  {expedition.privacy !== 'public' && (
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${
                      expedition.privacy === 'off-grid' ? 'bg-[#6b5c4e] text-white' : 'bg-[#202020] text-white border border-[#616161]'
                    }`}>
                      {expedition.privacy === 'off-grid' ? <EyeOff className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {expedition.privacy === 'off-grid' ? 'OFF-GRID' : 'PRIVATE'}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Sponsor button */}
                  {!isOwner && showSponsorshipSection && expedition.status !== 'completed' && (
                    <Link
                      href={isAuthenticated ? `/sponsor/${expedition.id}` : `/login?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
                      className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold whitespace-nowrap flex items-center gap-2"
                    >
                      <Users size={16} strokeWidth={2} />
                      <span>SPONSOR</span>
                    </Link>
                  )}
                  {/* Follow button - Hidden when not authenticated or own expedition */}
                  {isAuthenticated && !isOwner && (
                    <button
                      onClick={() => handleFollowExplorer(expedition.explorerId)}
                      disabled={followLoading}
                      className={`px-4 py-2 border-2 transition-all text-xs font-bold whitespace-nowrap flex items-center gap-2 ${
                        isFollowingExplorer
                          ? 'border-[#4676ac] bg-[#4676ac] text-white hover:bg-[#365a87]'
                          : 'border-white/30 text-white hover:bg-white/10'
                      }`}
                    >
                      {followLoading ? (
                        <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                      ) : isFollowingExplorer ? (
                        <UserCheck size={16} strokeWidth={2} />
                      ) : (
                        <UserPlus size={16} strokeWidth={2} />
                      )}
                      <span className="hidden md:inline">{isFollowingExplorer ? 'FOLLOWING EXPLORER' : 'FOLLOW EXPLORER'}</span>
                    </button>
                  )}
                  {/* Bookmark button - Hidden when not authenticated */}
                  {isAuthenticated && (
                    <button
                      onClick={handleBookmarkExpedition}
                      disabled={bookmarkLoading}
                      className={`px-4 py-2 border-2 transition-all text-xs font-bold whitespace-nowrap flex items-center gap-2 ${
                        isBookmarked
                          ? 'border-[#ac6d46] bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                          : 'border-white/30 text-white hover:bg-white/10'
                      }`}
                    >
                      {bookmarkLoading ? (
                        <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                      ) : (
                        <Bookmark size={16} strokeWidth={2} fill={isBookmarked ? 'currentColor' : 'none'} />
                      )}
                      <span className="hidden md:inline">{isBookmarked ? 'BOOKMARKED' : 'BOOKMARK'}</span>
                    </button>
                  )}
                  {/* Share button - Always visible (public action) */}
                  <button className="px-4 py-2 border-2 border-white/30 text-white hover:bg-white/10 transition-all text-xs font-bold whitespace-nowrap flex items-center gap-2">
                    <Share2 size={16} strokeWidth={2} />
                    <span className="hidden md:inline">SHARE</span>
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className={`grid grid-cols-2 ${showSponsorshipSection ? 'md:grid-cols-5' : 'md:grid-cols-3'} border-t-2 border-[#202020] dark:border-[#616161]`}>
          {/* Days to Start (planned) or Days Active (active/completed) */}
          <div className="p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
            {expedition.status === 'planned' && expedition.startDate ? (() => {
              const daysUntilStart = Math.max(0, Math.ceil((new Date(expedition.startDate).getTime() - now) / (1000 * 60 * 60 * 24)));
              return (
                <>
                  <div className="text-2xl font-bold text-[#4676ac]">{daysUntilStart}</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Days to Start</div>
                </>
              );
            })() : (
              <>
                <div className="text-2xl font-bold dark:text-[#e5e5e5]">{expedition.daysActive}</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Days Active</div>
              </>
            )}
          </div>
          {/* Raised - only show if sponsorships enabled */}
          {showSponsorshipSection && (
            <div className="p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
              <div className="text-2xl font-bold dark:text-[#e5e5e5]">
                ${totalRaised >= 1000 ? `${(totalRaised / 1000).toFixed(1)}k` : totalRaised.toFixed(0)}
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                {expedition.goal > 0 ? `of $${expedition.goal >= 1000 ? `${(expedition.goal / 1000).toFixed(1)}k` : expedition.goal.toLocaleString()} goal` : 'Raised'}
              </div>
            </div>
          )}
          {/* Sponsors - only show if sponsorships enabled */}
          {showSponsorshipSection && (
            <div className="p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-[#ac6d46]">{expedition.sponsors}</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Sponsors</div>
            </div>
          )}
          <div className="p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-[#4676ac]">{expedition.totalWaypoints}</div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Waypoints</div>
          </div>
          <div className="p-4 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-[#ac6d46]">{expedition.totalEntries}</div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Entries</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map & Route - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Interactive Map */}
          <div ref={mapCardRef} className={isDebriefMode ? 'fixed inset-0 z-50 border-0 flex flex-col bg-white dark:bg-[#202020]' : 'bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]'}>
            <div className={`bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 ${isDebriefMode ? 'border-b border-[#4a4a4a]' : 'border-b-2 border-[#202020] dark:border-[#616161]'}`}>
              {isDebriefMode ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-sm font-bold">{expedition.title}</h2>
                      <div className="text-xs text-white/70 font-mono">by {expedition.explorerName}</div>
                    </div>
                    <div className="text-xs font-mono bg-white/10 px-3 py-1">
                      {debriefIndex + 1} / {debriefRoute.length}
                    </div>
                  </div>
                  <button
                    onClick={exitDebriefMode}
                    className="px-4 py-2 bg-[#202020] hover:bg-[#333] text-white text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-2"
                  >
                    <X size={14} />
                    EXIT
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">EXPEDITION ROUTE MAP</h2>
                  {canDebrief && (
                    <button
                      onClick={enterDebriefMode}
                      className="px-3 py-1.5 bg-[#ac6d46] hover:bg-[#8a5738] text-white text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                      <Play size={12} fill="currentColor" />
                      DEBRIEF MODE
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Map Container */}
            <div className={`relative bg-[#e8e8e8] overflow-hidden ${isDebriefMode ? 'flex-1' : 'h-[500px]'}`}>
              <div ref={mapContainerRef} className="absolute top-0 left-0 w-full h-full" />
              
              {/* Map Legend */}
              {!isDebriefMode && (
              <div className="absolute bottom-4 left-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 text-xs z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold dark:text-[#e5e5e5]">MAP LEGEND:</div>
                  <button
                    onClick={handleFitBounds}
                    className="px-2 py-1 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center gap-1"
                    title="Fit all markers in view"
                  >
                    <Maximize2 size={12} />
                    <span className="text-xs font-bold">FIT</span>
                  </button>
                </div>
                <div className="space-y-1 dark:text-[#e5e5e5]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#ac6d46] border-2 border-[#202020] rounded-full"></div>
                    <span>Completed Waypoint</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#4676ac] border-2 border-[#202020] rounded-full"></div>
                    <span>Current Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#b5bcc4] border-2 border-[#202020] rounded-full"></div>
                    <span>Planned Waypoint</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#ac6d46] border-2 border-[#202020]"></div>
                    <span>Journal Entry</span>
                  </div>
                </div>
              </div>
              )}

              {/* Map Info */}
              {!isDebriefMode && (
              <div className="absolute top-4 right-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 text-xs font-mono z-10">
                <div className="text-[#616161] dark:text-[#b5bcc4]">Current Position:</div>
                <div className="font-bold dark:text-[#e5e5e5]">
                  {currentLocationData?.coords
                    ? `${currentLocationData.coords.lat.toFixed(4)}°N, ${currentLocationData.coords.lng.toFixed(4)}°E`
                    : 'No location set'}
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-2">Total Distance:</div>
                <div className="font-bold dark:text-[#e5e5e5]">~{formatDistance(3247, 0)}</div>
              </div>
              )}

              {/* Entry Popup */}
              {!isDebriefMode && clickedEntry && (
                <div
                  className={`absolute w-72 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 bottom-4 ${
                    popupPosition === 'bottom-left' ? 'left-4' : 'right-4'
                  }`}
                >
                  <div className="p-3 text-xs font-mono">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm dark:text-[#e5e5e5] truncate">{clickedEntry.title}</div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                          {clickedEntry.location && <span>{clickedEntry.location}</span>}
                          {clickedEntry.location && clickedEntry.date && <span> • </span>}
                          {clickedEntry.date && <span>{new Date(clickedEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setClickedEntry(null);
                          markersRef.current.forEach(m => {
                            const el = m.getElement();
                            if (el && (el as any).removeHighlight) {
                              (el as any).removeHighlight();
                            }
                          });
                        }}
                        className="p-0.5 hover:bg-[#202020] hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded transition-all active:scale-[0.95] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-[#616161] flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5 text-[#616161] dark:text-[#b5bcc4]" />
                      </button>
                    </div>

                    {/* Excerpt */}
                    {clickedEntry.excerpt && (
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-3 line-clamp-2">
                        {clickedEntry.excerpt}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.open(`/entry/${clickedEntry.id}`, '_blank')}
                        className="flex-1 bg-[#ac6d46] text-white py-1.5 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold text-center"
                      >
                        VIEW ENTRY
                      </button>
                      <button
                        onClick={() => handleBookmarkEntry(clickedEntry.id)}
                        disabled={entryBookmarkLoading === clickedEntry.id}
                        className={`py-1.5 px-2 transition-all active:scale-95 flex items-center justify-center ${
                          entryBookmarked.has(clickedEntry.id)
                            ? 'bg-[#4676ac] text-white hover:bg-[#365a87]'
                            : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a]'
                        }`}
                        title={entryBookmarked.has(clickedEntry.id) ? 'Bookmarked' : 'Bookmark'}
                      >
                        {entryBookmarkLoading === clickedEntry.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : entryBookmarked.has(clickedEntry.id) ? (
                          <BookmarkCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Debrief Info Popup */}
              {isDebriefMode && debriefRoute[debriefIndex] && (() => {
                const stop = debriefRoute[debriefIndex];
                return (
                  <div className="absolute top-4 right-4 w-80 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20">
                    {/* Header */}
                    <div className={`px-3 py-2 text-xs font-bold font-mono flex items-center justify-between ${
                      stop.type === 'waypoint' ? 'bg-[#616161] text-white' : 'bg-[#ac6d46] text-white'
                    }`}>
                      <span>{stop.type === 'waypoint' ? 'WAYPOINT' : 'JOURNAL ENTRY'}</span>
                      <span className="text-white/70">STOP {debriefIndex + 1} OF {debriefRoute.length}</span>
                    </div>

                    <div className="p-3 text-xs font-mono">
                      {/* Title */}
                      <div className="font-bold text-sm dark:text-[#e5e5e5] mb-1">{stop.title}</div>

                      {/* Location & Date */}
                      <div className="text-[#616161] dark:text-[#b5bcc4] mb-3">
                        {stop.location && <span>{stop.location}</span>}
                        {stop.location && stop.date && <span> &bull; </span>}
                        {stop.date && <span>{new Date(stop.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      </div>

                      {/* Waypoint-specific fields */}
                      {stop.type === 'waypoint' && (
                        <>
                          {stop.description && (
                            <div className="text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-2 line-clamp-3">
                              {stop.description}
                            </div>
                          )}
                          {stop.status && (
                            <div className="mb-2">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold ${
                                stop.status === 'completed' ? 'bg-[#ac6d46] text-white' :
                                stop.status === 'current' ? 'bg-[#4676ac] text-white' :
                                'bg-[#b5bcc4] text-[#202020]'
                              }`}>
                                {stop.status.toUpperCase()}
                              </span>
                            </div>
                          )}
                          {stop.notes && (
                            <div className="text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-2 italic line-clamp-2">
                              {stop.notes}
                            </div>
                          )}
                        </>
                      )}

                      {/* Entry-specific fields */}
                      {stop.type === 'entry' && (
                        <>
                          {stop.excerpt && (
                            <div className="text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-3 line-clamp-3">
                              {stop.excerpt}
                            </div>
                          )}
                          <button
                            onClick={() => window.open(`/entry/${stop.id}`, '_blank')}
                            className="w-full bg-[#ac6d46] text-white py-1.5 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] text-xs font-bold text-center mb-2"
                          >
                            VIEW FULL ENTRY
                          </button>
                        </>
                      )}

                      {/* Coordinates */}
                      <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2 text-[10px] text-[#b5bcc4] dark:text-[#616161]">
                        {stop.coords.lat.toFixed(4)}&deg;N, {stop.coords.lng.toFixed(4)}&deg;E
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Debrief Navigation Controls */}
              {isDebriefMode && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                  <button
                    onClick={() => debriefIndex > 0 && flyToDebriefStop(debriefIndex - 1)}
                    disabled={debriefIndex === 0}
                    className={`w-12 h-12 flex items-center justify-center border-2 transition-all active:scale-[0.95] ${
                      debriefIndex === 0
                        ? 'bg-[#b5bcc4] dark:bg-[#3a3a3a] border-[#b5bcc4] dark:border-[#3a3a3a] text-white/50 cursor-not-allowed'
                        : 'bg-white dark:bg-[#202020] border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a]'
                    }`}
                    aria-label="Previous stop"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] px-4 h-12 flex items-center text-sm font-bold font-mono dark:text-[#e5e5e5]">
                    {debriefIndex + 1} / {debriefRoute.length}
                  </div>
                  <button
                    onClick={() => debriefIndex < debriefRoute.length - 1 && flyToDebriefStop(debriefIndex + 1)}
                    disabled={debriefIndex === debriefRoute.length - 1}
                    className={`w-12 h-12 flex items-center justify-center border-2 transition-all active:scale-[0.95] ${
                      debriefIndex === debriefRoute.length - 1
                        ? 'bg-[#b5bcc4] dark:bg-[#3a3a3a] border-[#b5bcc4] dark:border-[#3a3a3a] text-white/50 cursor-not-allowed'
                        : 'bg-white dark:bg-[#202020] border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a]'
                    }`}
                    aria-label="Next stop"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content Tabs */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            {/* Tab Navigation */}
            <div className="border-b-2 border-[#202020] dark:border-[#616161] flex">
              <button
                onClick={() => setSelectedView('entries')}
                className={`flex-1 py-3 text-sm font-bold ${
                  selectedView === 'entries'
                    ? 'bg-[#4676ac] text-white'
                    : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
                } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]`}
              >
                JOURNAL ENTRIES ({expedition.totalEntries})
              </button>
              {/* Expedition Notes tab - TEMPORARILY VISIBLE FOR TESTING (normally only shows if sponsorships enabled) */}
              {/* {showSponsorshipSection && ( */}
                <button
                  onClick={() => setSelectedView('notes')}
                  className={`flex-1 py-3 text-sm font-bold ${
                    selectedView === 'notes'
                      ? 'bg-[#4676ac] text-white'
                      : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
                  } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border-l-2 border-[#202020] dark:border-[#616161]`}
                >
                  EXPEDITION NOTES
                </button>
              {/* )} */}
              <button
                onClick={() => setSelectedView('waypoints')}
                className={`flex-1 py-3 text-sm font-bold ${
                  selectedView === 'waypoints'
                    ? 'bg-[#4676ac] text-white'
                    : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
                } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border-l-2 border-[#202020] dark:border-[#616161]`}
              >
                WAYPOINTS ({expedition.totalWaypoints})
              </button>
              {/* Sponsors tab - only show if sponsorships enabled */}
              {showSponsorshipSection && (
                <button
                  onClick={() => setSelectedView('sponsors')}
                  className={`flex-1 py-3 text-sm font-bold ${
                    selectedView === 'sponsors'
                      ? 'bg-[#4676ac] text-white'
                      : 'bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#4676ac]'
                  } transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border-l-2 border-[#202020] dark:border-[#616161]`}
                >
                  SPONSORS ({expedition.sponsors})
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Expedition Notes View - TEMPORARILY VISIBLE FOR TESTING (normally only shows if sponsorships enabled) */}
              {selectedView === 'notes' && /* showSponsorshipSection && */ (
                <div ref={notesSectionRef}>
                  <ExpeditionNotes
                    expeditionId={expedition.id}
                    explorerId={expedition.explorerId}
                    explorerName={expedition.explorerName}
                    explorerPicture={expedition.explorerPicture}
                    isOwner={isOwner}
                    isSponsoring={isSponsoring}
                    notes={expeditionNotes.map(note => ({
                      ...note,
                      id: String(note.id),
                      replies: note.replies?.map(reply => ({
                        ...reply,
                        id: String(reply.id),
                        noteId: String(reply.noteId),
                      })),
                    }))}
                    noteCount={noteCount}
                    onPostNote={handlePostNote}
                    onPostReply={handlePostReply}
                  />
                </div>
              )}

              {/* Journal Entries View */}
              {selectedView === 'entries' && (
                <div className="space-y-4">
                  {journalEntries.length > 0 ? (
                    <>
                      {journalEntries.map((entry) => (
                        <EntryCardLandscape
                          key={entry.id}
                          id={entry.id}
                          title={entry.title}
                          explorerUsername={expedition.explorerName}
                          expeditionName={expedition.title}
                          location={entry.location}
                          date={entry.date}
                          excerpt={entry.excerpt}
                          type={entry.type}
                          visibility={entry.visibility}
                          isCurrent={expedition.currentLocationSource === 'entry' && expedition.currentLocationId === entry.id}
                          onClick={() => router.push(`/entry/${entry.id}`)}
                        />
                      ))}
                      <button className="w-full py-3 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm font-bold">
                        LOAD MORE ENTRIES
                      </button>
                    </>
                  ) : (
                    <div className="border border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#fafafa] dark:bg-[#1a1a1a] p-8 text-center">
                      <div className="text-sm font-bold font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
                        NO ENTRIES LOGGED YET
                      </div>
                      <div className="text-xs text-[#b5bcc4] dark:text-[#616161]">
                        Journal entries for this expedition will appear here once published.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Waypoints View */}
              {selectedView === 'waypoints' && (
                  <div className="space-y-4">
                    {waypoints.map((wp, idx) => (
                      <WaypointCardLandscape
                        key={wp.id}
                        id={wp.id}
                        title={wp.title}
                        explorerUsername={expedition.explorerName}
                        expeditionName={expedition.title}
                        location={wp.location}
                        description={wp.description}
                        date={wp.date}
                        latitude={wp.coords.lat}
                        longitude={wp.coords.lng}
                        elevation={undefined}
                        views={0}
                        markerNumber={idx + 1}
                        isStart={idx === 0}
                        isEnd={idx === waypoints.length - 1}
                        isCurrent={expedition.currentLocationSource === 'waypoint' && expedition.currentLocationId === wp.id}
                        onClick={() => handleWaypointClick(wp.coords)}
                      />
                    ))}
                  </div>
              )}

              {/* Sponsors Leaderboard - only show if sponsorships enabled */}
              {selectedView === 'sponsors' && showSponsorshipSection && (
                <div>
                  {sponsors.length > 0 ? (
                    <div className="space-y-0">
                      {/* Leaderboard Header */}
                      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 bg-[#616161] dark:bg-[#3a3a3a] text-white text-xs font-bold font-mono">
                        <span className="w-8 text-center">#</span>
                        <span>SPONSOR</span>
                        <span className="text-right">TYPE</span>
                        <span className="w-24 text-right">AMOUNT</span>
                      </div>

                      {sponsors.map((s: any, idx: number) => {
                        const isPublic = s.isPublic !== false;
                        const isMessagePublic = s.isMessagePublic !== false;
                        const sponsor = s.user || s.sponsor;
                        const isRecurring = s.type?.toUpperCase() === 'SUBSCRIPTION';
                        const isCustomAmount = !s.tier || (s.tier.price && s.amount !== s.tier.price);
                        const tierLabel = isCustomAmount ? 'Custom' : s.tier?.description || 'Custom';

                        return (
                          <div
                            key={s.id}
                            className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 items-center border-b border-[#b5bcc4] dark:border-[#3a3a3a] ${
                              idx === 0 ? 'bg-[#fff5f0] dark:bg-[#2a2018]' : idx === 1 ? 'bg-[#fafafa] dark:bg-[#252525]' : idx === 2 ? 'bg-[#fafafa] dark:bg-[#232323]' : ''
                            }`}
                          >
                            {/* Rank */}
                            <div className={`w-8 text-center font-bold font-mono text-sm ${
                              idx === 0 ? 'text-[#ac6d46]' : idx === 1 ? 'text-[#4676ac]' : idx === 2 ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#b5bcc4] dark:text-[#616161]'
                            }`}>
                              {idx + 1}
                            </div>

                            {/* Sponsor Info */}
                            <div className="min-w-0">
                              {isPublic && sponsor ? (
                                <div>
                                  <Link
                                    href={`/journal/${sponsor.username}`}
                                    className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] hover:text-[#ac6d46] transition-all"
                                  >
                                    {sponsor.username}
                                  </Link>
                                  {isMessagePublic && s.message && (
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-0.5 truncate italic">
                                      "{s.message}"
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-[#616161] dark:text-[#b5bcc4] italic">
                                  Anonymous Sponsor
                                </div>
                              )}
                            </div>

                            {/* Tier / Type */}
                            <div className="text-right">
                              <span className={`inline-block px-2 py-0.5 text-xs font-bold ${
                                isRecurring
                                  ? 'bg-[#4676ac] text-white'
                                  : 'bg-[#ac6d46] text-white'
                              }`}>
                                {tierLabel}
                              </span>
                              <div className="text-[10px] text-[#b5bcc4] dark:text-[#616161] mt-0.5 font-mono">
                                {isRecurring ? 'MONTHLY' : 'ONE-TIME'}
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="w-24 text-right">
                              <div className="font-bold text-sm dark:text-[#e5e5e5]">
                                ${(s.totalContribution || s.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              {isRecurring && (
                                <div className="text-[10px] text-[#4676ac] font-mono">
                                  ${(s.amount || 0).toFixed(2)}/mo
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#fafafa] dark:bg-[#1a1a1a] p-8 text-center">
                      <Users className="w-12 h-12 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-3" />
                      <div className="text-sm font-bold font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
                        NO SPONSORS YET
                      </div>
                      <div className="text-xs text-[#b5bcc4] dark:text-[#616161]">
                        Be the first to support this expedition.
                      </div>
                      {!isOwner && expedition.status !== 'completed' && (
                        <Link
                          href={isAuthenticated ? `/sponsor/${expedition.id}` : `/login?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
                          className="inline-block mt-4 px-6 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] text-sm font-bold"
                        >
                          BECOME A SPONSOR
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {isOwner && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
                QUICK ACTIONS
              </h3>
              <div className="space-y-2">
                <Link
                  href={`/log-entry/${expedition.id}`}
                  className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
                >
                  + LOG NEW ENTRY
                </Link>
                <Link
                  href={`/log-entry/${expedition.id}?type=waypoint`}
                  className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
                >
                  + LOG WAYPOINT
                </Link>
                <button
                  onClick={() => setShowUpdateLocationModal(true)}
                  disabled={expedition.status === 'completed'}
                  className={`w-full py-2 border-2 border-[#202020] dark:border-[#616161] transition-all text-sm font-bold ${
                    expedition.status === 'completed'
                      ? 'opacity-50 cursor-not-allowed text-[#616161] dark:text-[#616161]'
                      : 'dark:text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white dark:hover:bg-[#4a4a4a] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]'
                  }`}
                  title={expedition.status === 'completed' ? 'Cannot update location on completed expeditions' : undefined}
                >
                  UPDATE LOCATION
                </button>
{showSponsorshipSection && (
                  <button
                    onClick={handleSponsorUpdate}
                    className="w-full py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm font-bold"
                  >
                    SPONSOR UPDATE
                  </button>
                )}
                <button
                  onClick={() => setShowManagementModal(true)}
                  className="w-full py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Settings size={16} strokeWidth={2} />
                  <span>MANAGE EXPEDITION</span>
                </button>
              </div>
            </div>
          )}

          {/* Expedition Details */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              EXPEDITION DETAILS
            </h3>
            <div className="text-xs font-mono space-y-2 text-[#616161] dark:text-[#b5bcc4]">
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">ID:</span> {expedition.id}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Status:</span> {expedition.status}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Category:</span> {expedition.category || 'Not set'}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Region:</span> {expedition.region || 'Not set'}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Started:</span> {formatDate(expedition.startDate)}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Est. End:</span> {formatDate(expedition.estimatedEndDate)}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Duration:</span> {expedition.daysActive} / {totalDuration || '?'} days</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Privacy:</span> {expedition.privacy === 'off-grid' ? 'Off-Grid' : expedition.privacy === 'private' ? 'Private' : 'Public'}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Comments:</span> {expedition.commentsEnabled ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>

          {/* Funding Breakdown - only show if sponsorships enabled */}
          {showSponsorshipSection && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
                SPONSORSHIP FUNDING BREAKDOWN
              </h3>

              {/* Goal & Progress */}
              <div className="mb-4">
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Goal:</span>
                    <span className="font-bold text-sm dark:text-[#e5e5e5]">${expedition.goal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Raised:</span>
                    <span className="font-bold text-sm text-[#ac6d46]">${totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Remaining:</span>
                    <span className="font-bold text-sm dark:text-[#e5e5e5]">${Math.max(0, expedition.goal - totalRaised).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-[#616161] dark:text-[#b5bcc4]">PROGRESS</span>
                    <span className="font-bold text-[#ac6d46]">{Math.min(100, (expedition.goal > 0 ? (totalRaised / expedition.goal) * 100 : 0)).toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-[#b5bcc4] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161]">
                    <div
                      className="h-full bg-[#ac6d46]"
                      style={{ width: `${Math.min(100, expedition.goal > 0 ? (totalRaised / expedition.goal) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Excess Funding Notice */}
              {expedition.goal > 0 && totalRaised > expedition.goal && (
                <div className="mb-4 p-3 bg-[#fef9e7] dark:bg-[#2a2518] border-l-4 border-[#d4a844]">
                  <div className="text-xs font-bold mb-1 text-[#d4a844]">
                    {totalRaised > expedition.goal && fundingStats.totalRecurringToDate > 0 && expedition.raised <= expedition.goal
                      ? 'PROJECTED TO EXCEED GOAL'
                      : 'GOAL EXCEEDED'}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Excess of <span className="font-bold">${(totalRaised - expedition.goal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {totalRaised > expedition.goal && fundingStats.totalRecurringToDate > 0 && expedition.raised <= expedition.goal
                      ? ' is projected by end of expedition from recurring sponsorships. '
                      : '. '}
                    Excess funds will be allocated to future expeditions.
                  </div>
                </div>
              )}

              {/* Funding Sources Breakdown */}
              <div className="mb-4 p-3 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]">
                <div className="text-xs font-bold mb-2 text-[#ac6d46]">ONE-TIME SPONSORSHIPS</div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">{expedition.sponsors} sponsor{expedition.sponsors !== 1 ? 's' : ''}</span>
                  <span className="font-bold text-sm text-[#ac6d46]">${expedition.raised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mb-4 p-3 bg-[#f0f4f8] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac]">
                <div className="text-xs font-bold mb-2 text-[#4676ac]">RECURRING MONTHLY</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">{fundingStats.activeSubscribers} active sponsor{fundingStats.activeSubscribers !== 1 ? 's' : ''}</span>
                    <span className="font-bold text-sm text-[#4676ac]">${fundingStats.monthlyRecurring.toFixed(2)}/mo</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Committed to date:</span>
                    <span className="font-bold text-sm text-[#4676ac]">${fundingStats.totalRecurringToDate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Sponsor Button */}
              {!isOwner && expedition.status !== 'completed' && (
                <Link
                  href={isAuthenticated ? `/sponsor/${expedition.id}` : `/login?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
                  className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
                >
                  SPONSOR
                </Link>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              TAGS
            </h3>
            <div className="flex flex-wrap gap-2">
              {expedition.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Route Statistics */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              ROUTE STATISTICS
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Total Waypoints</span>
                <span className="font-bold dark:text-[#e5e5e5]">{expedition.totalWaypoints}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Completed</span>
                <span className="font-bold text-[#ac6d46]">{waypoints.filter(w => w.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Current</span>
                <span className="font-bold text-[#4676ac]">{waypoints.filter(w => w.status === 'current').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Planned</span>
                <span className="font-bold dark:text-[#e5e5e5]">{waypoints.filter(w => w.status === 'planned').length}</span>
              </div>
              <div className="flex justify-between border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Estimated Distance</span>
                <span className="font-bold dark:text-[#e5e5e5]">~{formatDistance(3247, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Avg. Daily Distance</span>
                <span className="font-bold dark:text-[#e5e5e5]">~{formatDistance(22.1, 1)}</span>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              SYSTEM INFORMATION
            </h3>
            <div className="text-xs font-mono space-y-2 text-[#616161] dark:text-[#b5bcc4]">
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Last Update:</span> {formatDateTime(new Date())}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Data Points:</span> {expedition.totalEntries + expedition.totalWaypoints}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">GPS Accuracy:</span> ±50m avg</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Map Renders:</span> 3</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Page Load:</span> 247ms</div>
            </div>
          </div>
        </div>
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
          status: (expedition.status === 'active' || expedition.status === 'planned' || expedition.status === 'completed'
            ? expedition.status
            : 'active') as 'active' | 'planned' | 'completed',
          startDate: expedition.startDate,
          estimatedEndDate: expedition.estimatedEndDate,
          daysActive: expedition.daysActive,
          journalEntries: expedition.totalEntries,
          totalFunding: expedition.raised,
          backers: expedition.sponsors,
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}