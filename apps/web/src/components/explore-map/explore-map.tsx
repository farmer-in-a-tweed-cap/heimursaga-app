'use client';

import { Searchbar } from '../search';
import { MapQueryContext } from '@repo/types';
import {
  ChipGroup,
  LoadingSpinner,
  NormalizedText,
  Skeleton,
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import {
  CloseButton,
  MAP_SOURCES,
  Map,
  MapOnLoadHandler,
  MapOnMoveHandler,
  MapOnSourceClickHandler,
  PostCard,
  UserBar,
  UserProfileCard,
} from '@/components';
import { APP_CONFIG } from '@/config';
import { useMapbox } from '@/hooks';
import { dateformat, sleep } from '@/lib';
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
  SEARCH: 's',
  USER: 'user',
};

const SEARCH_DEBOUNCE_INTERVAL = 500;

export const ExploreMap: React.FC<Props> = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mapbox = useMapbox();

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
    loading: boolean;
  }>({ loading: false });
  const [searchDebounced] = useDebounce(search, 500, { leading: true });

  const [sidebar, setSidebar] = useState<boolean>(true);
  const [drawer, setDrawer] = useState<boolean>(false);
  const [context, setContext] = useState<MapQueryContext>(
    params.context
      ? (params.context as MapQueryContext)
      : params.user
        ? MapQueryContext.USER
        : MapQueryContext.GLOBAL,
  );
  const [userId, setUserId] = useState<string | null>(params.user || null);
  const [postId, setPostId] = useState<string | null>(params.postId || null);

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
    enabled: [
      map?.bounds.ne.lat,
      map?.bounds.ne.lon,
      map?.bounds.sw.lat,
      map?.bounds.sw.lon,
    ].every((param) => !!param),
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

  const mapQueryLoading = mapQuery.isPending || mapQuery.isLoading;
  const mapQueryResults = mapQuery.data?.results || 0;
  const mapQueryWaypoints = mapQuery.data?.waypoints || [];

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

  const handleSearchChange = async (query: string) => {
    setSearch((search) => ({ ...search, query }));
  };

  const handleSearchSubmit = (query: string) => {
    setSearch((search) => ({ ...search, query }));
    updateParams({ search: query });
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

  const fetchSearch = async (query: string) => {
    try {
      setSearch((search) => ({ ...search, loading: true }));

      // @todo
      await sleep(1500);

      setSearch((search) => ({ ...search, loading: false }));
    } catch (e) {
      setSearch((search) => ({ ...search, loading: false }));
    }
  };

  useEffect(() => {
    if (searchDebounced.query) {
      fetchSearch(searchDebounced.query);
    }
  }, [searchDebounced.query]);

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
  }, []);

  return (
    <div className="w-full h-full flex flex-row justify-between bg-white">
      <div
        className={cn(
          'relative w-full h-full  hidden sm:flex overflow-hidden',
          sidebar ? 'basis-auto max-w-[540px]' : 'max-w-[0px]',
        )}
      >
        <div className="relative flex flex-col w-full h-full ">
          {[MapQueryContext.GLOBAL, MapQueryContext.FOLLOWING].some(
            (ctx) => ctx === context,
          ) && (
            <>
              <div className="flex flex-row justify-between items-center py-4 px-6 bg-white">
                <div className="flex flex-col gap-0">
                  <span className="text-lg font-medium">Explore</span>
                  <div className="mt-1 h-[16px] flex flex-row items-center justify-start overflow-hidden">
                    {mapQuery.isPending || mapQuery.isLoading ? (
                      <Skeleton className="w-[120px] h-[12px]" />
                    ) : (
                      <span className="text-sm font-normal text-gray-600">
                        {mapQueryResults} {LOCALES.APP.SEARCH.POSTS_FOUND}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full max-w-[280px]">
                  <Searchbar
                    value={search.query}
                    loading={search.loading}
                    onChange={handleSearchChange}
                    onSubmit={handleSearchSubmit}
                  />
                </div>
              </div>
              <div className="px-6 py-2">
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
                    chip: 'w-auto min-w-[0px] h-[30px] py-0 px-4 rounded-full',
                  }}
                  onSelect={handleFilterChange}
                />
              </div>
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
          <div className="flex flex-col gap-2 overflow-y-scroll px-6 py-2 box-border">
            {mapQueryLoading ? (
              <LoadingSpinner />
            ) : (
              mapQueryWaypoints.map(({ date, post }, key) =>
                post ? (
                  <PostCard
                    key={key}
                    {...post}
                    id={post.id}
                    date={date}
                    actions={{ like: false, bookmark: true, edit: false }}
                    classNames={{
                      card: isPostSelected(post.id) ? '!border-black' : '',
                    }}
                    userbar={
                      post?.author
                        ? {
                            click: () =>
                              handleUserClick(post?.author?.username),
                          }
                        : undefined
                    }
                    onClick={() => handlePostOpen(post.id)}
                  />
                ) : (
                  <></>
                ),
              )
            )}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'z-40 w-full relative overflow-hidden shadow-xl',
          sidebar ? 'max-w-full rounded-l-2xl' : 'max-w-full rounded-l-none',
        )}
      >
        <div
          className={cn(
            'z-50 w-full overflow-y-scroll h-screen absolute transform transition-transform duration-300 ease-in-out right-0 top-0 bottom-0 bg-white rounded-l-2xl',
            drawer ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex flex-col ">
            <div className="p-4 h-[60px] sticky top-0 w-full flex flex-row justify-start items-center">
              <CloseButton className="bg-white" onClick={handlePostClose} />
            </div>
            <div className="-mt-[60px] w-full h-[280px] bg-gray-500 rounded-l-2xl"></div>
            {postLoading ? (
              <LoadingSpinner />
            ) : post ? (
              <div className="w-full flex flex-col p-8">
                {post.author && (
                  <Link
                    href={
                      post?.author?.username
                        ? ROUTER.MEMBERS.MEMBER(post?.author?.username)
                        : '#'
                    }
                  >
                    <UserBar
                      name={post?.author?.name}
                      picture={post.author?.picture}
                      creator={post.author?.creator}
                      text={dateformat(post?.date).format('MMM DD')}
                    />
                  </Link>
                )}
                <div className="mt-8">
                  <h2 className="text-3xl font-medium">{post.title}</h2>
                </div>
                <div className="py-6">
                  <NormalizedText text={post.content} />
                </div>
              </div>
            ) : (
              <>post not found</>
            )}
          </div>
        </div>
        <button
          className="z-20 absolute hidden sm:flex top-4 left-4 drop-shadow text-black bg-white hover:bg-white/90 p-2 rounded-full"
          onClick={handleSidebarToggle}
        >
          {sidebar ? (
            <ArrowLeftToLineIcon size={18} />
          ) : (
            <ArrowRightToLineIcon size={18} />
          )}
        </button>
        <div className={cn('z-10 relative !w-full h-full overflow-hidden')}>
          {mapbox.token && (
            <Map
              token={mapbox.token}
              coordinates={{
                lat: map.lat,
                lon: map.lon,
                alt: map.alt,
              }}
              minZoom={1}
              maxZoom={15}
              sources={[
                {
                  sourceId: MAP_SOURCES.WAYPOINTS,
                  type: 'point',
                  data: mapQueryWaypoints.map(({ lat, lon, post }, key) => ({
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
                    cluster: false,
                  },
                },
              ]}
              onSourceClick={handleSourceClick}
              onLoad={handleMapLoad}
              onMove={handleMapMove}
            />
          )}
        </div>
      </div>
    </div>
  );
};
