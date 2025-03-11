'use client';

import { cn } from '@repo/ui/lib/utils';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { MAPBOX_STYLE } from '@/constants';

import { MapNavigationControl } from './map-control';

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

  const mapboxRef = useRef<mapboxgl.Map | null>(null);
  const mapboxContainerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapboxContainerRef.current || !token) return;

    let mapbox = mapboxRef.current;

    const { lon, lat, zoom } = state;

    mapboxgl.accessToken = token;

    // create a mapbox instance
    mapbox = new mapboxgl.Map({
      container: mapboxContainerRef.current,
      projection: 'equirectangular',
      style: MAPBOX_STYLE,
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

    // update on load
    mapbox.on('load', () => {
      // add demo geojson data
      mapbox.addSource('earthquakes', {
        type: 'geojson',
        data: 'https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson',
      });

      mapbox.addLayer({
        id: 'earthquakes-layer',
        type: 'circle',
        source: 'earthquakes',
        paint: {
          'circle-radius': 5,
          'circle-stroke-width': 0,
          'circle-color': 'red',
          'circle-stroke-color': 'white',
        },
      });

      // @todo: customize controls
      mapbox.addControl(new MapNavigationControl(), 'top-right');
    });

    // update on move
    mapbox.on('moveend', () => {
      if (mapboxRef.current) {
        const { lng: newLng, lat: newLat } = mapboxRef.current.getCenter();
        const zoom = mapboxRef.current.getZoom();

        setState(() => ({
          lat: Number(newLat.toFixed(8)),
          lon: Number(newLng.toFixed(8)),
          zoom,
        }));
      }
    });

    // @todo
    // prevent dragging beyond the visible map area

    return () => {
      mapbox.remove();
    };
  }, []);

  return (
    <div
      id="map-container"
      ref={mapboxContainerRef}
      className={cn(className, 'w-full h-full')}
    >
      {/* <div className="absolute z-20 h-auto top-0 right-0 box-border p-6 flex flex-col justify-center items-center gap-2">
        <div className="map-control-button">
          <Plus
            size={20}
            onClick={(): void => {
              console.log({ m: mapboxRef.current });

              if (!mapboxRef.current) return;
              mapboxRef.current.zoomIn();
            }}
          />
        </div>
        <div className="map-control-button">
          <Minus size={20} />
        </div>
        <div className="map-control-button">
          <Navigation2 size={20} />
        </div>
      </div> */}
    </div>
  );
};
