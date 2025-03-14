'use client';

import { cn } from '@repo/ui/lib/utils';
import mapboxgl, { MapOptions, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { MAPBOX_STYLE } from '@/constants';

import { MapNavigationControl } from './map-control';

type Props = {
  token: string;
  sources?: { id: string; lat: number; lon: number }[];
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
  sources,
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

      if (sources) {
        // add sources
        mapboxRef.current.addSource('earthquakes', {
          type: 'geojson',
          // demo data
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994521',
                  mag: 2.3,
                  time: 1507425650893,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-151.5129, 63.1016, 0.0],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994519',
                  mag: 1.7,
                  time: 1507425289659,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-150.4048, 63.1224, 105.5],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994517',
                  mag: 1.6,
                  time: 1507424832518,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-151.3597, 63.0781, 0.0],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ci38021336',
                  mag: 1.42,
                  time: 1507423898710,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-118.497, 34.299667, 7.64],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'us2000b2nn',
                  mag: 4.2,
                  time: 1507422626990,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-87.6901, 12.0623, 46.41],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994510',
                  mag: 1.6,
                  time: 1507422449194,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-151.5053, 63.0719, 0.0],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'us2000b2nb',
                  mag: 4.6,
                  time: 1507420784440,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-178.4576, -20.2873, 614.26],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994298',
                  mag: 2.4,
                  time: 1507419370097,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-148.789, 63.1725, 7.5],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'nc72905861',
                  mag: 1.39,
                  time: 1507418785100,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-120.993164, 36.421833, 6.37],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ci38021304',
                  mag: 1.11,
                  time: 1507418426010,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-117.0155, 33.656333, 12.37],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994293',
                  mag: 1.5,
                  time: 1507417256497,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-151.512, 63.0879, 10.8],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994287',
                  mag: 2.0,
                  time: 1507413903714,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-151.4378, 63.0933, 0.0],
                },
              },
              {
                type: 'Feature',
                properties: {
                  id: 'ak16994285',
                  mag: 1.5,
                  time: 1507413670029,
                  felt: null,
                  tsunami: 0,
                },
                geometry: {
                  type: 'Point',
                  coordinates: [-149.6538, 63.2272, 96.8],
                },
              },
            ],
            // features: sources.map(({ id, lat, lon }) => ({
            //   type: 'Feature',
            //   properties: {
            //     id,
            //     mag: 2.3,
            //     time: 1507425650893,
            //     felt: null,
            //     tsunami: 0,
            //   },
            //   geometry: {
            //     type: 'Point',
            //     coordinates: [lat, lon, 0.0],
            //   },
            // })),
          },
        });

        mapboxRef.current.addLayer({
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
      }

      if (controls) {
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
      <div className="z-20 text-[8px] absolute bottom-2 right-2 bg-white text-black p-2">
        {JSON.stringify({ sources: sources?.length || 0 })}
      </div>
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className={cn(className, 'z-10 relative w-full h-full')}
      ></div>
    </div>
  );
};
