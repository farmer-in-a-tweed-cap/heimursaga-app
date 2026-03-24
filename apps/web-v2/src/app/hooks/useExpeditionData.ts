import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { expeditionApi, explorerApi, entryApi, type Expedition } from '@/app/services/api';
import { haversineKm } from '@/app/utils/haversine';
import { truncateExcerpt } from '@/app/utils/truncateExcerpt';
import type { WaypointType, JournalEntryType, TransformedExpedition, CurrentLocationData } from '@/app/components/expedition-detail/types';

export function useExpeditionData(
  expeditionId: string | undefined,
  user: { username?: string } | null,
  isAuthenticated: boolean,
) {
  const router = useRouter();
  const [apiExpedition, setApiExpedition] = useState<Expedition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowingExplorer, setIsFollowingExplorer] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [entryBookmarked, setEntryBookmarked] = useState<Set<string>>(new Set());
  const [entryBookmarkLoading, setEntryBookmarkLoading] = useState<string | null>(null);

  // Track last fetched data to avoid unnecessary state updates (prevents map remount)
  const lastDataHashRef = useRef<string>('');

  // Fetch expedition from API
  const fetchExpedition = useCallback(async (showLoading = true) => {
    if (!expeditionId) return;
    if (showLoading) setLoading(true);
    try {
      const data = await expeditionApi.getById(expeditionId);
      const hash = JSON.stringify(data);
      if (hash !== lastDataHashRef.current) {
        lastDataHashRef.current = hash;
        setApiExpedition(data);
      }
      if (data.bookmarked !== undefined) {
        setIsBookmarked(data.bookmarked);
      }
      if (data.followingAuthor !== undefined) {
        setIsFollowingExplorer(data.followingAuthor);
      }
    } catch (err) {
      console.error('Error fetching expedition:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [expeditionId]);

  // Initial fetch + re-fetch when page becomes visible again
  useEffect(() => {
    fetchExpedition();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchExpedition(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchExpedition]);

  // Handle follow/unfollow explorer
  const handleFollowExplorer = async (username: string) => {
    if (!isAuthenticated || !username) {
      router.push('/auth');
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
      router.push('/auth');
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
      router.push('/auth');
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

  // Transform API expedition data to match component format
  const expedition: TransformedExpedition | null = useMemo(() => {
    if (!apiExpedition) return null;
    const api = apiExpedition;

    const startDate = api.startDate ? new Date(api.startDate) : null;
    const endDate = api.endDate ? new Date(api.endDate) : null;
    const now = new Date();

    const referenceDate = api.status === 'completed' && endDate ? endDate : now;
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
      stripeAccountConnected: api.author?.stripeAccountConnected === true,
      status: (api.status || 'active') as 'active' | 'planned' | 'completed' | 'cancelled',
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
      followers: 0,
      totalViews: 0,
      totalEntries: api.entriesCount || 0,
      totalWaypoints: api.waypoints
        ? api.waypoints.filter((wp: any) => !(wp.entryIds?.length > 0 || wp.entryId)).length
        : api.waypointsCount || 0,
      tags: api.tags || [],
      privacy: api.visibility || (api.public !== false ? 'public' : 'private'),
      commentsEnabled: true,
      imageUrl: api.coverImage || '',
      earlyAccessEnabled: (api as any).earlyAccessEnabled ?? false,
    };
  }, [apiExpedition, expeditionId]);

  // Total duration in days
  const totalDuration = useMemo(() => {
    if (!expedition?.startDate || !expedition?.estimatedEndDate) return 0;
    const start = new Date(expedition.startDate);
    const end = new Date(expedition.estimatedEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [expedition?.startDate, expedition?.estimatedEndDate]);

  const isOwner = !!(isAuthenticated && expedition && user?.username === expedition.explorerId);

  const showSponsorshipSection = !!(expedition && expedition.goal > 0 && expedition.stripeAccountConnected);

  // Waypoints (memoized to prevent map recreation on re-render)
  const waypoints: WaypointType[] = useMemo(() => {
    if (!apiExpedition?.waypoints) return [];

    const currentSource = apiExpedition.currentLocationSource;
    const currentLocId = apiExpedition.currentLocationId;

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
        entryId: wp.entryId,
        entryIds: wp.entryIds || [],
      }));
    }

    let currentWpIdx = -1;
    let wpStatusAtIdx: 'current' | 'completed' = 'current';

    if (currentSource === 'waypoint') {
      currentWpIdx = apiExpedition.waypoints.findIndex(
        (wp) => String(wp.id) === currentLocId,
      );
    } else if (currentSource === 'entry') {
      const entry = apiExpedition.entries?.find((e) => e.id === currentLocId);
      if (entry && entry.lat != null && entry.lon != null) {
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
      wpStatusAtIdx = 'completed';
    }

    return apiExpedition.waypoints.map((wp, idx) => {
      let status: 'completed' | 'current' | 'planned';
      if (currentWpIdx < 0) {
        status = 'planned';
      } else if (idx < currentWpIdx) {
        status = 'completed';
      } else if (idx === currentWpIdx) {
        status = wpStatusAtIdx;
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
        entryId: wp.entryId,
        entryIds: wp.entryIds || [],
      };
    });
  }, [apiExpedition?.waypoints, apiExpedition?.currentLocationSource, apiExpedition?.currentLocationId, apiExpedition?.entries]);

  // Journal entries (memoized, sorted newest first)
  const journalEntries: JournalEntryType[] = useMemo(() => {
    if (!apiExpedition?.entries) return [];
    return apiExpedition.entries
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        date: entry.date || '',
        location: entry.place || 'Unknown location',
        coords: { lat: entry.lat || 0, lng: entry.lon || 0 },
        excerpt: truncateExcerpt(entry.content || ''),
        type: 'standard' as const,
        mediaCount: entry.mediaCount || 0,
        views: 0,
        visibility: (entry.visibility || 'public') as 'public' | 'off-grid' | 'private',
        isMilestone: entry.isMilestone || false,
        loggedDuringPlanning: (entry as any).metadata?.loggedDuringPlanning === true,
        createdAt: (entry as any).createdAt || '',
        earlyAccess: (entry as any).earlyAccess || false,
        embargoLiftsAt: (entry as any).embargoLiftsAt || undefined,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [apiExpedition?.entries]);

  // Total route distance (km) — prefer stored value, fall back to haversine for legacy data
  const totalRouteDistance = useMemo(() => {
    if (apiExpedition?.routeDistanceKm) return apiExpedition.routeDistanceKm;
    const coords = apiExpedition?.routeGeometry;
    if (coords && coords.length >= 2) {
      let total = 0;
      for (let i = 1; i < coords.length; i++) {
        total += haversineKm(coords[i - 1], coords[i]);
      }
      return total;
    }
    if (waypoints.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1].coords;
      const curr = waypoints[i].coords;
      total += haversineKm([prev.lng, prev.lat], [curr.lng, curr.lat]);
    }
    // For round trips, add the return leg (last waypoint → first waypoint)
    if (apiExpedition?.isRoundTrip && waypoints.length >= 2) {
      const last = waypoints[waypoints.length - 1].coords;
      const first = waypoints[0].coords;
      total += haversineKm([last.lng, last.lat], [first.lng, first.lat]);
    }
    return total;
  }, [apiExpedition?.routeGeometry, apiExpedition?.routeDistanceKm, apiExpedition?.isRoundTrip, waypoints]);

  // Current location data
  const currentLocationData: CurrentLocationData | null = useMemo(() => {
    if (!expedition?.currentLocationSource || !expedition?.currentLocationId || expedition?.status === 'cancelled') {
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
  }, [expedition, waypoints, journalEntries]);

  return {
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
    fetchExpedition,
  };
}
