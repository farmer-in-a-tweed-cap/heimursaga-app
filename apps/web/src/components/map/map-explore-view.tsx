'use client';

import { MapSearchbar, MapSearchbarSubmitHandler } from '../search';
import { MapQueryContext, MapQueryFilterParam } from '@repo/types';
import { Button, ChipGroup, LoadingSpinner } from '@repo/ui/components';
import { ArrowLeft, Crosshair } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import {
  MAP_LAYERS,
  MAP_SOURCES,
  Map,
  MapDrawer,
  MapSidebar,
  MapTripCard,
  MapViewContainer,
  MapViewSwitch,
  PostCard,
  TripCard,
  UserProfileCard,
  useSidebar,
} from '@/components';
import { APP_CONFIG } from '@/config';
import {
  MAP_CONTEXT_PARAMS,
  MAP_FILTER_PARAMS,
  MAP_VIEW_PARAMS,
  MapLoadHandler,
  MapMoveHandler,
  useAppParams,
  useMap,
  useMapbox,
  useScreen,
  useSession,
} from '@/hooks';
import { LOCALES } from '@/locales';

type Waypoint = {
  lat: number;
  lon: number;
  date: Date;
  waypoint?: {
    id: number;
    title: string;
    date: Date;
  };
  post?: {
    id: string;
    title: string;
    content: string;
    place?: string;
    bookmarked: boolean;
    sponsored?: boolean;
    date?: Date;
    author: {
      username: string;
      picture: string;
      creator?: boolean;
    };
    trip?: {
      id: string;
      title: string;
    };
    media?: { id: string; thumbnail: string; caption?: string }[];
  };
};

type Props = {
  className?: string;
};

