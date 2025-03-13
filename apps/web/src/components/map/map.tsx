'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import mapboxgl, { MapOptions, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { MAPBOX_STYLE } from '@/constants';

import { MapNavigationControl } from './map-control';

type Props = {
  token: string;
  sources?: {}[];
  coordinates?: { lat: number; lon: number; alt: number };
  marker?: { lat: number; lon: number };
  className?: string;
  cursor?: string;
  controls?: boolean;
  disabled?: boolean;
  onMove?: (data: { lat: number; lon: number; alt: number }) => void;
  onMarkerChange?: (data: { lat: number; lon: number }) => void;
};

export const Map: React.FC<Props> = ({
  className,
  token,
  cursor,
  marker,
  coordinates = { lat: 48, lon: 7, alt: 5 },
  controls = true,
  disabled = false,
  onMove,
  onMarkerChange,
}) => {
  const [mapReady, setMapReady] = useState(false);

  const mapboxRef = useRef<mapboxgl.Map | null>(null);
  const mapboxContainerRef = useRef<any>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!mapboxRef.current || !mapReady) return;

    const { lat, lon, alt } = coordinates;

    if (disabled) {
      mapboxRef.current.setCenter([lon, lat]);
      mapboxRef.current.setZoom(alt);
    }
  }, [coordinates]);

  useEffect(() => {
    if (!mapboxRef.current || !mapReady || !marker) return;

    // remove existing marker if it exists
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // create a marker
    const { lat, lon } = marker;
    markerRef.current = new mapboxgl.Marker({
      color: '#212121',
      scale: 0.75,
      draggable: false,
    })
      .setLngLat({ lat, lng: lon })
      .addTo(mapboxRef.current);
  }, [marker]);

  useEffect(() => {
    if (!mapboxContainerRef.current || !token) return;

    // initiate mapbox
    mapboxgl.accessToken = token;

    // set the mapbox config
    let mapboxConfig: MapOptions = {
      container: mapboxContainerRef.current,
      projection: 'equirectangular',
      style: MAPBOX_STYLE,
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
    };

    // set initial coordinates
    if (coordinates) {
      const { lat, lon, alt } = coordinates;
      mapboxConfig = {
        ...mapboxConfig,
        center: [lon, lat],
        zoom: alt,
      };
    }

    if (disabled) {
      mapboxConfig = {
        ...mapboxConfig,
        dragPan: false,
        scrollZoom: false,
      };
    }

    // create a mapbox instance
    mapboxRef.current = new mapboxgl.Map(mapboxConfig);

    if (marker) {
      // remove existing marker if it exists
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // create a marker
      const { lat, lon } = marker;
      markerRef.current = new mapboxgl.Marker({
        color: '#212121',
        scale: 0.75,
        draggable: false,
      })
        .setLngLat({ lat, lng: lon })
        .addTo(mapboxRef.current);
    }

    // update on load
    mapboxRef.current.on('load', () => {
      if (!mapboxRef.current) return;

      setMapReady(true);

      if (cursor) {
        mapboxRef.current.getCanvas().style.cursor = cursor;
      }

      // @remove
      // add demo geojson data
      // mapboxRef.current.addSource('earthquakes', {
      //   type: 'geojson',
      //   data: 'https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson',
      // });

      // mapboxRef.current.addLayer({
      //   id: 'earthquakes-layer',
      //   type: 'circle',
      //   source: 'earthquakes',
      //   paint: {
      //     'circle-radius': 5,
      //     'circle-stroke-width': 0,
      //     'circle-color': 'red',
      //     'circle-stroke-color': 'white',
      //   },
      // });

      if (controls) {
        // @todo: customize controls
        mapboxRef.current.addControl(new MapNavigationControl(), 'top-right');
      }
    });

    if (!disabled) {
      mapboxRef.current.on('click', (e) => {
        if (!mapboxRef.current) return;

        const { lat, lng: lon } = e.lngLat;

        // remove existing marker if it exists
        if (markerRef.current) {
          markerRef.current.remove();
        }

        // create a new marker
        markerRef.current = new mapboxgl.Marker({
          color: '#212121',
          scale: 0.75,
          draggable: false,
        })
          .setLngLat({ lat, lng: lon })
          .addTo(mapboxRef.current);

        // update marker coordinates
        if (onMarkerChange) {
          onMarkerChange({ lat, lon });
        }
      });

      // update on move
      if (onMove) {
        mapboxRef.current.on('moveend', () => {
          if (!mapboxRef.current) return;
          const { lng: lon, lat } = mapboxRef.current.getCenter();
          const alt = mapboxRef.current.getZoom();
          onMove({ lat, lon, alt });
        });
      }
    }

    // @todo
    // prevent dragging beyond the visible map area

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapboxRef.current) {
        mapboxRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* <div className="z-20 text-[8px] absolute bottom-2 right-2 bg-white text-black p-2">
        {JSON.stringify(coordinates)}
      </div> */}
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className={cn(className, 'z-10 relative w-full h-full')}
      ></div>
    </div>
  );
};
