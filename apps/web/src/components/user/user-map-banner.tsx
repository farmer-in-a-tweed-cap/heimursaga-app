'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';

import { getUserMapByUsername } from '@/lib/api';

import { MapPreview, MapStaticPreview } from '@/components';
import { APP_CONFIG } from '@/config';

type Props = {
  username: string;
  className?: string;
};

export const UserMapBanner: React.FC<Props> = ({ username, className }) => {
  const userMapQuery = useQuery({
    queryKey: [getUserMapByUsername.queryKey, username],
    queryFn: () => getUserMapByUsername.queryFn({ username }),
    retry: 0,
    enabled: !!username,
  });

  const loading = userMapQuery.isLoading;

  const geojson = userMapQuery.data?.geojson;
  const lastWaypoint = userMapQuery.data?.lastWaypoint;

  const lat = lastWaypoint
    ? lastWaypoint?.lat
    : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT;
  const lon = lastWaypoint
    ? lastWaypoint?.lon
    : APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON;
  const alt = 6;

  const handleClick = () => {};

  return (
    <div
      className={cn(
        'relative w-full h-[180px] lg:h-[280px] bg-accent rounded-lg overflow-hidden',
        className,
      )}
    >
      <div
        className="transition-all z-20 absolute cursor-pointer inset-0 opacity-0 hover:opacity-10 hover:bg-black hover:scale-110"
        onClick={handleClick}
      ></div>
      <div className="transition-all w-full h-full z-10">
        {/* <MapStaticPreview
            className="w-full h-[220px] lg:h-[280px]"
            lat={lat}
            lon={lon}
            alt={1}
            // sources={geojson ? { geojson } : undefined}
            overlay={false}
          /> */}
      </div>
    </div>
  );
};
