'use client';

import { ISearchQueryResponse } from '@repo/types';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftToLineIcon, ArrowRightToLineIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { QUERY_KEYS, searchQuery } from '@/lib/api';

import {
  ExploreSidebar,
  Map,
  MapOnLoadHandler,
  MapOnMoveHandler,
} from '@/components';
import { APP_CONFIG } from '@/config';
import { useMapbox } from '@/hooks';

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
  };

  const mapbox = useMapbox();

  const [_searchState, setSearchState] = useState<{
    bounds: {
      sw: { lat: number; lon: number };
      ne: { lat: number; lon: number };
    };
  }>();
  const [searchState] = useDebounce(_searchState, SEARCH_DEBOUNCE_INTERVAL, {
    leading: true,
  });
  const [sidebar, setSidebar] = useState<boolean>(true);

  const searchQueryQuery = useQuery<ISearchQueryResponse, Error>({
    queryKey: [
      QUERY_KEYS.SEARCH,
      searchState?.bounds.ne.lat,
      searchState?.bounds.ne.lon,
      searchState?.bounds.sw.lat,
      searchState?.bounds.sw.lon,
    ],
    queryFn: async () =>
      searchQuery.queryFn({ location: { bounds: searchState?.bounds } }),
    enabled: [
      searchState?.bounds.ne.lat,
      searchState?.bounds.ne.lon,
      searchState?.bounds.sw.lat,
      searchState?.bounds.sw.lon,
    ].every((param) => !!param),
    retry: 0,
  });

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
  }) => {
    const { lat, lon, alt } = params;

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
    if (mapbox.ref!.current) {
      setTimeout(() => {
        console.log('resize map..');
        mapbox.ref.current!.resize();
      }, 0);
    }
  };

  useEffect(() => {
    const { lat, lon, alt } = params;

    const coordinateSet = lat && lon;

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
    <div className="w-full h-full flex flex-row bg-white">
      <div
        className={cn(
          'w-full h-full hidden sm:flex overflow-hidden',
          sidebar ? 'sm:max-w-[540px]' : 'max-w-[0px]',
        )}
      >
        <ExploreSidebar
          loading={searchQueryQuery.isFetching}
          results={searchQueryQuery.data?.results}
          posts={searchQueryQuery.data?.data}
        />
      </div>
      <div
        className={cn(
          'relative w-full overflow-hidden',
          sidebar ? 'rounded-l-3xl' : '',
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
        <div className="z-10 relative w-full h-full overflow-hidden">
          {mapbox.token && (
            <Map
              token={mapbox.token}
              coordinates={coordinates}
              sources={
                searchQueryQuery.isSuccess
                  ? {
                      results: searchQueryQuery.data.results,
                      geojson: searchQueryQuery.data.geojson,
                    }
                  : undefined
              }
              onLoad={handleMapLoad}
              onMove={handleMapMove}
            />
          )}
        </div>
      </div>
    </div>
  );
};
