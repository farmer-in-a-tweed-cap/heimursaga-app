'use client';

import mapboxgl, { LngLatBoundsLike } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

type Props = {
  token: string;
  onChange?: () => void;
};

export const Mapbox: React.FC<Props> = ({ token, onChange }) => {
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

  const handleLocationChange = () => {};

  useEffect(() => {
    if (mapContainerRef.current) {
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
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div className="absolute z-20 break-words text-xs p-2">
        {JSON.stringify(state)}
      </div>
      <div
        id="map-container"
        ref={mapContainerRef}
        style={{ width: '100%', height: '100vh', zIndex: 1 }}
      ></div>
    </div>
  );
};
