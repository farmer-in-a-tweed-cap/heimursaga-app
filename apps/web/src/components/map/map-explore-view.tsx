'use client';

import {
  MapSearchbar,
  MapSearchbarChangeHandler,
  MapSearchbarSubmitHandler,
  Searchbar,
} from '../search';
import { IPostDetail, MapQueryContext, UserRole } from '@repo/types';
import {
  Button,
  ChipGroup,
  LoadingSpinner,
  NormalizedText,
  Skeleton,
} from '@repo/ui/components';
import {
  CaretLineLeftIcon,
  CaretLineRightIcon,
  ListBulletsIcon,
  ListIcon,
  MapTrifoldIcon,
} from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import {
  CloseButton,
  MAP_LAYERS,
  MAP_SOURCES,
  Map,
  MapOnLoadHandler,
  MapOnMoveHandler,
  MapOnSourceClickHandler,
  MapPostDrawer,
  MapSidebar,
  MapViewContainer,
  PostCard,
  UserBar,
  UserProfileCard,
} from '@/components';
import { APP_CONFIG } from '@/config';
import { useMapbox, useScreen, useSession } from '@/hooks';
import { dateformat, getEnv, sleep } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

type Props = {
  className?: string;
};

type Params = {
  context: string | null;
  lat: string | null;
  lon: string | null;
  alt: string | null;
  postId: string | null;
  search: string | null;
  user: string | null;
};

const PARAMS = {
  CONTEXT: 'context',
  LAT: 'lat',
  LON: 'lon',
  ALT: 'alt',
  POST_ID: 'post_id',
  SEARCH: 'search',
  USER: 'user',
};

const MODE = {
  LIST: 'list',
  MAP: 'map',
};

const DEFAULT_MODE = MODE.MAP;

const SEARCH_DEBOUNCE_INTERVAL = 500;

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

