'use client';

import { MapQueryContext } from '@repo/types';
import { LoadingOverlay } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { MAP_LAYERS, MAP_SOURCES, MapPreview } from '@/components';
import { APP_CONFIG } from '@/config';
import { ROUTER } from '@/router';

type Props = {
  username: string;
  className?: string;
};

export const UserMapBanner: React.FC<Props> = ({ username, className }) => {
  const mapQuery = useQuery({
    queryKey: [QUERY_KEYS.MAP, username],
    queryFn: () =>
      apiClient
        .mapQuery({ context: MapQueryContext.USER, username })
        .then(({ data }) => data),
    enabled: !!username,
    retry: 0,
  });

  const loading = mapQuery.isLoading;
  const waypoints = mapQuery.data?.waypoints || [];
  const url = username
    ? [
        ROUTER.HOME,
        `context=user&user=${username}&lat=${APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT}&lon=${APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON}&alt=1`,
      ].join('?')
    : '#';

  return (
    <Link href={url}>
      <div
        className={cn(
          'relative w-full h-[200px] lg:h-[240px] bg-accent rounded-lg overflow-hidden',
          className,
        )}
      >
        {loading && <LoadingOverlay />}
        <div className="transition-all z-20 absolute cursor-pointer inset-0 bg-black opacity-10 hover:opacity-0 hover:bg-black"></div>
        <div className="transition-all w-full h-full z-10">
          <MapPreview
            className="w-full h-[200px] lg:h-[240px]"
            lat={APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT}
            lon={APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON}
            alt={0}
            zoom={0}
            layers={[
              {
                id: MAP_LAYERS.WAYPOINTS,
                source: MAP_SOURCES.WAYPOINTS,
              },
            ]}
            sources={[
              {
                sourceId: MAP_SOURCES.WAYPOINTS,
                type: 'point',
                data: waypoints.map(({ lat, lon }, key) => ({
                  id: `${key}`,
                  lat,
                  lon,
                  properties: {},
                })),
                config: {
                  cluster: false,
                },
              },
            ]}
            overlay={true}
          />
        </div>
      </div>
    </Link>
  );
};
