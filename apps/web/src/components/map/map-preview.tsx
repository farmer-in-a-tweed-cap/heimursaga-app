'use client';

import { useMapbox } from '@/hooks';

import { Map } from './map';

type Props = {
  coordinates?: {
    lat: number;
    lon: number;
  };
};

export const MapPreview: React.FC<Props> = ({
  coordinates = { lat: 0, lon: 0 },
}) => {
  const mapbox = useMapbox();

  return (
    <div className="w-full aspect-5/2 bg-gray-50 rounded-xl overflow-hidden">
      {mapbox.token && (
        <Map
          token={mapbox.token}
          coordinates={{
            lat: coordinates.lat,
            lon: coordinates.lon,
            alt: 8,
          }}
          marker={{
            lat: coordinates.lat,
            lon: coordinates.lon,
          }}
          cursor="pointer"
          controls={false}
          disabled={true}
        />
      )}
    </div>
  );
};