export const MapExploreView: React.FC<Props> = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mapbox = useMapbox();
  const session = useSession();
  const screen = useScreen();

  const [params, setParams] = useState<Params>({
    context: searchParams.get(PARAMS.CONTEXT),
    lat: searchParams.get(PARAMS.LAT),
    lon: searchParams.get(PARAMS.LON),
    alt: searchParams.get(PARAMS.ALT),
    postId: searchParams.get(PARAMS.POST_ID),
    search: searchParams.get(PARAMS.SEARCH),
    user: searchParams.get(PARAMS.USER),
  });

  const [_map, setMap] = useState<{
    lat: number;
    lon: number;
    alt: number;
    bounds: {
      sw: { lat: number; lon: number };
      ne: { lat: number; lon: number };
    };
  }>({
    lat: params.lat
      ? parseFloat(params.lat)
      : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT,
    lon: params.lon
      ? parseFloat(params.lon)
      : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON,
    alt: params.alt
      ? parseFloat(params.alt)
      : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT,
    bounds: { sw: { lat: 0, lon: 0 }, ne: { lat: 0, lon: 0 } },
  });
  const [map] = useDebounce(_map, SEARCH_DEBOUNCE_INTERVAL, {
    leading: true,
  });

  const [search, setSearch] = useState<{
    query?: string;
    context: 'text' | 'location';
    loading: boolean;
  }>({
    context: 'text',
    loading: false,
    query: params.search || undefined,
  });

  const [sidebar, setSidebar] = useState<boolean>(true);
  const [drawer, setDrawer] = useState<boolean>(false);
  const [mode, setMode] = useState<string>(DEFAULT_MODE);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const [context, setContext] = useState<MapQueryContext>(
    params.context
      ? (params.context as MapQueryContext)
      : params.user
        ? MapQueryContext.USER
        : MapQueryContext.GLOBAL,
  );
  const [userId, setUserId] = useState<string | null>(params.user || null);
  const [postId, setPostId] = useState<string | null>(params.postId || null);

  const modeRef = useRef(mode);

  const mapQueryEnabled: boolean = [
    map?.bounds.ne.lat,
    map?.bounds.ne.lon,
    map?.bounds.sw.lat,
    map?.bounds.sw.lon,
  ].every((el) => !!el);

  const mapQuery = useQuery({
    queryKey: userId
      ? [
          QUERY_KEYS.MAP.QUERY,
          context,
          userId,
          map?.bounds.ne.lat,
          map?.bounds.ne.lon,
          map?.bounds.sw.lat,
          map?.bounds.sw.lon,
        ]
      : [
          QUERY_KEYS.MAP.QUERY,
          context,
          map?.bounds.ne.lat,
          map?.bounds.ne.lon,
          map?.bounds.sw.lat,
          map?.bounds.sw.lon,
        ],
    queryFn: async () =>
      apiClient
        .mapQuery({
          context,
          username:
            context === MapQueryContext.USER ? (userId as string) : undefined,
          location: { bounds: map?.bounds },
        })
        .then(({ data }) => data),
    enabled: mapQueryEnabled,
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

  const post = postQuery?.data;
  const postLoading = postQuery.isLoading;

  const user = userQuery.data;

  const waypointLoading = mapQuery.isPending || mapQuery.isLoading;
  const waypointResults = mapQuery.data?.results || 0;

  const isPostSelected = (id: string): boolean =>
    postId ? postId === id : false;

  const updateParams = (payload: Partial<Params>) => {
    const { lat, lon, alt, postId, search, context, user } = payload;

    const s = new URLSearchParams(searchParams.toString());

    // update params state
    setParams((state) => ({
      ...state,
      ...payload,
    }));

    const paramss = [
      { key: PARAMS.LAT, value: lat },
      { key: PARAMS.LON, value: lon },
      { key: PARAMS.ALT, value: alt },
      { key: PARAMS.POST_ID, value: postId },
      { key: PARAMS.SEARCH, value: search },
      { key: PARAMS.CONTEXT, value: context },
      { key: PARAMS.USER, value: user },
    ];

    paramss.forEach(({ key, value }) => {
      if (value) {
        s.set(key, `${value}`);
      } else {
        if (value === null) {
          s.delete(key);
        }
      }
    });

    // update the url
    router.push(`${pathname}?${s.toString()}`, { scroll: false });
  };

  const handleMapLoad: MapOnLoadHandler = (value) => {
    const { bounds } = value;
    const mapboxInstance = value.mapbox;

    // set mapbox ref
    if (mapboxInstance && mapbox.ref) {
      mapbox.ref!.current = mapboxInstance;
    }

    // update query
    if (bounds) {
      setMap((map) => ({
        ...map,
        bounds: {
          sw: bounds.sw,
          ne: bounds.ne,
        },
      }));
    }
  };

  const handleMapMove: MapOnMoveHandler = (value) => {
    // ignore map move if it is list mode
    if (modeRef.current === MODE.LIST) return;

    const { lat, lon, alt, bounds } = value;

    // update query
    if (bounds) {
      setMap((map) => ({
        ...map,
        bounds: {
          sw: bounds.sw,
          ne: bounds.ne,
        },
      }));
    }

    // update search params
    updateParams({
      lat: `${lat}`,
      lon: `${lon}`,
      alt: `${alt}`,
      user: userId,
      context,
    });
  };

  const handleFilterChange = (value: string) => {
    setContext(value as MapQueryContext);
    updateParams({ context: value });
    mapQuery.refetch();
  };

  const handleSidebarToggle = () => {
    // update sidebar
    setSidebar((sidebar) => !sidebar);

    // resize the map
    if (mapbox.ref.current) {
      mapbox.ref.current.resize();
    }
  };

  const handleSourceClick: MapOnSourceClickHandler = (sourceId) => {
    handlePostOpen(sourceId);
  };

  const handlePostOpen = (postId: string) => {
    setDrawer(true);
    setPostId(postId);
    updateParams({ postId });
  };

  const handlePostClose = () => {
    setDrawer(false);
    setPostId(null);
    updateParams({ postId: null });
  };

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

        setMap((prev) => ({ ...prev, bounds: bbox }));
      }
    }
  };

  const handleUserClick = (username: string) => {
    if (!username) return;

    setUserId(username);
    setContext(MapQueryContext.USER);

    updateParams({
      context: MapQueryContext.USER,
      user: username,
    });

    mapQuery.refetch();
  };

  const handleUserBack = () => {
    setUserId(null);
    setContext(MapQueryContext.GLOBAL);

    updateParams({
      context: MapQueryContext.GLOBAL,
      user: null,
    });

    mapQuery.refetch();
  };

  const handleModeToggle = () => {
    setMode((prev) => (prev === MODE.LIST ? MODE.MAP : MODE.LIST));
  };

  // update mode
  useEffect(() => {
    if (mode) {
      modeRef.current = mode;
    }
  }, [mode]);

  // update waypoints
  useEffect(() => {
    if (mapQuery.isFetched) {
      const waypoints = mapQuery.data?.waypoints || [];
      setWaypoints(waypoints);
    }
  }, [mapQuery]);

  useEffect(() => {
    const coordinateSet = params.lat && params.lon;

    // open a post if it's set in the url
    if (params.postId) {
      setPostId(postId);
      setDrawer(true);
    }

    // set default search
    if (params.search) {
      setSearch((search) => ({ ...search, query: params.search || '' }));
    }

    // set default context
    if (params.context) {
      setContext(params.context as MapQueryContext);
    }

    // set default user
    if (params.user) {
      setUserId(params.user);
      setContext(MapQueryContext.USER);
    }

    // set default coordinates
    if (!coordinateSet) {
      updateParams({
        lat: `${APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT}`,
        lon: `${APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON}`,
        alt: `${APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT}`,
      });
    } else {
      if (!params.alt) {
        updateParams({
          alt: `${APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT}`,
        });
      }
    }

    // set default context
    if (params.user) {
      updateParams({
        context: MapQueryContext.USER,
      });
    } else {
      if (!params.context) {
        updateParams({
          context: MapQueryContext.GLOBAL,
        });
      }
    }

    // set default search
    if (params.search) {
      setSearch((prev) => ({
        ...prev,
        query: decodeURI(params.search as string),
      }));
    }
  }, []);

  return (
    <div className="relative w-full h-dvh overflow-hidden flex flex-row justify-between bg-white">
      <div className="z-40 absolute left-0 right-0 bottom-5 flex desktop:hidden flex-row justify-center items-center">
        {mode === MODE.LIST && (
          <Button onClick={handleModeToggle}>
            <div className="flex flex-row gap-2 items-center justify-center">
              <MapTrifoldIcon size={18} />
              <span>Map</span>
            </div>
          </Button>
        )}
        {mode === MODE.MAP && (
          <Button onClick={handleModeToggle}>
            <div className="flex flex-row gap-2 items-center justify-center">
              <ListBulletsIcon size={18} />
              <span>List</span>
            </div>
          </Button>
        )}
      </div>
      <MapSidebar
        opened={sidebar}
        className={cn(
          mode === MODE.LIST
            ? 'z-30 absolute pb-[70px] flex desktop:pb-[0px] desktop:relative desktop:flex desktop:inset-auto'
            : 'hidden desktop:relative desktop:flex',
        )}
      >
        <div className="relative flex flex-col w-full h-full">
          {[MapQueryContext.GLOBAL, MapQueryContext.FOLLOWING].some(
            (ctx) => ctx === context,
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
                  {/* {getEnv() === 'development' && JSON.stringify({ s: search })} */}
                </div>
              </div>
              {session.logged && (
                <div className="px-4 desktop:px-6 py-2">
                  <ChipGroup
                    value={context}
                    items={[
                      {
                        value: MapQueryContext.GLOBAL,
                        label: LOCALES.APP.MAP.FILTER.ALL,
                      },
                      {
                        value: MapQueryContext.FOLLOWING,
                        label: LOCALES.APP.MAP.FILTER.FOLLOWING,
                      },
                    ]}
                    classNames={{
                      chip: 'w-auto min-w-[0px] h-[30px] py-0 px-4 desktop:px-6 rounded-full',
                    }}
                    onSelect={handleFilterChange}
                  />
                </div>
              )}
            </>
          )}
          {context === MapQueryContext.USER && (
            <div className="flex flex-col pt-4 pb-2 px-6">
              <div className="flex flex-row">
                <UserProfileCard
                  name={user?.name}
                  picture={user?.picture}
                  username={user?.username}
                  loading={userQuery.isLoading}
                  backButton={{
                    click: handleUserBack,
                  }}
                />
              </div>
            </div>
          )}
          <div className="w-full h-auto flex flex-col gap-2 overflow-y-scroll no-scrollbar px-4 desktop:px-6 py-4 box-border">
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
                    onClick={() => handlePostOpen(post.id)}
                  />
                ) : (
                  <></>
                ),
              )
            ) : (
              <>no posts found</>
            )}
          </div>
        </div>
      </MapSidebar>

      <MapPostDrawer
        loading={postLoading}
        post={post}
        drawer={drawer}
        mobile={screen.mobile}
        onClose={handlePostClose}
      />

      <MapViewContainer extended={!sidebar} onExtend={handleSidebarToggle}>
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
              coordinates={{
                lat: map.lat,
                lon: map.lon,
                alt: map.alt,
              }}
              bounds={[
                map.bounds.sw.lon,
                map.bounds.sw.lat,
                map.bounds.ne.lon,
                map.bounds.ne.lat,
              ]}
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
              onSourceClick={handleSourceClick}
              onLoad={handleMapLoad}
              onMove={handleMapMove}
            />
          )}
        </div>
      </MapViewContainer>
    </div>
  );
};
