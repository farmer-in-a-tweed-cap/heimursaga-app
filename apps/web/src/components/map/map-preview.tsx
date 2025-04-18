'use client';

import Image from 'next/image';

import { APP_CONFIG } from '@/config';
import { useMapbox } from '@/hooks';

import { Map } from './map';
import { MapPreviewOverlay } from './map-preview-overlay';

type Props = {
  href?: string;
  lat?: number;
  lon?: number;
  alt?: number;
  marker?: {
    lat: number;
    lon: number;
  };
  onClick?: () => void;
};

export const MapPreview: React.FC<Props> = ({
  href,
  lat = 0,
  lon = 0,
  alt = APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
  marker,
  onClick = () => {},
}) => {
  const mapbox = useMapbox();

  const token = mapbox.token;
  const width = 600;
  const height = 240;
  const style = APP_CONFIG.MAPBOX.STYLE;
  const color = APP_CONFIG.MAPBOX.BRAND_COLOR;
  const retina = '@2x';

  return (
    <div className="relative w-full aspect-5/2 h-auto bg-gray-50 rounded-xl overflow-hidden">
      <MapPreviewOverlay href={href} onClick={onClick} />
      <div className="z-10 w-full h-full">
        {token && (
          <Map
            token={token}
            coordinates={{
              lat,
              lon,
              alt,
            }}
            marker={
              marker
                ? {
                    lat: marker.lat,
                    lon: marker.lon,
                  }
                : undefined
            }
            width={width}
            height={height}
            cursor="pointer"
            controls={false}
            disabled={true}
          />
        )}
      </div>
    </div>
  );
};

export const MapStaticPreview: React.FC<Props> = ({
  href,
  lat = 0,
  lon = 0,
  alt = APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
  marker,
  onClick = () => {},
}) => {
  const mapbox = useMapbox();

  const token = mapbox.token;
  const width = 600;
  const height = 240;
  const style = APP_CONFIG.MAPBOX.STYLE;
  const color = APP_CONFIG.MAPBOX.BRAND_COLOR;
  const retina = '@2x';
  const pin = marker ? `pin-s+${color}(${marker.lon},${marker.lat})` : '';

  const src = `https://api.mapbox.com/styles/v1/${style}/static/${pin}/${lon},${lat},${alt},0,0/${width}x${height}${retina}?access_token=${token}`;

  return (
    <div className="relative w-full aspect-5/2 h-auto bg-gray-50 rounded-xl overflow-hidden">
      <MapPreviewOverlay href={href} onClick={onClick} />
      <div className="z-10 w-full h-full">
        <Image
          src={src}
          alt=""
          width={width}
          height={height}
          className="w-full h-auto"
        />
      </div>
    </div>
  );
};
