'use client';

import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';

import { APP_CONFIG } from '@/config';
import { useMapbox } from '@/hooks';

import { Map, MapSource } from './map';
import { MapPreviewOverlay } from './map-preview-overlay';

type Props = {
  href?: string;
  className?: string;
  lat?: number;
  lon?: number;
  alt?: number;
  overlay?: boolean;
  zoom?: number;
  layers?: { id: string; source: string }[];
  sources?: MapSource[];
  markers?: {
    lat: number;
    lon: number;
  }[];
  onClick?: () => void;
};

export const MapPreview: React.FC<Props> = ({
  href,
  lat = 0,
  lon = 0,
  alt = APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
  markers,
  className,
  zoom = 0,
  overlay = true,
  layers = [],
  sources = [],
  onClick = () => {},
}) => {
  const mapbox = useMapbox();

  const token = mapbox.token;
  const width = 600;
  const height = 240;
  const style = APP_CONFIG.MAPBOX.STYLE;
  const color = APP_CONFIG.MAPBOX.BRAND_COLOR;
  const retina = '@2x';

  const marker = markers?.[0];

  return (
    <div
      className={cn(
        'relative w-full h-[220px] bg-gray-50 rounded-xl overflow-hidden',
        className,
      )}
    >
      {overlay ? (
        <MapPreviewOverlay href={href} onClick={onClick} />
      ) : (
        <div className="absolute inset-0 z-20 cursor-default"></div>
      )}
      <div className="z-10 w-full h-full cursor-not-allowed">
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
            layers={layers}
            sources={sources}
            minZoom={zoom}
            width={width}
            height={height}
            cursor="pointer"
            controls={false}
            disabled={true}
            styles={{
              layer: {
                waypoint: {
                  radius: 5,
                },
              },
            }}
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
  zoom = APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
  markers = [],
  overlay = true,
  className,
  onClick = () => {},
}) => {
  const mapbox = useMapbox();

  const token = mapbox.token;
  const width = 600;
  const height = 240;
  const style = APP_CONFIG.MAPBOX.STYLE;
  const color = APP_CONFIG.MAPBOX.BRAND_COLOR;
  const retina = '@2x';

  const pin =
    markers.length >= 1
      ? markers.map(({ lon, lat }) => `pin-s+${color}(${lon},${lat})`).join(',')
      : '';

  const src = `https://api.mapbox.com/styles/v1/${style}/static/${markers.length >= 1 ? `${pin}/` : ''}${lon},${lat},${zoom},0,0/${width}x${height}${retina}?access_token=${token}`;

  return (
    <div
      className={cn(
        'relative w-full aspect-5/2 h-auto bg-gray-50 rounded-xl overflow-hidden',
        className,
      )}
    >
      {overlay && <MapPreviewOverlay href={href} onClick={onClick} />}
      <div className="z-10 w-full aspect-5/2">
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
