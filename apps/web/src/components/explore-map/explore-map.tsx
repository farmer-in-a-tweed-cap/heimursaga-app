'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { queryPostMapQuery } from '@/lib/api';

import { ExploreSidebar, Map } from '@/components';
import { MAP_DEFAULT_COORDINATES } from '@/constants';
import { useMapbox } from '@/hooks';

type Props = {
  className?: string;
};

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

  const postMapQuery = useQuery({
    queryKey: queryPostMapQuery.queryKey,
    queryFn: () => queryPostMapQuery.queryFn(),
  });

  const coordinates = {
    lat: params.lat ? parseFloat(params.lat) : MAP_DEFAULT_COORDINATES.LAT,
    lon: params.lon ? parseFloat(params.lon) : MAP_DEFAULT_COORDINATES.LON,
    alt: params.alt ? parseFloat(params.alt) : MAP_DEFAULT_COORDINATES.ALT,
  };

  const updateSearchParams = (params: {
    lat: number;
    lon: number;
    alt: number;
  }) => {
    const { lat, lon, alt } = params;

    const s = new URLSearchParams(searchParams.toString());

    s.set('lat', `${lat}`);
    s.set('lon', `${lon}`);
    s.set('alt', `${alt}`);

    router.push(`${pathname}?${s.toString()}`, { scroll: false });
  };

  const handleMapMove = (coordinates: {
    lat: number;
    lon: number;
    alt: number;
  }) => {
    const { lat, lon, alt } = coordinates;
    updateSearchParams({ lat, lon, alt });
  };

  useEffect(() => {
    const { lat, lon, alt } = params;

    if (!lat || !lon || !alt) {
      updateSearchParams({
        lat: MAP_DEFAULT_COORDINATES.LAT,
        lon: MAP_DEFAULT_COORDINATES.LON,
        alt: MAP_DEFAULT_COORDINATES.ALT,
      });
    }
  }, []);

  return (
    <div className="relative h-full">
      <div className="absolute top-0 left-0 bottom-0 z-20 w-[490px] h-full p-5">
        <ExploreSidebar
          loading={postMapQuery.isLoading}
          results={postMapQuery.data?.results}
          posts={postMapQuery.data?.data}
        />
      </div>
      <div className="relative w-full h-full z-10">
        {mapbox.token && (
          <Map
            token={mapbox.token}
            coordinates={coordinates}
            sources={
              postMapQuery.isSuccess
                ? {
                    results: postMapQuery.data.results,
                    geojson: postMapQuery.data.geojson,
                  }
                : undefined
            }
            onMove={handleMapMove}
          />
        )}
      </div>
    </div>
  );
};
