'use client';

import { cn } from '@repo/ui/lib/utils';
import { GeoJsonObject } from 'geojson';
import mapboxgl, { GeoJSONFeature, MapOptions, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { dateformat } from '@/lib/date-format';

import { MAPBOX_STYLE } from '@/constants';
import { ROUTER } from '@/router';

import { MapNavigationControl } from './map-control';

export type MapOnLoadHandler = (data: MapOnLoadHandlerValue) => void;

export type MapOnLoadHandlerValue = {
  bounds?: {
    ne: { lat: number; lon: number };
    sw: { lat: number; lon: number };
  };
};

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
  onLoad?: MapOnLoadHandler;
  onMove?: MapOnMoveHandler;
  onMarkerChange?: (data: { lat: number; lon: number }) => void;
};

const MAP_SOURCE = {
  ID: 'markers',
  LAYER_ID: 'markers-layer',
};

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
  onLoad,
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
  const mapboxPopupRef = useRef<mapboxgl.Popup | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!mapboxRef.current || !mapReady || !sources) return;

    console.log('map:sources');

    const { geojson } = sources;

    const source = mapboxRef.current.getSource(
      MAP_SOURCE.ID,
    ) as mapboxgl.GeoJSONSource;

    source.setData(geojson);
  }, [sources]);

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

    console.log('map:render');

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

      // get coordinates
      const { lng: lon, lat } = mapboxRef.current.getCenter();
      const alt = mapboxRef.current.getZoom();

      // get bounds
      const bounds = mapboxRef.current.getBounds();
      const ne = bounds?.getNorthEast(); // northeast corner
      const sw = bounds?.getSouthWest(); // southwest corner

      // set initial props
      if (onLoad) {
        onLoad({
          bounds:
            ne && sw
              ? {
                  ne: { lat: ne.lat, lon: ne.lng },
                  sw: { lat: sw.lat, lon: sw.lng },
                }
              : undefined,
        });
      }

      // add sources
      if (sources) {
        const { geojson } = sources;

        mapboxRef.current.addSource(MAP_SOURCE.ID, {
          type: 'geojson',
          data: geojson,
        });
      } else {
        mapboxRef.current.addSource(MAP_SOURCE.ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // add circle layer with dynamic size
      mapboxRef.current.addLayer({
        id: MAP_SOURCE.LAYER_ID,
        type: 'circle',
        source: MAP_SOURCE.ID,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            // dynamic point sizes ([zoom, radius])
            ...[5, 5],
            ...[8, 12],
            ...[12, 12],
            ...[15, 12],
          ],
          'circle-stroke-width': 1,
          'circle-color': BRAND_COLOR,
          'circle-stroke-color': '#ffffff',
        },
      });

      // set cursor
      if (cursor) {
        mapboxRef.current.getCanvas().style.cursor = cursor;
      }

      // set controls
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

      // set popup
      mapboxPopupRef.current = new mapboxgl.Popup({
        closeOnMove: true,
        closeButton: false,
        anchor: 'top',
        offset: 15,
      });

      // on popup click
      mapboxRef.current!.on('click', MAP_SOURCE.LAYER_ID, (e) => {
        if (!mapboxRef.current) return;

        const id = e?.features?.[0]?.properties?.id;

        if (id) {
          window.open(ROUTER.POSTS.DETAIL(id), '_blank');
        }
      });

      // on popoup hover
      mapboxRef.current!.on('mouseover', MAP_SOURCE.LAYER_ID, (e) => {
        if (
          !mapboxRef.current ||
          !mapboxPopupRef.current ||
          !e.features ||
          !e.features?.length
        )
          return;

        // set cursor
        mapboxRef.current!.getCanvas().style.cursor = 'pointer';

        const feature = e.features[0];
        const coordinates = (feature.geometry as any).coordinates.slice();
        const { title, id, content, date } = feature.properties as {
          title: string;
          id: string;
          content: string;
          date: string;
        };

        // set custom popup
        const popupContent = `
          <div class="map-popup">
            <div class="flex flex-col justify-start">
              <span class="text-sm font-medium">${title}</span>
              <span class="text-[0.625rem] font-normal text-gray-800">${dateformat(date).format('MMM DD')}</span>
            </div>
            <div class="mt-2">
              <p class="text-xs font-normal">${content ? (content.length < 80 ? content : `${content.slice(0, 80)}..`) : ''}</p>
            </div>
          </div>
        `;

        mapboxPopupRef
          .current!.setLngLat([coordinates[0], coordinates[1]])
          .setHTML(popupContent)
          .addTo(mapboxRef.current!);
      });

      mapboxRef.current!.on('mouseleave', MAP_SOURCE.LAYER_ID, () => {
        if (!mapboxPopupRef.current) return;

        // reset cursor
        mapboxRef.current!.getCanvas().style.cursor = '';

        // remove popup
        mapboxPopupRef.current.remove();
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
        {JSON.stringify({ sources: sources?.results || 0 })}
      </div>
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className={cn(className, 'z-10 relative w-full h-full')}
      ></div>
    </div>
  );
};
