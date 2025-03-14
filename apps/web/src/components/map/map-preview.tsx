'use client';

import { Button } from '@repo/ui/components';
import Link from 'next/link';

import { useMapbox } from '@/hooks';

import { Map } from './map';

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

export const MapPreviewOverlay = ({
  href,
  onClick = () => {},
}: {
  href?: string;
  onClick?: () => void;
}) => (
  <div className="absolute z-20 transition-all inset-0 w-full h-full flex flex-row justify-center items-center opacity-0 cursor-pointer hover:opacity-100">
    <div className="absolute z-10 inset-0 bg-gray-200 opacity-50"></div>
    {href ? (
      <Button variant="outline" className="z-20" asChild>
        <Link href={href}>Open map</Link>
      </Button>
    ) : (
      <Button variant="outline" className="z-20" onClick={onClick}>
        Open map
      </Button>
    )}
  </div>
);
