'use client';

import { MapSearchbar, MapSearchbarSubmitHandler } from '../search';
import { MapQueryContext, MapQueryFilterParam } from '@repo/types';
import { Button, ChipGroup, LoadingSpinner } from '@repo/ui/components';
import { ArrowLeft } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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
    bookmarked: boolean;
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

  const { params, setParams } = useAppParams({
    context: MAP_CONTEXT_PARAMS.GLOBAL,
    filter: MAP_FILTER_PARAMS.POST,
    lon: APP_CONFIG.MAP.DEFAULT.CENTER.LON.toString(),
    lat: APP_CONFIG.MAP.DEFAULT.CENTER.LAT.toString(),
    zoom: APP_CONFIG.MAP.DEFAULT.ZOOM.toString(),
  });

  const filter = params.filter as MapQueryFilterParam;
  const context = params.context as MapQueryContext;
  const userId = params.user as string;
  const postId = params.entry_id as string;
  const tripId = params.journey_id as string;

  const map = useMap({
    sidebar: true,
    context: params.context || MAP_CONTEXT_PARAMS.GLOBAL,
    filter: params.filter || MAP_FILTER_PARAMS.POST,
    center:
      params.lat && params.lon
        ? {
            lat: parseFloat(params.lat),
            lon: parseFloat(params.lon),
          }
        : undefined,
    zoom: params.zoom ? parseFloat(params.zoom) : APP_CONFIG.MAP.DEFAULT.ZOOM,
  });

  const [view, setView] = useState<string>(MAP_VIEW_PARAMS.MAP);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [focusedWaypointId, setFocusedWaypointId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<{
    center: { lat: number; lon: number };
    zoom: number;
    bounds?: { sw: { lat: number; lon: number }; ne: { lat: number; lon: number } };
  } | null>(null);
  const [userInitiatedFlyTo, setUserInitiatedFlyTo] = useState<boolean>(false);
  const [journeyTransitioning, setJourneyTransitioning] = useState<boolean>(false);

  const [search, setSearch] = useState<{
    value?: string;
    context: 'text' | 'location';
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
        ],
    queryFn: async () => {
      return apiClient
        .mapQuery({
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
          search:
            search.context === 'text'
              ? search.query
                ? search.query
                : undefined
              : undefined,
        })
        .then(({ data }) => data);
    },
    enabled:
      map.loaded &&
      [
        MAP_CONTEXT_PARAMS.GLOBAL,
        MAP_CONTEXT_PARAMS.FOLLOWING,
        MAP_CONTEXT_PARAMS.USER,
        MAP_CONTEXT_PARAMS.JOURNEY,
      ].some((ctx) => ctx === context) &&
      // For journey context, only need tripId; for others, need bounds
      (contexts.journey ? !!tripId : !!map.bounds),
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

  const mapLoading = mapQuery.isPending || mapQuery.isLoading;
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
    setParams({
      lat: `${lat}`,
      lon: `${lon}`,
      zoom: `${zoom}`,
    });
  };

  const handlePostClick = (postId: string) => {
    if (screen.mobile) {
      // On mobile, always open the full entry card directly
      map.handleDrawerOpen();
      setParams({ entry_id: postId });
    } else {
      // On desktop, use the two-click system
      if (focusedWaypointId === postId) {
        // Second click - open the full entry card
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
            const duration = contexts.journey ? 2000 : 1000; // Slower in journey context
            map.mapbox.flyTo({
              center: [waypoint.lon, waypoint.lat],
              zoom: 14,
              duration: duration
            });
            // Reset flag after animation completes with extra buffer
            setTimeout(() => setUserInitiatedFlyTo(false), duration + 1000);
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

  const handleMapMarkerClick = (postId: string) => {
    // Map marker clicks always open the full entry immediately
    map.handleDrawerOpen();
    setParams({ entry_id: postId });
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
        duration: duration
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
          duration: duration,
          padding: 40, // Increased padding for better visibility
          maxZoom: 15, // Prevent zooming in too much on close points
          linear: false // Use easing for smoother animation
        }
      );
    }
  };

  const handleBackToOverview = () => {
    if (contexts.journey) {
      // In journey context, fit bounds to show all waypoints
      fitJourneyBounds();
    } else if (previousView && map.mapbox) {
      // In other contexts, return to previous view state
      const duration = 1000;
      if (previousView.bounds) {
        // Fly back to previous bounds
        map.mapbox.fitBounds(
          [previousView.bounds.sw.lon, previousView.bounds.sw.lat, previousView.bounds.ne.lon, previousView.bounds.ne.lat],
          {
            duration: duration,
            padding: 20
          }
        );
      } else {
        // Fly back to previous center and zoom
        map.mapbox.flyTo({
          center: [previousView.center.lon, previousView.center.lat],
          zoom: previousView.zoom,
          duration: duration
        });
      }
    }
    
    setFocusedWaypointId(null);
    setPreviousView(null);
    
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
    setSearch((prev) => ({ ...prev, value: '', query: null }));
    setParams({ search: null });
  };

  const handleSearchSubmit: MapSearchbarSubmitHandler = (data) => {
    const { context, item } = data;
    const query = item.name;

    if (context === 'text') {
      setSearch((prev) => ({ ...prev, query, context: 'text' }));
      setParams({ search: query });
    }

    if (context === 'location') {
      setSearch((prev) => ({ ...prev, query, context: 'location' }));

      // update map
      if (item.bounds) {
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

        if (query && lon && lat) {
          setParams({ search: query, lon: `${lon}`, lat: `${lat}` });
        }

        map.updateBounds(bbox);
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
      entry_id: null,
    });
  };

  const handleUserBack = () => {
    setParams({
      context: MAP_CONTEXT_PARAMS.GLOBAL,
      filter: MAP_FILTER_PARAMS.POST,
      user: null,
      entry_id: null,
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
    
    // Clear waypoints immediately when switching journeys to prevent flashing lines
    if (contexts.journey) {
      setWaypoints([]);
    }
    
    // Reset transitioning state when journey changes
    if (journeyTransitioning && tripId) {
      setTimeout(() => setJourneyTransitioning(false), 500);
    }
  }, [tripId, context, userId, contexts.journey, journeyTransitioning]);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-white">
      <MapViewSwitch view={view} onToggle={handleViewToggle} />
      <MapSidebar opened={map.sidebar} view={view}>
        <div className="relative flex flex-col w-full h-full">
          {contexts.map && (
            <>
              <div className="flex flex-row justify-between items-center py-4 px-4 desktop:px-6 bg-white">
                <div className="w-full flex flex-col">
                  <div className="flex flex-row items-center justify-between">
                    <span className="text-xl font-medium">Explore</span>
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
                <div className="px-4 desktop:px-6 py-2">
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
            <div className="flex flex-col pt-4 pb-2 px-6">
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
          <div className="w-full h-auto flex flex-col gap-2 overflow-y-scroll no-scrollbar px-4 desktop:px-6 py-4 box-border">
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
                          actions={{ like: false, bookmark: true, edit: false }}
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
                  <>no entries found</>
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
                  <>no journeys found</>
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
        onClose={handlePostDrawerClose}
      />

      <MapViewContainer
        extended={!map.sidebar}
        onExtend={map.handleSidebarToggle}
      >
        <div className="z-10 relative !w-full h-full overflow-hidden">
          <div className="absolute top-0 left-0 right-0 z-20 w-full h-[70px] flex justify-between box-border px-10 items-center desktop:hidden">
            <MapSearchbar
              value={search.value}
              query={search.query}
              onClear={handleSearchClear}
              onChange={handleSearchChange}
              onSubmit={handleSearchSubmit}
            />
          </div>
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
                            cluster: showClusters,
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
              onSourceClick={(sourceId) => {
                handleMapMarkerClick(sourceId);
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
