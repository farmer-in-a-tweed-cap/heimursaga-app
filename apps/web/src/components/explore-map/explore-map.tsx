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

  useEffect(() => {
    if (!params.lat || !params.lon) {
      const s = new URLSearchParams(searchParams.toString());
      s.set('lat', `${MAP_DEFAULT_COORDINATES.LAT}`);
      s.set('lon', `${MAP_DEFAULT_COORDINATES.LON}`);
      s.set('alt', `${MAP_DEFAULT_COORDINATES.ALT}`);

      router.push(`${pathname}?${s.toString()}`, { scroll: false });
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
          />
        )}
      </div>
    </div>
  );
};
