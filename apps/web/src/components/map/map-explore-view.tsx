'use client';

import { MapSearchbar, MapSearchbarSubmitHandler } from '../search';
import { MapQueryContext, MapQueryFilterParam } from '@repo/types';
import { Button, ChipGroup, LoadingSpinner } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
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
  post?: {
    id: string;
    title: string;
    content: string;
    bookmarked: boolean;
    date?: Date;
    author: {
      username: string;
      name: string;
      picture: string;
      creator?: boolean;
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

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

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
          map.bounds
            ? [
                map.bounds.ne.lat,
                map.bounds.ne.lon,
                map.bounds.sw.lat,
                map.bounds.sw.lon,
              ].join(':')
            : 'no_bounds',
          search.query || 'search',
        ]
      : [
          API_QUERY_KEYS.MAP.QUERY,
          context,
          map.bounds
            ? [
                map.bounds.ne.lat,
                map.bounds.ne.lon,
                map.bounds.sw.lat,
                map.bounds.sw.lon,
              ].join(':')
            : 'no_bounds',
          search.query || 'search',
        ],
    queryFn: async () =>
      apiClient
        .mapQuery({
          context: context,
          username:
            context === MAP_CONTEXT_PARAMS.USER
              ? userId
                ? userId
                : undefined
              : undefined,
          location: { bounds: map.bounds },
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
        .then(({ data }) => data),
    enabled:
      map.loaded &&
      !!map.bounds &&
      [
        MAP_CONTEXT_PARAMS.GLOBAL,
        MAP_CONTEXT_PARAMS.FOLLOWING,
        MAP_CONTEXT_PARAMS.USER,
        MAP_CONTEXT_PARAMS.JOURNEY,
      ].some((ctx) => ctx === context),
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
    enabled: !!tripId && context === MAP_FILTER_PARAMS.JOURNEY,
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

  const handlePostDrawerOpen = (postId: string) => {
    map.handleDrawerOpen();
    setParams({ entry_id: postId });
  };

  const handlePostDrawerClose = () => {
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
    if (mapQuery.isFetched) {
      const waypoints = mapQuery.data?.waypoints || [];
      setWaypoints(waypoints);
    }
  }, [mapQuery]);

  useEffect(() => {
    // open post sidebar
    if (params.entry_id) {
      map.handleDrawerOpen();
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-white">
      <MapViewSwitch view={map.view} onToggle={map.handleViewToggle} />
      <MapSidebar opened={map.sidebar} view={map.view}>
        <div className="relative flex flex-col w-full h-full">
          {contexts.map && (
            <>
              <div className="flex flex-row justify-between items-center py-4 px-4 desktop:px-6 bg-white">
                <div className="w-full flex flex-col">
                  <div>
                    <span className="text-xl font-medium">Explore</span>
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
                  name={user?.name}
                  picture={user?.picture}
                  username={user?.username}
                  loading={userQuery.isLoading}
                  backButton={{
                    click: handleUserBack,
                  }}
                />
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
              </div>
            </div>
          )}
          {contexts.journey && (
            <div className="sticky top-0 left-0 right-0 w-full">
              <MapTripCard
                title={trip?.title || ''}
                startDate={trip?.startDate}
                endDate={trip?.endDate}
                loading={tripLoading}
                onBack={handleTripBack}
              />
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
                  waypoints.map(({ date, post }, key) =>
                    post ? (
                      <PostCard
                        key={key}
                        {...post}
                        id={post.id}
                        date={date}
                        actions={{ like: false, bookmark: true, edit: false }}
                        userbar={
                          post?.author
                            ? {
                                click: () =>
                                  handleUserClick(post?.author?.username),
                              }
                            : undefined
                        }
                        selected={isPostSelected(post.id)}
                        onClick={() => handlePostDrawerOpen(post.id)}
                      />
                    ) : (
                      <></>
                    ),
                  )
                ) : (
                  <>no posts found</>
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
                  ? [
                      {
                        sourceId: MAP_SOURCES.WAYPOINTS,
                        type: 'point',
                        data: waypoints.map(({ lat, lon, post }, key) => ({
                          id: key,
                          lat,
                          lon,
                          properties: post
                            ? {
                                id: post.id,
                                title: post.title,
                                content: post.content,
                                date: post?.date || new Date(),
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
                    ]
                  : (contexts.map || contexts.user) && filters.post
                    ? [
                        {
                          sourceId: MAP_SOURCES.WAYPOINTS,
                          type: 'point',
                          data: waypoints.map(({ lat, lon, post }, key) => ({
                            id: key,
                            lat,
                            lon,
                            properties: post
                              ? {
                                  id: post.id,
                                  title: post.title,
                                  content: post.content,
                                  date: post?.date || new Date(),
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
                handlePostDrawerOpen(sourceId);
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
