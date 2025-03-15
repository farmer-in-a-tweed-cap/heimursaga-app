'use client';

import { cn } from '@repo/ui/lib/utils';
import mapboxgl, { MapOptions, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { MAPBOX_STYLE } from '@/constants';

import { MapNavigationControl } from './map-control';

export type MapOnMoveHandlerValue = {
  lat: number;
  lon: number;
  alt: number;
  bounds?: {
    ne: { lat: number; lon: number };
    sw: { lat: number; lon: number };
  };
};

export type MapOnMoveHandler = (data: MapOnMoveHandlerValue) => void;

type Props = {
  token: string;
  sources?: {
    results: number;
    geojson: any;
  };
  coordinates?: { lat: number; lon: number; alt: number };
  marker?: { lat: number; lon: number };
  className?: string;
  cursor?: string;
  controls?: boolean;
  disabled?: boolean;
  markerEnabled?: boolean;
  onMove?: MapOnMoveHandler;
  onMarkerChange?: (data: { lat: number; lon: number }) => void;
};

const MAP_SOURCE = 'source';

const BRAND_COLOR = '#AA6C46';

const markerConfig = {
  color: BRAND_COLOR,
  scale: 0.75,
  draggable: false,
};

export const Map: React.FC<Props> = ({
  className,
  token,
  cursor,
  marker,
  sources,
  coordinates = { lat: 48, lon: 7, alt: 5 },
  controls = true,
  markerEnabled = false,
  disabled = false,
  onMove,
  onMarkerChange,
}) => {
  const [mapReady, setMapReady] = useState(false);
  const [sourceAdded, setSourceAdded] = useState<boolean>(false);

  const [map, setMap] = useState<{
    bounds: {
      ne: { lat: number; lon: number };
      sw: { lat: number; lon: number };
    };
  }>({
    bounds: {
      ne: { lat: 0, lon: 0 },
      sw: { lat: 0, lon: 0 },
    },
  });

  const mapboxRef = useRef<mapboxgl.Map | null>(null);
  const mapboxContainerRef = useRef<any>(null);
  const markerRef = useRef<Marker | null>(null);

  // @todo
  // useEffect(() => {
  //   if (!mapboxRef.current || !mapReady || !sources) return;

  //   const { geojson } = sources;

  //   const source = mapboxRef.current.getSource(
  //     MAP_SOURCE,
  //   ) as mapboxgl.GeoJSONSource;

  //   source.setData(geojson);
  // }, [sources]);

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
    markerRef.current = new mapboxgl.Marker(markerConfig)
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
      maxZoom: 18,
      minZoom: 4,
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
      markerRef.current = new mapboxgl.Marker(markerConfig)
        .setLngLat({ lat, lng: lon })
        .addTo(mapboxRef.current);
    }

    // update on load
    mapboxRef.current.on('load', () => {
      if (!mapboxRef.current) return;

      setMapReady(true);

      // set sources
      mapboxRef.current.addSource(MAP_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      if (sources) {
        const { geojson } = sources;

        const source = mapboxRef.current.getSource(
          MAP_SOURCE,
        ) as mapboxgl.GeoJSONSource;

        source.setData(geojson);

        mapboxRef.current.addLayer({
          id: 'posts-layer',
          type: 'circle',
          source: MAP_SOURCE,
          paint: {
            'circle-radius': 5,
            // : [
            //   'interpolate',
            //   ['linear'],
            //   ['zoom'],
            //   5,
            //   4,
            //   10,
            //   8,
            //   15,
            //   12,
            // ],
            'circle-stroke-width': 1,
            'circle-color': BRAND_COLOR,
            'circle-stroke-color': '#ffffff',
          },
        });
      }

      if (cursor) {
        mapboxRef.current.getCanvas().style.cursor = cursor;
      }

      if (controls) {
        mapboxRef.current.addControl(new MapNavigationControl(), 'top-right');
      }
    });

    if (!disabled) {
      mapboxRef.current.on('click', (e) => {
        if (!mapboxRef.current) return;

        const { lat, lng: lon } = e.lngLat;

        if (markerEnabled) {
          // remove existing marker if it exists
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // create a new marker
          markerRef.current = new mapboxgl.Marker(markerConfig)
            .setLngLat({ lat, lng: lon })
            .addTo(mapboxRef.current);

          // update marker coordinates
          if (onMarkerChange) {
            onMarkerChange({ lat, lon });
          }
        }
      });

      // update on move
      mapboxRef.current.on('moveend', () => {
        if (!mapboxRef.current) return;

        // get coordinates
        const { lng: lon, lat } = mapboxRef.current.getCenter();
        const alt = mapboxRef.current.getZoom();

        // get bounds
        const bounds = mapboxRef.current.getBounds();
        const ne = bounds?.getNorthEast(); // northeast corner
        const sw = bounds?.getSouthWest(); // southwest corner

        // update state
        if (onMove) {
          onMove({
            lat,
            lon,
            alt,
            bounds:
              ne && sw
                ? {
                    ne: { lat: ne.lat, lon: ne.lng },
                    sw: { lat: sw.lat, lon: sw.lng },
                  }
                : undefined,
          });
        }
      });

      // update on zoom
      mapboxRef.current.on('zoomend', (e) => {
        if (!mapboxRef.current) return;

        // get coordinates
        const { lng: lon, lat } = mapboxRef.current.getCenter();
        const alt = mapboxRef.current.getZoom();

        // get bounds
        const bounds = mapboxRef.current.getBounds();
        const ne = bounds?.getNorthEast(); // northeast corner
        const sw = bounds?.getSouthWest(); // southwest corner

        // update state
        if (onMove) {
          onMove({
            lat,
            lon,
            alt,
            bounds:
              ne && sw
                ? {
                    ne: { lat: ne.lat, lon: ne.lng },
                    sw: { lat: sw.lat, lon: sw.lng },
                  }
                : undefined,
          });
        }
      });
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
        {JSON.stringify({ sources: sources?.results || 0, map })}
      </div>
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className={cn(className, 'z-10 relative w-full h-full')}
      ></div>
    </div>
  );
};
