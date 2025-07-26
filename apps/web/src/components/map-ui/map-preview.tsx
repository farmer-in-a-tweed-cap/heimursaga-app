'use client';

import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { APP_CONFIG } from '@/config';
import { MapCoordinatesValue, useMap, useMapbox } from '@/hooks';

import { Map, MapSource } from './map';
import { MapPreviewOverlay } from './map-preview-overlay';

type Props = {
  href?: string;
  className?: string;
  center?: MapCoordinatesValue;
  marker?: MapCoordinatesValue;
  zoom?: number;
  overlay?: boolean;
  layers?: { id: string; source: string }[];
  sources?: MapSource[];

  onClick?: () => void;
};

export const MapPreview: React.FC<Props> = ({
  href,
  center,
  marker,
  zoom = APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
  className,
  overlay = true,
  layers = [],
  sources = [],
  onClick = () => {},
}) => {
  const mapbox = useMapbox();
  const map = useMap();

  const token = mapbox.token;
  const width = 600;
  const height = 240;

  useEffect(() => {
    // if (!loaded) return;


    if (map.mapbox && center) {
      map.mapbox.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    // if (!loaded) return;


    if (map.mapbox && typeof zoom === 'number') {
      map.mapbox.setZoom(zoom);
    }
  }, [zoom]);

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
            zoom={zoom}
            minZoom={0}
            maxZoom={10}
            center={center}
            marker={marker}
            layers={layers}
            sources={sources}
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
            onLoad={map.handleLoad}
          />
        )}
      </div>
    </div>
  );
};

export const MapStaticPreview: React.FC<Props> = ({
  href,
  marker,
  zoom = APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
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

  const { lat = 0, lon = 0 } = marker || {};
  const pin = marker ? `pin-s+${color}(${marker.lon},${marker.lat})` : '';

  const src = `https://api.mapbox.com/styles/v1/${style}/static/${pin}/${lon},${lat},${zoom},0,0/${width}x${height}${retina}?access_token=${token}`;

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
