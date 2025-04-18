'use client';

import { useMapbox } from '@/hooks';

import { Map } from './map';
import { MapPreviewOverlay } from './map-preview-overlay';

type Props = {
  href?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  onClick?: () => void;
};

export const MapPreview: React.FC<Props> = ({
  href,
  coordinates = { lat: 0, lon: 0 },
  onClick = () => {},
}) => {
  const mapbox = useMapbox();

  return (
    <div className="relative w-full aspect-5/2 bg-gray-50 rounded-xl overflow-hidden">
      <MapPreviewOverlay href={href} onClick={onClick} />
      <div className="z-10 w-full h-full">
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
    </div>
  );
};
