'use client';

import { cn } from '@repo/ui/lib/utils';
import mapboxgl, { LngLatBoundsLike } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

type Props = {
  token: string;
  className?: string;
  onChange?: () => void;
};

export const Map: React.FC<Props> = ({ className, token, onChange }) => {
  const [state, setState] = useState<{
    lon: number;
    lat: number;
    zoom: number;
  }>({
    lat: 48,
    lon: 7,
    zoom: 5,
  });

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<any>(null);

  useEffect(() => {
    if (mapContainerRef.current && token) {
      const { lon, lat, zoom } = state;

      mapboxgl.accessToken = token;
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        projection: 'equirectangular',
        style: 'mapbox://styles/mapbox/light-v11',
        center: [lon, lat],
        zoom,
        maxZoom: 13,
        minZoom: 3,
        pitch: 0,
        bearing: 0,
        renderWorldCopies: false,
        antialias: false,
        maxBounds: [
          [-180, -85],
          [180, 85],
        ],
      });

      // update lng/lat when the map moves
      mapRef.current.on('moveend', () => {
        if (mapRef.current) {
          const { lng: newLng, lat: newLat } = mapRef.current.getCenter();
          const zoom = mapRef.current.getZoom();

          setState(() => ({
            lat: Number(newLat.toFixed(8)),
            lon: Number(newLng.toFixed(8)),
            zoom,
          }));
        }
      });

      // @todo
      // prevent dragging beyond the visible map area
      mapRef.current.on('drag', () => {});
    }

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  return (
    <div
      id="map-container"
      ref={mapContainerRef}
      className={cn(className, 'w-full h-full')}
    ></div>
  );
};