export const MapExploreView: React.FC<Props> = () => {
  const mapbox = useMapbox();
  const session = useSession();
  const screen = useScreen();
  const queryClient = useQueryClient();
  const { collapsed: sidebarCollapsed } = useSidebar();
  const sidebarResizingRef = useRef(false);
  const lastMapPositionRef = useRef<{ lat: number; lon: number; zoom: number } | null>(null);
  const mapInitializedRef = useRef(false);

  const { params, setParams } = useAppParams({
    context: MAP_CONTEXT_PARAMS.GLOBAL,
    filter: MAP_FILTER_PARAMS.POST,
    lon: screen.mobile ? APP_CONFIG.MAP.DEFAULT.MOBILE.LON.toString() : APP_CONFIG.MAP.DEFAULT.CENTER.LON.toString(),
    lat: screen.mobile ? APP_CONFIG.MAP.DEFAULT.MOBILE.LAT.toString() : APP_CONFIG.MAP.DEFAULT.CENTER.LAT.toString(),
    zoom: APP_CONFIG.MAP.DEFAULT.ZOOM.toString(),
  });

  const filter = params.filter as MapQueryFilterParam;
  const context = params.context as MapQueryContext;
  const userId = params.user as string;
  const postId = params.entry_id as string;
  const tripId = params.journey_id as string;

  const initialCenter = params.lat && params.lon
    ? {
        lat: parseFloat(params.lat),
        lon: parseFloat(params.lon),
      }
    : screen.mobile
    ? {
        lat: APP_CONFIG.MAP.DEFAULT.MOBILE.LAT,
        lon: APP_CONFIG.MAP.DEFAULT.MOBILE.LON,
      }
    : {
        lat: APP_CONFIG.MAP.DEFAULT.CENTER.LAT,
        lon: APP_CONFIG.MAP.DEFAULT.CENTER.LON,
      };
  const initialZoom = params.zoom ? parseFloat(params.zoom) : APP_CONFIG.MAP.DEFAULT.ZOOM;

  const map = useMap({
    sidebar: true,
    context: params.context || MAP_CONTEXT_PARAMS.GLOBAL,
    filter: params.filter || MAP_FILTER_PARAMS.POST,
    center: initialCenter,
    zoom: initialZoom,
  });

  // Initialize lastMapPositionRef with the initial position to avoid treating first move as significant
  if (!lastMapPositionRef.current) {
    lastMapPositionRef.current = {
      lat: initialCenter.lat,
      lon: initialCenter.lon,
      zoom: initialZoom,
    };
  }

  const [view, setView] = useState<string>(MAP_VIEW_PARAMS.MAP);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [focusedWaypointId, setFocusedWaypointId] = useState<string | null>(null);
  // Initialize hasInteracted based on URL params - if there's a search or non-default position, user has interacted
  const [hasInteracted, setHasInteracted] = useState<boolean>(() => {
    const defaultLat = screen.mobile ? APP_CONFIG.MAP.DEFAULT.MOBILE.LAT.toString() : APP_CONFIG.MAP.DEFAULT.CENTER.LAT.toString();
    const defaultLon = screen.mobile ? APP_CONFIG.MAP.DEFAULT.MOBILE.LON.toString() : APP_CONFIG.MAP.DEFAULT.CENTER.LON.toString();
    const defaultZoom = APP_CONFIG.MAP.DEFAULT.ZOOM.toString();
    return !!(params.search || params.lat !== defaultLat || params.lon !== defaultLon || params.zoom !== defaultZoom);
  });
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isSearchAnimating, setIsSearchAnimating] = useState<boolean>(false);
  const [isGeolocateAnimating, setIsGeolocateAnimating] = useState<boolean>(false);
  const [userFlyToCompleted, setUserFlyToCompleted] = useState<boolean>(false);
  // Initialize hasEverSearched based on URL params - if there's a search or non-default position, user has searched
  const [hasEverSearched, setHasEverSearched] = useState<boolean>(() => {
    // Only set to true if there's an actual search query, not just position params
    return !!params.search;
  });
  const [previousView, setPreviousView] = useState<{
    center: { lat: number; lon: number };
    zoom: number;
    bounds?: { sw: { lat: number; lon: number }; ne: { lat: number; lon: number } };
  } | null>(null);
  const [userInitiatedFlyTo, setUserInitiatedFlyTo] = useState<boolean>(false);
  const [journeyTransitioning, setJourneyTransitioning] = useState<boolean>(false);
  const [prioritizedEntryId, setPrioritizedEntryId] = useState<string | null>(null);

  const [search, setSearch] = useState<{
    value?: string;
    context: 'text' | 'location' | 'user' | 'entry';
    query: string | null;
    loading: boolean;
  }>({
    context: 'text',
    loading: false,
    value: params.search || undefined,
    query: params.search || null,
  });

  const contexts = {
    map: [MAP_CONTEXT_PARAMS.GLOBAL, MAP_CONTEXT_PARAMS.FOLLOWING].some(
      (ctx) => ctx === context,
    ),
    user: context === MAP_CONTEXT_PARAMS.USER,
    journey: context === MAP_CONTEXT_PARAMS.JOURNEY,
  };

  const filters = {
    post: filter === MAP_FILTER_PARAMS.POST,
    journey: filter === MAP_FILTER_PARAMS.JOURNEY,
  };


  // Enable query when map is loaded, has bounds, user has interacted, and no search animation is running
  const queryEnabled = map.loaded &&
    [
      MAP_CONTEXT_PARAMS.GLOBAL,
      MAP_CONTEXT_PARAMS.FOLLOWING,
      MAP_CONTEXT_PARAMS.USER,
      MAP_CONTEXT_PARAMS.JOURNEY,
    ].some((ctx) => ctx === context) &&
    (contexts.journey ? !!tripId : (contexts.user ? !!map.bounds && !isSearchAnimating : !!map.bounds && (!!search.query || hasEverSearched) && !isSearchAnimating && !isGeolocateAnimating));

  const mapQuery = useQuery({
    queryKey: userId
      ? [
          API_QUERY_KEYS.MAP.QUERY,
          userId,
          context,
          tripId, // Include tripId in query key for journey context
          // Don't include bounds in query key for journey context to get all entries
          contexts.journey 
            ? 'all_entries'
            : map.bounds
            ? [
                map.bounds.ne.lat,
                map.bounds.ne.lon,
                map.bounds.sw.lat,
                map.bounds.sw.lon,
              ].join(':')
            : 'no_bounds',
          search.query || 'search',
          map.loaded, // Include map loaded state to re-trigger when map loads
          hasInteracted, // Include interaction state to re-trigger when user interacts
        ]
      : [
          API_QUERY_KEYS.MAP.QUERY,
          context,
          tripId, // Include tripId in query key for journey context
          contexts.journey 
            ? 'all_entries'
            : map.bounds
            ? [
                map.bounds.ne.lat,
                map.bounds.ne.lon,
                map.bounds.sw.lat,
                map.bounds.sw.lon,
              ].join(':')
            : 'no_bounds',
          search.query || 'search',
          map.loaded, // Include map loaded state to re-trigger when map loads
          hasInteracted, // Include interaction state to re-trigger when user interacts
        ],
    queryFn: async () => {
      const queryParams = {
        context: context,
        username:
          context === MAP_CONTEXT_PARAMS.USER
            ? userId
              ? userId
              : undefined
            : undefined,
        location: contexts.journey ? undefined : { bounds: map.bounds },
        tripId:
          context === MAP_CONTEXT_PARAMS.JOURNEY
            ? tripId
              ? tripId
              : undefined
            : undefined,
        search: undefined, // Don't apply search filters on page refresh - just load all waypoints in bounds
        prioritizeEntryId: prioritizedEntryId || undefined,
      };
      
      
      return apiClient
        .mapQuery(queryParams)
        .then(({ data }) => {
          return data;
        });
    },
    enabled:
      map.loaded &&
      [
        MAP_CONTEXT_PARAMS.GLOBAL,
        MAP_CONTEXT_PARAMS.FOLLOWING,
        MAP_CONTEXT_PARAMS.USER,
        MAP_CONTEXT_PARAMS.JOURNEY,
      ].some((ctx) => ctx === context) &&
      queryEnabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
    retry: 0,
  });

  const userQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USERS, userId],
    queryFn: async () =>
      apiClient
        .getUserByUsername({ username: userId as string })
        .then(({ data }) => data),
    enabled: !!userId,
    retry: 0,
  });

  const postQuery = useQuery({
    queryKey: [API_QUERY_KEYS.POSTS, postId],
    queryFn: async () =>
      apiClient
        .getPostById({ query: { id: postId as string } })
        .then(({ data }) => data),
    enabled: !!postId,
  });

  const tripsQuery = useQuery({
    queryKey: [API_QUERY_KEYS.TRIPS, userId],
    queryFn: async () =>
      apiClient
        .getTripsByUsername({ username: userId as string })
        .then(({ data }) => data),
    enabled: !!userId && filter === MAP_FILTER_PARAMS.JOURNEY,
  });

  const tripQuery = useQuery({
    queryKey: [API_QUERY_KEYS.TRIPS, tripId],
    queryFn: async () =>
      apiClient
        .getTripById({ query: { tripId: tripId as string } })
        .then(({ data }) => data),
    enabled: !!tripId && context === MAP_CONTEXT_PARAMS.JOURNEY,
  });

  const post = postQuery?.data;
  const postLoading = postQuery.isLoading;
  const user = userQuery.data;
  const showClusters = contexts.map || contexts.user;

  // Only show loading if query is enabled and actually loading, and user should see loading
  const mapLoading = (mapQuery.isPending || mapQuery.isLoading) && 
    (contexts.journey || contexts.user || (hasInteracted && !isSearchAnimating));
  const mapResults = mapQuery.data?.results || 0;

  const trips = tripsQuery.data?.data || [];
  const tripsLoading = tripsQuery.isPending || tripsQuery.isLoading;
  const tripsResults = tripsQuery.data?.results || 0;

  const trip = tripQuery.data;
  const tripLoading = tripQuery.isPending || tripQuery.isLoading;

  const isPostSelected = (id: string): boolean =>
    postId ? postId === id : false;

  const handlePostHover = (postId: string) => {
    // Only enable hover on desktop (when both map and feed are visible)
    if (!screen.mobile) {
      setHoveredPostId(postId);
    }
  };

  const handlePostUnhover = () => {
    // Only enable hover on desktop (when both map and feed are visible)
    if (!screen.mobile) {
      setHoveredPostId(null);
    }
  };

  const handleViewToggle = () => {
    setView((prev) => {
      const view =
        prev === MAP_VIEW_PARAMS.LIST
          ? MAP_VIEW_PARAMS.MAP
          : MAP_VIEW_PARAMS.LIST;
      // viewRef.current = view;
      return view;
    });
  };

  const handleMapMove: MapMoveHandler = (data) => {
    const {
      center: { lat = 0, lon = 0 },
      zoom = 0,
    } = data;
    map.handleMove(data);

    // Check if this is a significant position change (not just a resize)
    const lastPosition = lastMapPositionRef.current;
    const isSignificantChange = !lastPosition ||
      Math.abs(lastPosition.lat - lat) > 0.0001 ||
      Math.abs(lastPosition.lon - lon) > 0.0001 ||
      Math.abs(lastPosition.zoom - zoom) > 0.01;

    // Update last position
    lastMapPositionRef.current = { lat, lon, zoom };

    // Skip updates during initial load, sidebar resize, or insignificant changes
    if (!mapInitializedRef.current || sidebarResizingRef.current || !isSignificantChange) {
      return;
    }

    // Clear search params when map is manually moved to prevent coordinate/search conflicts
    setParams({
      lat: `${lat}`,
      lon: `${lon}`,
      zoom: `${zoom}`,
      search: null, // Clear search when manually moving map
    });

    // Clear search state to match
    setSearch((prev) => ({ ...prev, query: null, value: '' }));

    // Mark as interacted when map moves
    setHasInteracted(true);
    setHasEverSearched(true); // Prevent overlay from reappearing after manual interaction
  };

  const handlePostClick = (postId: string) => {
    if (screen.mobile) {
      // On mobile, always open the full entry card directly
      map.handleDrawerOpen();
      setParams({ entry_id: postId });
    } else {
      // On desktop, bypass two-click system if drawer is already open
      if (map.drawer || focusedWaypointId === postId) {
        // Drawer is open OR second click - open the full entry card
        // Clear focused waypoint when drawer is open to prevent multiple selections
        if (map.drawer) {
          setFocusedWaypointId(null);
        }
        map.handleDrawerOpen();
        setParams({ entry_id: postId });
      } else {
        // First click - fly to the marker
        const waypoint = waypoints.find(wp => wp.post?.id === postId);
        if (waypoint) {
          // Save current view state
          setPreviousView({
            center: map.center,
            zoom: map.zoom,
            bounds: map.bounds
          });
          
          // Fly to the waypoint
          if (map.mapbox) {
            setUserInitiatedFlyTo(true);
            
            // Set up moveend handler for when flyTo completes
            const handleMoveEnd = () => {
              setUserInitiatedFlyTo(false);
              map.mapbox?.off('moveend', handleMoveEnd);
            };
            
            map.mapbox?.on('moveend', handleMoveEnd);
            map.mapbox.flyTo({
              center: [waypoint.lon, waypoint.lat],
              zoom: 14,
              speed: 1.2
            });
          }
          
          setFocusedWaypointId(postId);
        } else if (contexts.journey) {
          // In journey context, if waypoint not found (out of bounds), 
          // trigger journey overview to show all waypoints
          handleBackToOverview();
        }
      }
    }
  };

  const handleMapMarkerClick = (postId: string, feature?: any) => {
    // In journey context, only respond to entries (not waypoints)
    if (params.context === 'journey' && feature?.properties?.type === 'waypoint') {
      return; // Do nothing for waypoint markers in journey context
    }
    
    // Map marker clicks always open the full entry immediately
    map.handleDrawerOpen();
    setParams({ entry_id: postId });
    
    // Center marker in left visible area when entry drawer opens
    if (map.mapbox && feature?.geometry?.coordinates) {
      const [lon, lat] = feature.geometry.coordinates;
      
      // Small delay to let drawer opening animation start
      setTimeout(() => {
        map.mapbox?.flyTo({
          center: [lon, lat],
          zoom: Math.max(map.zoom, 12),
          speed: 1.2,
          padding: { left: 150, top: 50, right: 50, bottom: 50 }
        });
      }, 100);
    }
  };

  const handlePostDrawerClose = () => {
    map.handleDrawerClose();
    setParams({ entry_id: null });
  };

  const fitJourneyBounds = () => {
    if (!map.mapbox || waypoints.length === 0) return;
    
    const coordinates = waypoints.map(wp => [wp.lon, wp.lat]);
    const duration = 1500;
    
    if (coordinates.length === 1) {
      // Single point - center map on it
      map.mapbox.flyTo({
        center: [waypoints[0].lon, waypoints[0].lat],
        zoom: 14,
        speed: 1.2
      });
    } else if (coordinates.length > 1) {
      // Multiple points - fit bounds to include all points
      const lats = coordinates.map(coord => coord[1]);
      const lons = coordinates.map(coord => coord[0]);
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      
      // Add padding to bounds - ensure minimum padding for very close points
      const latRange = maxLat - minLat;
      const lonRange = maxLon - minLon;
      const latPadding = Math.max(latRange * 0.1, 0.01);
      const lonPadding = Math.max(lonRange * 0.1, 0.01);
      
      // Force fit bounds regardless of current zoom level
      map.mapbox.fitBounds(
        [minLon - lonPadding, minLat - latPadding, maxLon + lonPadding, maxLat + latPadding],
        {
          speed: 1.2,
          padding: 40, // Increased padding for better visibility
          maxZoom: 15 // Prevent zooming in too much on close points
        }
      );
    }
  };

  const handleBackToOverview = () => {
    if (contexts.journey) {
      // In journey context, fit bounds to show all waypoints
      fitJourneyBounds();
    } else if (contexts.user) {
      // In user context, switch back to global context
      handleUserBack();
      return;
    } else if (previousView && map.mapbox) {
      // In other contexts, return to previous view state
      const duration = 1000;
      if (previousView.bounds) {
        // Fly back to previous bounds
        map.mapbox.fitBounds(
          [previousView.bounds.sw.lon, previousView.bounds.sw.lat, previousView.bounds.ne.lon, previousView.bounds.ne.lat],
          {
            speed: 1.2,
            padding: 20
          }
        );
      } else {
        // Fly back to previous center and zoom
        map.mapbox.flyTo({
          center: [previousView.center.lon, previousView.center.lat],
          zoom: previousView.zoom,
          speed: 1.2
        });
      }
    }
    
    setFocusedWaypointId(null);
    setPreviousView(null);
    setPrioritizedEntryId(null);
    
    // Close any open entry drawer
    map.handleDrawerClose();
    setParams({ entry_id: null });
  };

  const handleContextChange = (context: string) => {
    switch (context) {
      case MapQueryContext.GLOBAL:
        setParams({ context, filter: MapQueryFilterParam.POST });
        break;
      case MapQueryContext.FOLLOWING:
        setParams({ context, filter: MapQueryFilterParam.POST });
        break;
      case MapQueryContext.USER:
        setParams({ context, filter: MapQueryFilterParam.POST });
        break;
      case MapQueryContext.TRIP:
        setParams({ context, filter: MapQueryFilterParam.TRIP });
        break;
      default:
        setParams({
          context: MapQueryContext.GLOBAL,
          filter: MapQueryFilterParam.POST,
        });
        break;
    }
  };

  const handleFilterChange = (filter: string) => {
    setParams({ filter });
  };

  const handleSearchChange = (value: string) => {
    if (value) {
      setSearch((prev) => ({ ...prev, value }));
    }
  };

  const handleSearchClear = () => {
    // Do nothing - just clear the input value, keep everything else as is
    setSearch((prev) => ({ ...prev, value: '' }));
  };

  const handleGeolocate = () => {
    if (!map.mapbox) return;

    // Start animation - this hides overlay and blocks query
    setIsGeolocateAnimating(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Set up one-time event listener for when the flyTo completes
          const handleMoveEnd = () => {
            // Set everything after flyTo completes
            setIsGeolocateAnimating(false); // End animation
            setHasEverSearched(true);
            setSearch((prev) => ({ ...prev, query: 'My Location', context: 'location' }));
            setParams({ search: 'My Location' });
            map.mapbox?.off('moveend', handleMoveEnd);
          };
          
          map.mapbox?.on('moveend', handleMoveEnd);
          map.mapbox?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            speed: 1.2,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to retrieve your location');
          setIsGeolocateAnimating(false); // End animation on error
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
      setIsGeolocateAnimating(false); // End animation on error
    }
  };

  const handleSearchSubmit: MapSearchbarSubmitHandler = (data) => {
    const { context, item } = data;
    const query = item.name;


    if (context === 'text') {
      setSearch((prev) => ({ ...prev, query, context: 'text' }));
      setParams({ search: query });
      setHasEverSearched(true);
    }

    if (context === 'location') {
      // Start animation - this opens sidebar immediately
      setIsSearchAnimating(true);
      setHasInteracted(true);

      // update map with smooth flyTo animation
      if (item.bounds && map.mapbox) {
        const lon = item.center?.[0];
        const lat = item.center?.[1];

        const bbox = {
          sw: {
            lat: item.bounds[1],
            lon: item.bounds[0],
          },
          ne: {
            lat: item.bounds[3],
            lon: item.bounds[2],
          },
        };
        
        // Set up moveend handler for when fitBounds completes
        const handleMoveEnd = () => {
          setIsSearchAnimating(false);
          setHasEverSearched(true);
          setSearch((prev) => ({ ...prev, query, context: 'location' }));
          if (query && lon && lat) {
            setParams({ search: query, lon: `${lon}`, lat: `${lat}` });
          }
          map.mapbox?.off('moveend', handleMoveEnd);
        };
        
        map.mapbox?.on('moveend', handleMoveEnd);
        
        // Use smooth fitBounds animation instead of instant updateBounds
        map.mapbox.fitBounds(
          [bbox.sw.lon, bbox.sw.lat, bbox.ne.lon, bbox.ne.lat],
          {
            speed: 1.2,
            padding: 40
          }
        );
      }
    }

    if (context === 'user' && item.username) {
      setSearch((prev) => ({ ...prev, query, context: 'user' }));
      setParams({ search: query });
      setHasEverSearched(true);
      
      // Switch to user context on the explore page
      handleUserClick(item.username);
      
      // Reset flags for new user search
      setUserFlyToCompleted(false);
      setIsSearchAnimating(false);
    }

    if (context === 'entry') {
      // Start animation - this opens sidebar and hides overlay immediately
      setIsSearchAnimating(true);
      setHasInteracted(true);
      
      // Handle entry search results with flyTo functionality
      const entryId = item.id.replace('entry-', ''); // Remove the prefix we added
      
      // Try to find the entry in current waypoints first
      const waypoint = waypoints.find(wp => wp.post?.id === entryId);
      if (waypoint) {
        // Entry is already loaded, use existing click handler
        setIsSearchAnimating(false); // End animation immediately
        handlePostClick(entryId);
      } else if (item.lat && item.lon && map.mapbox) {
        // Entry not in current bounds, but we have coordinates - fly to it
        // Save current view state
        setPreviousView({
          center: map.center,
          zoom: map.zoom,
          bounds: map.bounds
        });
        
        // Fly to the entry location without opening drawer
        setUserInitiatedFlyTo(true);
        
        // Set up moveend handler for when flyTo completes
        const handleMoveEnd = () => {
          setIsSearchAnimating(false);
          setUserInitiatedFlyTo(false);
          setFocusedWaypointId(entryId);
          setPrioritizedEntryId(entryId);
          setHasEverSearched(true);
          // Set search params only after flyTo completes
          setSearch((prev) => ({ ...prev, query, context: 'entry' }));
          setParams({ search: query });
          map.mapbox?.off('moveend', handleMoveEnd);
        };
        
        map.mapbox?.on('moveend', handleMoveEnd);
        map.mapbox.flyTo({
          center: [item.lon, item.lat],
          zoom: 14,
          speed: 1.2,
          padding: screen.mobile ? { left: 0, top: 50, right: 0, bottom: 50 } : { left: 150, top: 50, right: 50, bottom: 50 }
        });
      } else {
        // Fallback - just set search and open drawer
        setIsSearchAnimating(false); // End animation immediately
        setHasEverSearched(true);
        setSearch((prev) => ({ ...prev, query, context: 'entry' }));
        setParams({ search: query });
        map.handleDrawerOpen();
        setParams({ entry_id: entryId });
      }
    }
  };

  const handleTripClick = (tripId: string) => {
    if (!tripId) return;

    // Set transitioning state to manage visual feedback
    setJourneyTransitioning(true);

    // Clear ALL map query cache entries to prevent stale data when switching journeys
    queryClient.removeQueries({ 
      queryKey: [API_QUERY_KEYS.MAP.QUERY] 
    });

    // Close entry drawer if it's open
    map.handleDrawerClose();

    setParams({
      context: MAP_CONTEXT_PARAMS.JOURNEY,
      filter: MAP_FILTER_PARAMS.POST,
      journey_id: tripId,
      entry_id: null,
    });
  };

  const handleUserClick = (username: string) => {
    if (!username) return;

    setParams({
      context: MAP_CONTEXT_PARAMS.USER,
      filter: MAP_FILTER_PARAMS.POST,
      user: username,
      // Don't clear entry_id to preserve open drawer
    });
  };

  const handleUserBack = () => {
    setParams({
      context: MAP_CONTEXT_PARAMS.GLOBAL,
      filter: MAP_FILTER_PARAMS.POST,
      user: null,
      // Don't clear entry_id to preserve open drawer
    });
  };

  const handleTripBack = () => {
    if (userId) {
      // Clear ALL map query cache entries when going back from journey to prevent stale data
      queryClient.removeQueries({ 
        queryKey: [API_QUERY_KEYS.MAP.QUERY] 
      });
      
      setParams({
        context: MAP_CONTEXT_PARAMS.USER,
        filter: MAP_FILTER_PARAMS.JOURNEY,
        user: userId,
        journey_id: null,
        entry_id: null,
      });
    }
  };

  // update waypoints
  useEffect(() => {
    if (mapQuery.data?.waypoints) {
      const waypoints = mapQuery.data.waypoints;
      // Sort waypoints by date for proper line drawing in journey context
      const sortedWaypoints = contexts.journey 
        ? [...waypoints].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : waypoints;
      setWaypoints(sortedWaypoints);
      
      // For user searches, trigger flyTo animation after waypoints are loaded
      if (contexts.user && search.context === 'user' && !isSearchAnimating && !userFlyToCompleted && waypoints.length > 0) {
        setIsSearchAnimating(true);
      }
    }
  }, [mapQuery.data?.waypoints, contexts.journey, contexts.user, contexts.map, tripId, userId]);

  // Fit map bounds when journey waypoints are loaded
  useEffect(() => {
    if (contexts.journey && waypoints.length > 0 && map.loaded && map.mapbox && !mapQuery.isLoading) {
      // Small delay to ensure DOM is ready and map is stable
      setTimeout(() => {
        fitJourneyBounds();
      }, 200);
    }
  }, [contexts.journey, waypoints, map.loaded, mapQuery.isLoading, tripId]);

  useEffect(() => {
    // open post sidebar
    if (params.entry_id) {
      map.handleDrawerOpen();
    }
  }, []);

  // Reset state when changing journeys or contexts
  useEffect(() => {
    setFocusedWaypointId(null);
    setPreviousView(null);
    setUserInitiatedFlyTo(false);
    
    // Reset transitioning state when journey changes
    if (journeyTransitioning && tripId) {
      setTimeout(() => setJourneyTransitioning(false), 500);
    }
  }, [tripId, context, userId, journeyTransitioning]);

  // Clear waypoints only when switching between different journeys
  useEffect(() => {
    if (contexts.journey) {
      setWaypoints([]);
    }
  }, [tripId]); // Only clear when tripId changes, not on every context change


  // Force refetch when query becomes enabled after page load
  useEffect(() => {
    if (queryEnabled && mapQuery.isStale) {
      mapQuery.refetch();
    }
  }, [queryEnabled]);

  // Track sidebar state changes to prevent overlay from hiding during sidebar toggle
  const prevSidebarCollapsed = useRef(sidebarCollapsed);
  useEffect(() => {
    // Only set the flag if sidebar state actually changed (not on initial mount)
    if (prevSidebarCollapsed.current !== sidebarCollapsed) {
      sidebarResizingRef.current = true;
      const timer = setTimeout(() => {
        sidebarResizingRef.current = false;
      }, 500); // Wait for sidebar animation and map resize to complete

      prevSidebarCollapsed.current = sidebarCollapsed;
      return () => clearTimeout(timer);
    }
  }, [sidebarCollapsed]);

  // Mark map as initialized after initial load to distinguish user moves from initial moves
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInitializedRef.current = true;
    }, 2000); // Wait for map to finish initial load and any automatic adjustments
    return () => clearTimeout(timer);
  }, []);

  // Fit bounds when user waypoints are loaded from search
  useEffect(() => {
    
    if (contexts.user && waypoints.length > 0 && map.mapbox && isSearchAnimating) {
      const coordinates = waypoints.map(wp => [wp.lon, wp.lat]);
      const duration = 1500;
      
      if (coordinates.length === 1) {
        // Single point - center map on it
        map.mapbox.flyTo({
          center: [waypoints[0].lon, waypoints[0].lat],
          zoom: 14,
          speed: 1.2
        });
      } else if (coordinates.length > 1) {
        // Multiple points - fit bounds to include all points
        const lats = coordinates.map(coord => coord[1]);
        const lons = coordinates.map(coord => coord[0]);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        
        // Add padding to bounds
        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;
        const latPadding = Math.max(latRange * 0.1, 0.01);
        const lonPadding = Math.max(lonRange * 0.1, 0.01);
        
        map.mapbox.fitBounds(
          [minLon - lonPadding, minLat - latPadding, maxLon + lonPadding, maxLat + latPadding],
          {
            speed: 1.2,
            padding: 40,
            maxZoom: 15
          }
        );
      }
      
      // Set up moveend handler for when animation completes
      const handleMoveEnd = () => {
        setIsSearchAnimating(false);
        setUserFlyToCompleted(true);
        map.mapbox?.off('moveend', handleMoveEnd);
      };
      
      map.mapbox?.on('moveend', handleMoveEnd);
    }
  }, [contexts.user, waypoints, map.mapbox, isSearchAnimating]);

  // Check if overlay should be visible
  const overlayVisible = contexts.map && !search.query && !hasEverSearched && !isGeolocateAnimating && !isSearchAnimating;

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-gray-50">
      {/* Search-first overlay - show when no interaction has occurred and no search is active */}
      {overlayVisible && (
        <div className="absolute inset-0 z-[60] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6 -mt-32">
            <h2 className="text-2xl font-medium text-gray-800 dark:text-white mb-2">
              Your Journey Begins Here...
            </h2>
            <p className="text-gray-600 dark:text-gray-200 mb-8">
              Geolocate, search for places, entries, or explorers
            </p>
            <div className="w-full max-w-sm mx-auto flex gap-2 items-center">
              <div className="flex-1">
                <MapSearchbar
                  value={search.value}
                  query={search.query}
                  onChange={handleSearchChange}
                  onClear={handleSearchClear}
                  onSubmit={handleSearchSubmit}
                />
              </div>
              <button
                onClick={handleGeolocate}
                className="flex items-center justify-center bg-white dark:bg-gray-800 border border-input dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{ width: '37px', height: '37px' }}
                title="Use my location"
              >
                <Crosshair size={16} weight="regular" className="text-gray-600 dark:text-gray-200" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hide MapViewSwitch on mobile when overlay is visible */}
      {!(overlayVisible && screen.mobile) && (
        <MapViewSwitch view={view} onToggle={handleViewToggle} />
      )}
      <MapSidebar opened={isGeolocateAnimating || isSearchAnimating || !(contexts.map && !search.query && !hasEverSearched)} view={view}>
        <div className="relative flex flex-col w-full h-full">
          {contexts.map && (
            <>
              <div className="flex flex-row justify-between items-center py-4 px-4 desktop:px-6 bg-gray-50">
                <div className="w-full flex flex-col">
                  {!screen.mobile && focusedWaypointId && previousView && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToOverview}
                        className="flex items-center gap-2 text-sm"
                      >
                        <ArrowLeft size={16} />
                        Reset Map
                      </Button>
                    </div>
                  )}
                  <div className={cn('mt-4 w-full')}>
                    <MapSearchbar
                      value={search.value}
                      query={search.query}
                      onChange={handleSearchChange}
                      onClear={handleSearchClear}
                      onSubmit={handleSearchSubmit}
                    />
                  </div>
                </div>
              </div>
              {session.logged && (
                <div className="px-4 desktop:px-6 py-2 bg-gray-50">
                  <ChipGroup
                    value={params.context as string}
                    items={[
                      {
                        value: MAP_CONTEXT_PARAMS.GLOBAL,
                        label: LOCALES.APP.MAP.FILTER.GLOBAL,
                      },
                      {
                        value: MAP_CONTEXT_PARAMS.FOLLOWING,
                        label: LOCALES.APP.MAP.FILTER.FOLLOWING,
                      },
                    ]}
                    classNames={{
                      chip: 'w-auto min-w-[0px] h-[30px] py-0 px-4 desktop:px-6 rounded-full',
                    }}
                    onSelect={handleContextChange}
                  />
                </div>
              )}
            </>
          )}
          {contexts.user && (
            <div className="flex flex-col pt-4 pb-2 px-6 bg-gray-50">
              <div className="flex flex-col justify-start items-start gap-3">
                <UserProfileCard
                  name={user?.username}
                  picture={user?.picture}
                  username={user?.username}
                  creator={user?.creator}
                  loading={userQuery.isLoading}
                  backButton={{
                    click: handleUserBack,
                  }}
                />
                <div className="flex flex-row items-center justify-between w-full">
                  <ChipGroup
                    value={filter}
                    items={[
                      {
                        value: MAP_FILTER_PARAMS.POST,
                        label: LOCALES.APP.MAP.FILTER.POSTS,
                      },
                      {
                        value: MAP_FILTER_PARAMS.JOURNEY,
                        label: LOCALES.APP.MAP.FILTER.JOURNEYS,
                      },
                    ]}
                    classNames={{
                      chip: 'w-auto min-w-[0px] h-[30px] py-0 px-4 desktop:px-6 rounded-full',
                    }}
                    onSelect={handleFilterChange}
                  />
                  {!screen.mobile && focusedWaypointId && previousView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToOverview}
                      className="flex items-center gap-2 text-sm"
                    >
                      <ArrowLeft size={16} />
                      Reset Map
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          {contexts.journey && (
            <div className="sticky top-0 left-0 right-0 w-full">
              <div className="flex flex-col">
                <MapTripCard
                  title={trip?.title || ''}
                  startDate={trip?.startDate}
                  endDate={trip?.endDate}
                  loading={tripLoading}
                  onBack={handleTripBack}
                  author={trip?.author}
                  centered={true}
                />
                {!screen.mobile && focusedWaypointId && previousView && (
                  <div className="flex justify-end px-4 pb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToOverview}
                      className="flex items-center gap-2 text-sm"
                    >
                      <ArrowLeft size={16} />
                      Reset Map
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="w-full h-auto flex flex-col gap-2 overflow-y-scroll no-scrollbar px-4 desktop:px-6 py-4 pb-8 box-border bg-gray-50">
            {((contexts.map && filters.post) ||
              (contexts.user && filters.post) ||
              (contexts.journey && filters.post)) && (
              <>
                {mapLoading ? (
                  <LoadingSpinner />
                ) : mapResults >= 1 ? (
                  waypoints.map(({ date, post, waypoint }, key) => {
                    if (post) {
                      // Render entry cards (clickable) - in journey context, show as entries
                      return (
                        <PostCard
                          key={key}
                          {...post}
                          id={post.id}
                          date={date}
                          place={post.place}
                          sponsored={post.sponsored}
                          media={post.media}
                          actions={{ like: false, bookmark: false, edit: false }}
                          userbar={
                            // Only show userbar in non-journey contexts
                            !contexts.journey && post?.author
                              ? {
                                  click: contexts.user 
                                    ? () => handlePostClick(post.id)
                                    : () => handleUserClick(post?.author?.username),
                                }
                              : undefined
                          }
                          selected={isPostSelected(post.id) || focusedWaypointId === post.id}
                          onClick={() => handlePostClick(post.id)}
                          onHover={!screen.mobile ? () => handlePostHover(post.id) : undefined}
                          onUnhover={!screen.mobile ? handlePostUnhover : undefined}
                          isEntry={contexts.journey} // Show entry indicator only in journey context
                          trip={!contexts.journey ? post.trip : undefined}
                        />
                      );
                    } else if (waypoint) {
                      // Render waypoint cards (non-clickable, simplified)
                      return (
                        <PostCard
                          key={key}
                          id={waypoint.id.toString()}
                          title={waypoint.title}
                          content=""
                          date={date}
                          actions={{ like: false, bookmark: false, edit: false }}
                          // No author/userbar for waypoints - show type indicator instead
                          isWaypoint={true}
                          // No onClick handler (non-clickable)
                          // No hover handlers
                        />
                      );
                    }
                    return null;
                  }).filter(Boolean)
                ) : (
                  <div className="text-center text-gray-600 py-8 px-4">
                    <p>Looks like there are no journal entries in this area.</p>
                    <p>Be the first to document your adventures here!</p>
                  </div>
                )}
              </>
            )}
            {contexts.user && filters.journey && (
              <>
                {tripsLoading ? (
                  <LoadingSpinner />
                ) : tripsResults ? (
                  trips.map(
                    ({ id, title, startDate, endDate, author }, key) => (
                      <TripCard
                        key={key}
                        variant="public"
                        id={id}
                        title={title}
                        startDate={startDate}
                        endDate={endDate}
                        waypoints={[]}
                        author={author}
                        userbar={false}
                        onClick={() => handleTripClick(id)}
                      />
                    ),
                  )
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    No journeys found
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </MapSidebar>

      <MapDrawer
        opened={map.drawer}
        loading={postLoading}
        post={post}
        mobile={screen.mobile}
        sidebarCollapsed={sidebarCollapsed}
        onClose={handlePostDrawerClose}
      />

      <MapViewContainer
        extended={!map.sidebar}
      >
        <div className="z-10 relative !w-full h-full overflow-hidden">
          {/* Hide mobile search bar when overlay is visible */}
          {!(overlayVisible && screen.mobile) && (
            <div className="absolute top-0 left-0 right-0 z-20 w-full h-[70px] flex justify-between box-border px-10 items-center desktop:hidden">
              <MapSearchbar
                value={search.value}
                query={search.query}
                onClear={handleSearchClear}
                onChange={handleSearchChange}
                onSubmit={handleSearchSubmit}
              />
            </div>
          )}
          {mapbox.token && (
            <Map
              token={mapbox.token}
              center={map.center}
              bounds={map.bounds}
              zoom={map.zoom}
              minZoom={1}
              maxZoom={15}
              hoveredPostId={hoveredPostId}
              layers={
                contexts.journey && filters.post
                  ? [
                      {
                        id: MAP_LAYERS.WAYPOINT_LINES,
                        source: MAP_SOURCES.WAYPOINT_LINES,
                      },
                      {
                        id: MAP_LAYERS.WAYPOINTS,
                        source: MAP_SOURCES.WAYPOINTS,
                      },
                      {
                        id: MAP_LAYERS.WAYPOINT_ORDER_NUMBERS,
                        source: MAP_SOURCES.WAYPOINTS,
                      },
                    ]
                  : (contexts.map || contexts.user) && filters.post
                    ? [
                        {
                          id: MAP_LAYERS.WAYPOINTS,
                          source: MAP_SOURCES.WAYPOINTS,
                        },
                        {
                          id: MAP_LAYERS.CLUSTERS,
                          source: MAP_SOURCES.WAYPOINTS,
                        },
                        {
                          id: MAP_LAYERS.CLUSTER_COUNT,
                          source: MAP_SOURCES.WAYPOINTS,
                        },
                      ]
                    : []
              }
              sources={
                contexts.journey && filters.post
                  ? (() => {
                      return [
                        {
                          sourceId: MAP_SOURCES.WAYPOINTS,
                          type: 'point',
                          data: waypoints.map(({ lat, lon, post, waypoint }, key) => ({
                            id: key,
                            lat,
                            lon,
                            properties: post
                              ? {
                                  id: post.id,
                                  title: post.title,
                                  content: post.content,
                                  date: post?.date || new Date(),
                                  username: post.author.username,
                                  type: 'entry',
                                }
                              : waypoint
                              ? {
                                  id: waypoint.id.toString(),
                                  title: waypoint.title,
                                  date: waypoint.date,
                                  type: 'waypoint',
                                }
                              : {},
                          })),
                          config: {
                            cluster: false, // Never cluster in journey context to show all waypoints
                          },
                        },
                        {
                          sourceId: MAP_SOURCES.WAYPOINT_LINES,
                          type: 'line',
                          data: waypoints.map(({ lat, lon }, key) => ({
                            id: key,
                            lat,
                            lon,
                            properties: {},
                          })),
                        },
                      ];
                    })()
                  
                  : (contexts.map || contexts.user) && filters.post
                    ? [
                        {
                          sourceId: MAP_SOURCES.WAYPOINTS,
                          type: 'point',
                          data: waypoints
                            .filter(({ post }) => post) // Only show entries in non-journey contexts
                            .map(({ lat, lon, post }, key) => ({
                              id: key,
                              lat,
                              lon,
                              properties: post
                                ? {
                                    id: post.id,
                                    title: post.title,
                                    content: post.content,
                                    date: post?.date || new Date(),
                                    username: post.author.username,
                                    type: 'entry',
                                  }
                                : {},
                            })),
                          config: {
                            cluster: showClusters,
                          },
                        },
                      ]
                    : []
              }
              onSourceClick={(sourceId, feature) => {
                handleMapMarkerClick(sourceId, feature);
              }}
              onLoad={map.handleLoad}
              onMove={handleMapMove}
            />
          )}
        </div>
      </MapViewContainer>
    </div>
  );
};
