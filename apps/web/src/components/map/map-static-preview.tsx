'use client';

import Image from 'next/image';

import { APP_CONFIG } from '@/config';
import { useMapbox } from '@/hooks';

import { MapPreviewOverlay } from './map-preview-overlay';

type Props = {
  href?: string;
  lat?: number;
  lon?: number;
  alt?: number;
  onClick?: () => void;
};

export const MapStaticPreview: React.FC<Props> = ({
  href,
  lat = 0,
  lon = 0,
  alt = APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
  onClick = () => {},
}) => {
  const mapbox = useMapbox();

  const width = 600;
  const height = 240;
  const style = APP_CONFIG.MAPBOX.STYLE;
  const token = mapbox.token;

  const color = APP_CONFIG.MAPBOX.BRAND_COLOR;
  const retina = '@2x';
  const marker = `pin-m+${color}(${lon},${lat})`;

  const src = `https://api.mapbox.com/styles/v1/${style}/static/${marker}/${lon},${lat},${alt},0,0/${width}x${height}${retina}?access_token=${token}`;

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
        {mapbox.token && <div>{JSON.stringify({ lat, lon, alt })}</div>}
      </div>
    </div>
  );
};
