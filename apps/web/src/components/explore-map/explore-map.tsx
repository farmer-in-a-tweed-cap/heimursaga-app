'use client';

import { Searchbar } from '../search';
import { LoadingSpinner, Skeleton } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftToLineIcon, ArrowRightToLineIcon } from 'lucide-react';
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
} from '@/components';
import { APP_CONFIG } from '@/config';
import { useMapbox } from '@/hooks';
import { dateformat, sleep } from '@/lib';
import { ROUTER } from '@/router';

type Props = {
  className?: string;
};

const SEARCH_DEBOUNCE_INTERVAL = 500;

export const ExploreMap: React.FC<Props> = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = {
    lat: searchParams.get('lat'),
    lon: searchParams.get('lon'),
    alt: searchParams.get('alt'),
    postId: searchParams.get('post_id'),
    s: searchParams.get('s'),
  };

  const mapbox = useMapbox();

  const [drawer, setDrawer] = useState<boolean>(false);

  const [_searchState, setSearchState] = useState<{
    bounds: {
      sw: { lat: number; lon: number };
      ne: { lat: number; lon: number };
    };
  }>();
  const [searchState] = useDebounce(_searchState, SEARCH_DEBOUNCE_INTERVAL, {
    leading: true,
  });

  const [search, setSearch] = useState<{
    query?: string;
    loading: boolean;
  }>({ loading: false });
  const [searchDebounced] = useDebounce(search, 500, { leading: true });

  const [sidebar, setSidebar] = useState<boolean>(true);

  const [postId, setPostId] = useState<string | null>(null);

  const mapQuery = useQuery({
    queryKey: [
      QUERY_KEYS.MAP.QUERY,
      searchState?.bounds.ne.lat,
      searchState?.bounds.ne.lon,
      searchState?.bounds.sw.lat,
      searchState?.bounds.sw.lon,
    ],
    queryFn: async () =>
      apiClient
        .mapQuery({ location: { bounds: searchState?.bounds } })
        .then(({ data }) => data),
    enabled: [
      searchState?.bounds.ne.lat,
      searchState?.bounds.ne.lon,
      searchState?.bounds.sw.lat,
      searchState?.bounds.sw.lon,
    ].every((param) => !!param),
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

  const mapQueryLoading = mapQuery.isPending || mapQuery.isLoading;
  const mapQueryResults = mapQuery.data?.results || 0;
  const mapQueryWaypoints = mapQuery.data?.waypoints || [];

  const coordinates = {
    lat: params.lat
      ? parseFloat(params.lat)
      : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT,
    lon: params.lon
      ? parseFloat(params.lon)
      : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON,
    alt: params.alt
      ? parseFloat(params.alt)
      : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT,
  };

  const updateSearchParams = (params: {
    lat?: number;
    lon?: number;
    alt?: number;
    post_id?: string;
    s?: string;
  }) => {
    const { lat, lon, alt, post_id, s: search } = params;

    const s = new URLSearchParams(searchParams.toString());

    if (lat) {
      s.set('lat', `${lat}`);
    }

    if (lon) {
      s.set('lon', `${lon}`);
    }

    if (alt) {
      s.set('alt', `${alt}`);
    }

    if (post_id) {
      s.set('post_id', `${post_id}`);
    }

    if (search) {
      s.set('s', `${search}`);
    }

    router.push(`${pathname}?${s.toString()}`, { scroll: false });
  };

  // @todo: convert into an util function
  const deleteSearchParams = (fields: string[]) => {
    const s = new URLSearchParams(searchParams.toString());
    fields.forEach((field) => s.delete(field));
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
      setSearchState((state) => ({
        ...state,
        bounds: {
          sw: bounds.sw,
          ne: bounds.ne,
        },
      }));
    }
  };

  const handleMapMove: MapOnMoveHandler = (value) => {
    const { lat, lon, alt, bounds } = value;

    console.log('mapmove');

    // update query
    if (bounds) {
      setSearchState((state) => ({
        ...state,
        bounds: {
          sw: bounds.sw,
          ne: bounds.ne,
        },
      }));
    }

    // update search params
    updateSearchParams({ lat, lon, alt });
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
    updateSearchParams({ post_id: postId });
  };

  const handlePostClose = () => {
    setDrawer(false);
    setPostId(null);
    deleteSearchParams(['post_id']);
  };

  const handleSearchChange = async (query: string) => {
    setSearch((search) => ({ ...search, query }));
  };

  const handleSearchSubmit = (query: string) => {
    setSearch((search) => ({ ...search, query }));
    updateSearchParams({ s: query });
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
    const { lat, lon, alt, postId, s } = params;
    const coordinateSet = lat && lon;

    // open a post if it's set in the url
    if (postId) {
      setPostId(postId);
      setDrawer(true);
    }

    // set default search
    if (s) {
      setSearch((search) => ({ ...search, query: s }));
    }

    // set default coordinates
    if (!coordinateSet) {
      updateSearchParams({
        lat: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT,
        lon: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON,
        alt: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT,
      });
    } else {
      if (!alt) {
        updateSearchParams({
          alt: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT,
        });
      }
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-row justify-between bg-white">
      <div
        className={cn(
          'relative w-full h-full  hidden sm:flex overflow-hidden',
          sidebar ? 'max-w-[40%]' : 'max-w-[0px]',
        )}
      >
        <div className="relative flex flex-col w-full h-full ">
          <div className="flex flex-row justify-between items-center py-4 px-6 bg-white">
            <div className="flex flex-col gap-0">
              <span className="text-lg font-medium">Explore</span>
              {mapQuery.isPending || mapQuery.isLoading ? (
                <div className="mt-1 h-[16] flex flex-row items-center justify-start">
                  <Skeleton className="h-[10px]" />
                </div>
              ) : (
                <span className="h-[16px] text-sm font-normal text-gray-600">
                  {mapQueryResults} entries found
                </span>
              )}
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
          <div className="flex flex-col gap-2 overflow-y-scroll no-scrollbar p-6 box-border">
            {mapQueryLoading ? (
              <LoadingSpinner />
            ) : (
              mapQueryWaypoints.map(({ post }, key) =>
                post ? (
                  <PostCard
                    key={key}
                    {...post}
                    id={post.id}
                    actions={{ like: false, bookmark: true, edit: false }}
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
          'z-50 w-[60%] overflow-y-scroll h-screen absolute transform transition-transform duration-300 ease-in-out right-0 top-0 bottom-0 bg-white rounded-l-2xl drop-shadow-lg',
          drawer ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex flex-col">
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
                    text={dateformat(post?.date).format('MMM DD')}
                  />
                </Link>
              )}
              <div className="mt-8">
                <h2 className="text-3xl font-medium">{post.title}</h2>
              </div>
              <div className="py-6">
                <p className="text-base font-normal">{post.content}</p>
              </div>
            </div>
          ) : (
            <>post not found</>
          )}
        </div>
      </div>
      <div
        className={cn(
          'z-40 w-full relative overflow-hidden',
          sidebar ? 'max-w-[60%] rounded-l-2xl' : 'max-w-[100%] rounded-l-none',
        )}
      >
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
              coordinates={coordinates}
              minZoom={4}
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
