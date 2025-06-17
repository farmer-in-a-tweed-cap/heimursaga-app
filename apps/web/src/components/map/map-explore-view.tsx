'use client';

import { MapSearchbar, MapSearchbarSubmitHandler } from '../search';
import { ChipGroup, LoadingSpinner } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import {
  CloseButton,
  MAP_LAYERS,
  MAP_SOURCES,
  Map,
  MapDrawer,
  MapSidebar,
  MapViewContainer,
  MapViewSwitch,
  PostCard,
  TripCard,
  UserBar,
  UserProfileCard,
} from '@/components';
import { APP_CONFIG } from '@/config';
import {
  MAP_CONTEXT_PARAMS,
  MAP_FILTER_PARAMS,
  useAppParams,
  useMap,
  useMapbox,
  useScreen,
  useSession,
} from '@/hooks';
import { dateformat, getEnv, sleep } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

const MAP_CHANGE_DEBOUNCE_INTERVAL = 500;

type Waypoint = {
  lat: number;
  lon: number;
  date: Date;
  post?: {
    id: string;
    title: string;
    content: string;
    bookmarked: boolean;
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

  const { params, updateParams } = useAppParams({
    context: MAP_CONTEXT_PARAMS.GLOBAL,
    lon: APP_CONFIG.MAP.DEFAULT.CENTER.LON.toString(),
    lat: APP_CONFIG.MAP.DEFAULT.CENTER.LAT.toString(),
    zoom: APP_CONFIG.MAP.DEFAULT.ZOOM.toString(),
  });

  const map = useMap(
    {
      sidebar: true,
      context: params.context
        ? params.context
        : params.user
          ? MAP_CONTEXT_PARAMS.USER
          : MAP_CONTEXT_PARAMS.GLOBAL,
      filter: params.filter || MAP_FILTER_PARAMS.POST,
      center:
        params.lat && params.lon
          ? {
              lat: parseFloat(params.lat),
              lon: parseFloat(params.lon),
            }
          : undefined,
      zoom: params.zoom ? parseFloat(params.zoom) : APP_CONFIG.MAP.DEFAULT.ZOOM,
    },
    { updateSearchParams: true },
  );

  const [search, setSearch] = useState<{
    query?: string;
    context: 'text' | 'location';
    loading: boolean;
  }>({
    context: 'text',
    loading: false,
    query: params.search || undefined,
  });

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [userId, setUserId] = useState<string | null>(params.user || null);
  const [postId, setPostId] = useState<string | null>(params.entry_id || null);

  const mapQuery = useQuery({
    queryKey: userId
      ? [
          QUERY_KEYS.MAP.QUERY,
          userId,
          map.context,
          map.bounds
            ? [
                map.bounds.ne.lat,
                map.bounds.ne.lon,
                map.bounds.sw.lat,
                map.bounds.sw.lon,
              ].join(':')
            : 'no_bounds',
        ]
      : [
          QUERY_KEYS.MAP.QUERY,
          map.context,
          map.bounds
            ? [
                map.bounds.ne.lat,
                map.bounds.ne.lon,
                map.bounds.sw.lat,
                map.bounds.sw.lon,
              ].join(':')
            : 'no_bounds',
        ],
    queryFn: async () =>
      apiClient
        .mapQuery({
          context: map.context,
          username:
            map.context === MAP_CONTEXT_PARAMS.USER
              ? (userId as string)
              : undefined,
          location: { bounds: map.bounds },
        })
        .then(({ data }) => data),
    enabled: map.loaded && !!map.bounds,
    retry: 0,
  });

  const userQuery = useQuery({
    queryKey: [QUERY_KEYS.USERS, userId],
    queryFn: async () =>
      apiClient
        .getUserByUsername({ username: userId as string })
        .then(({ data }) => data),
    enabled: !!userId,
    retry: 0,
  });

  const postQuery = useQuery({
    queryKey: [QUERY_KEYS.POSTS, postId],
    queryFn: async () =>
      apiClient
        .getPostById({ query: { id: postId as string } })
        .then(({ data }) => data),
    enabled: !!postId,
  });

  const tripQuery = useQuery({
    queryKey: [QUERY_KEYS.TRIPS, userId],
    queryFn: async () =>
      apiClient
        .getTripsByUsername({ username: userId as string })
        .then(({ data }) => data),
    enabled: !!userId && map.filter === MAP_FILTER_PARAMS.JOURNEY,
  });

  const post = postQuery?.data;
  const postLoading = postQuery.isLoading;

  const user = userQuery.data;

  const waypointLoading = mapQuery.isPending || mapQuery.isLoading;
  const waypointResults = mapQuery.data?.results || 0;

  const isPostSelected = (id: string): boolean =>
    postId ? postId === id : false;

  const handlePostDrawerOpen = ({ postId }: { postId: string }) => {
    map.handleDrawerOpen();
    setPostId(postId);
    updateParams({ entry_id: postId });
  };

  const handlePostDrawerClose = () => {
    map.handleDrawerClose();
    setPostId(null);
    updateParams({ entry_id: null });
  };

  const handleContextChange = (context: string) =>
    map.handleContextChange(context, () => {
      updateParams({ context });
      mapQuery.refetch();
    });

  const handleFilterChange = (filter: string) =>
    map.handleFilterChange(filter, () => {
      updateParams({ filter });
      mapQuery.refetch();
    });

  const handleSearchChange = (value: string) => {
    if (value) {
      setSearch((prev) => ({ ...prev, query: value }));
    }
  };

  const handleSearchSubmit: MapSearchbarSubmitHandler = (data) => {
    const { context, item } = data;
    const query = item.name;

    if (context === 'text') {
      setSearch((prev) => ({ ...prev, query, context: 'text' }));
      updateParams({ search: query });
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
          updateParams({ search: query, lon: `${lon}`, lat: `${lat}` });
        }

        map.updateBounds(bbox);
      }
    }
  };

  const handleUserClick = (username: string) => {
    if (!username) return;

    setUserId(username);
    map.setContext(MAP_CONTEXT_PARAMS.USER);

    updateParams({
      context: MAP_CONTEXT_PARAMS.USER,
      user: username,
    });

    mapQuery.refetch();
  };

  const handleUserBack = () => {
    setUserId(null);
    map.setContext(MAP_CONTEXT_PARAMS.GLOBAL);

    updateParams({
      context: MAP_CONTEXT_PARAMS.GLOBAL,
      user: null,
      filter: null,
    });

    mapQuery.refetch();
  };

  // update waypoints
  useEffect(() => {
    if (mapQuery.isFetched) {
      const waypoints = mapQuery.data?.waypoints || [];
      setWaypoints(waypoints);
    }
  }, [mapQuery]);

  useEffect(() => {
    // set default context
    if (params.user) {
      map.setContext(MAP_CONTEXT_PARAMS.USER);
      updateParams({ context: MAP_CONTEXT_PARAMS.USER });
      setUserId(params.user);
    } else {
      if (!params.context) {
        map.setContext(MAP_CONTEXT_PARAMS.GLOBAL);
        updateParams({ context: MAP_CONTEXT_PARAMS.GLOBAL });
      }
    }

    // set default post id
    if (params.entry_id) {
      setPostId(postId);
      map.handleDrawerOpen();
    }
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-white">
      <MapViewSwitch view={map.view} onToggle={map.handleViewToggle} />
      <MapSidebar opened={map.sidebar} view={map.view}>
        {/* {JSON.stringify({
          c: map.center,
          loaded: map.loaded,
          z: map.zoom,
          p: params,
        })} */}
        <div className="relative flex flex-col w-full h-full">
          {[MAP_CONTEXT_PARAMS.GLOBAL, MAP_CONTEXT_PARAMS.FOLLOWING].some(
            (context) => context === map.context,
          ) && (
            <>
              <div className="flex flex-row justify-between items-center py-4 px-4 desktop:px-6 bg-white">
                <div className="w-full flex flex-col">
                  <div>
                    <span className="text-xl font-medium">Explore</span>
                  </div>
                  <div className={cn('mt-4 w-full')}>
                    <MapSearchbar
                      value={search.query}
                      onChange={handleSearchChange}
                      onSubmit={handleSearchSubmit}
                    />
                  </div>
                </div>
              </div>
              {session.logged && (
                <div className="px-4 desktop:px-6 py-2">
                  <ChipGroup
                    value={map.context}
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
          {map.context === MAP_CONTEXT_PARAMS.USER && (
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
                  value={map.filter}
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
          <div className="w-full h-auto flex flex-col gap-2 overflow-y-scroll no-scrollbar px-4 desktop:px-6 py-4 box-border">
            {map.filter === MAP_FILTER_PARAMS.POST && (
              <>
                {waypointLoading ? (
                  <LoadingSpinner />
                ) : waypointResults >= 1 ? (
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
                        onClick={() =>
                          handlePostDrawerOpen({ postId: post.id })
                        }
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

            {map.filter === MAP_FILTER_PARAMS.JOURNEY && (
              <>
                {tripQuery.isLoading || tripQuery.isPending ? (
                  <LoadingSpinner />
                ) : (tripQuery.data?.results || 0) >= 1 ? (
                  (tripQuery.data?.data || []).map(
                    ({ id, title, startDate, endDate, author }, key) => (
                      <TripCard
                        key={key}
                        href={ROUTER.MAP.TRIPS.DETAIL(id)}
                        variant="public"
                        id={id}
                        title={title}
                        startDate={startDate}
                        endDate={endDate}
                        waypoints={[]}
                        author={author}
                        // date={date}
                        // actions={{ like: false, bookmark: true, edit: false }}
                        // userbar={
                        //   post?.author
                        //     ? {
                        //         click: () =>
                        //           handleUserClick(post?.author?.username),
                        //       }
                        //     : undefined
                        // }
                        // selected={isPostSelected(post.id)}
                        // onClick={() => handlePostOpen(post.id)}
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
              value={search.query}
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
              layers={[
                { id: MAP_LAYERS.WAYPOINTS, source: MAP_SOURCES.WAYPOINTS },
                { id: MAP_LAYERS.CLUSTERS, source: MAP_SOURCES.WAYPOINTS },
                { id: MAP_LAYERS.CLUSTER_COUNT, source: MAP_SOURCES.WAYPOINTS },
              ]}
              sources={[
                {
                  sourceId: MAP_SOURCES.WAYPOINTS,
                  type: 'point',
                  data: waypoints.map(({ lat, lon, post }, key) => ({
                    id: `${key}`,
                    lat,
                    lon,
                    properties: post
                      ? {
                          id: post.id,
                          title: post.title,
                          content: post.content,
                          // date: post.date,
                        }
                      : {},
                  })),
                  config: {
                    cluster: true,
                  },
                },
              ]}
              onSourceClick={(postId) => handlePostDrawerOpen({ postId })}
              onLoad={map.handleLoad}
              onMove={map.handleMove}
            />
          )}
        </div>
      </MapViewContainer>
    </div>
  );
};
