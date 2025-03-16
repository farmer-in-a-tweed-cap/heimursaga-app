'use client';

import { useQuery } from '@tanstack/react-query';
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
import { MAP_DEFAULT_COORDINATES } from '@/constants';
import { useMapbox } from '@/hooks';
import { ISearchQueryResponse } from '@/types';

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
    lat: params.lat ? parseFloat(params.lat) : MAP_DEFAULT_COORDINATES.LAT,
    lon: params.lon ? parseFloat(params.lon) : MAP_DEFAULT_COORDINATES.LON,
    alt: params.alt ? parseFloat(params.alt) : MAP_DEFAULT_COORDINATES.ALT,
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

    console.log('mapload');

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

  useEffect(() => {
    const { lat, lon, alt } = params;

    const coordinateSet = lat && lon;

    // set default coordinates
    if (!coordinateSet) {
      updateSearchParams({
        lat: MAP_DEFAULT_COORDINATES.LAT,
        lon: MAP_DEFAULT_COORDINATES.LON,
        alt: MAP_DEFAULT_COORDINATES.ALT,
      });
    } else {
      if (!alt) {
        updateSearchParams({
          alt: MAP_DEFAULT_COORDINATES.ALT,
        });
      }
    }
  }, []);

  return (
    <div className="relative h-full">
      <div className="absolute top-0 left-0 bottom-0 z-20 w-[490px] h-full p-5">
        <ExploreSidebar
          loading={searchQueryQuery.isFetching}
          results={searchQueryQuery.data?.results}
          posts={searchQueryQuery.data?.data}
        />
      </div>
      <div className="relative w-full h-full z-10">
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
  );
};
