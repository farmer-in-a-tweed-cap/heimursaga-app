'use client';

import { cn } from '@repo/ui/lib/utils';
import mapboxgl, { MapOptions, Marker } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { dateformat } from '@/lib/date-format';

import { APP_CONFIG } from '@/config';
import { toGeoJson } from '@/lib';

import { MapNavigationControl } from './map-control';

export type MapOnLoadHandler = (data: MapOnLoadHandlerValue) => void;

export type MapOnLoadHandlerValue = {
  mapbox: mapboxgl.Map | null;
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

export type MapOnSourceClickHandler = (sourceId: string) => void;

type Props = {
  token: string;
  mode?: 'basic' | 'trips';
  sources?: MapSource[];
  coordinates?: { lat: number; lon: number; alt: number };
  marker?: { lat: number; lon: number };
  className?: string;
  cursor?: string;
  controls?: boolean;
  disabled?: boolean;
  markerEnabled?: boolean;
  width?: number;
  height?: number;
  onLoad?: MapOnLoadHandler;
  onMove?: MapOnMoveHandler;
  onSourceClick?: MapOnSourceClickHandler;
  onMarkerChange?: (data: { lat: number; lon: number }) => void;
};

type MapSourceId = 'waypoints' | 'trips';

type MapSource<T = any> = {
  source: MapSourceId;
  data: { lat: number; lon: number; properties: T }[];
};

const config = {
  mapbox: {
    style: `mapbox://styles/${APP_CONFIG.MAPBOX.STYLE}`,
    maxZoom: 18,
    minZoom: 4,
    marker: {
      color: `#${APP_CONFIG.MAPBOX.BRAND_COLOR}`,
      scale: 0.75,
      draggable: false,
    },
  },
};

const SOURCES = {
  WAYPOINTS: 'waypoints',
  TRIPS: 'trips',
};

const LAYERS = {
  MARKERS: 'markers',
  WAYPOINTS: 'waypoints',
  CLUSTERS: 'clusters',
};

const addSources = ({
  mapbox,
  sources,
}: {
  mapbox: mapboxgl.Map;
  sources: MapSource[];
}) => {
  try {
    if (!mapbox) return;

    sources.forEach(({ source, data }) => {
      mapbox.addSource(source, {
        type: 'geojson',
        data: toGeoJson({ mode: source, data }),
      });
    });
  } catch (e) {
    console.error(e);
  }
};

const updateSources = ({
  mapbox,
  sources,
}: {
  mapbox: mapboxgl.Map;
  sources: MapSource[];
}) => {
  try {
    if (!mapbox) return;

    sources.forEach(({ source: id, data }) => {
      const source = mapbox.getSource(id) as mapboxgl.GeoJSONSource;
      source.setData(
        toGeoJson({
          mode: id,
          data: data.map(({ lat, lon, properties }) => ({
            lat,
            lon,
            properties,
          })),
        }),
      );
    });
  } catch (e) {
    console.error(e);
  }
};

export const Map: React.FC<Props> = ({
  className,
  token,
  mode = 'basic',
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
  onSourceClick,
}) => {
  const [mapReady, setMapReady] = useState(false);

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

  const showPopupRef = useRef<boolean>(false);
  const hoverPopupRef = useRef<boolean>(false);

  // update sources on change
  useEffect(() => {
    if (!mapboxRef.current || !mapReady || !sources) return;
    updateSources({ mapbox: mapboxRef.current, sources });
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
    markerRef.current = new mapboxgl.Marker(config.mapbox.marker)
      .setLngLat({ lat, lng: lon })
      .addTo(mapboxRef.current);
  }, [marker]);

  useEffect(() => {
    if (!mapboxContainerRef.current || !token) return;

    // resize the map on the container resize
    let rafId: number;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (mapboxRef.current) {
          mapboxRef.current!.resize();
        }
      });
    });

    resizeObserver.observe(mapboxContainerRef.current);

    console.log('map:render');

    // initiate mapbox
    mapboxgl.accessToken = token;

    // set the mapbox config
    let mapboxConfig: MapOptions = {
      container: mapboxContainerRef.current,
      projection: 'equirectangular',
      style: config.mapbox.style,
      maxZoom: config.mapbox.maxZoom,
      minZoom: config.mapbox.minZoom,
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
      markerRef.current = new mapboxgl.Marker(config.mapbox.marker)
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
          mapbox: mapboxRef.current,
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
        addSources({ mapbox: mapboxRef.current, sources });
      }

      // add circle layer with dynamic size
      mapboxRef.current.addLayer({
        id: LAYERS.WAYPOINTS,
        type: 'circle',
        source: SOURCES.WAYPOINTS,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            // dynamic point sizes ([zoom, radius])
            ...[5, 4],
            ...[8, 6],
            ...[12, 10],
            ...[15, 10],
          ],
          'circle-stroke-width': 2,
          'circle-color': config.mapbox.marker.color,
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
          markerRef.current = new mapboxgl.Marker(config.mapbox.marker)
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

      // handle source click
      mapboxRef.current!.on('click', LAYERS.WAYPOINTS, (e) => {
        if (mapboxRef.current && onSourceClick) {
          const sourceId = e.features?.[0].properties?.id;
          onSourceClick(sourceId);
        }
      });

      // on popoup hover
      mapboxRef.current!.on('mouseover', LAYERS.WAYPOINTS, (e) => {
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
        const { title, content, date } = feature.properties as {
          title: string;
          id: string;
          content: string;
          date: string;
        };

        // set custom popup
        const popupContent = `
          <div class="map-popup cursor-pointer">
            <div class="flex flex-col justify-start gap-0">
              <span class="text-base font-medium">${title}</span>
              <span class="text-[0.7rem] font-normal text-gray-800">${dateformat(date).format('MMM DD')}</span>
            </div>
            <div class="">
              <p class="text-sm font-normal text-gray-600">${content ? (content.length < 80 ? content : `${content.slice(0, 80)}..`) : ''}</p>
            </div>
          </div>
        `;

        setTimeout(() => {
          mapboxPopupRef
            .current!.setLngLat([coordinates[0], coordinates[1]])
            .setHTML(popupContent)
            .addTo(mapboxRef.current!);

          const popupElement = mapboxPopupRef.current!._content;

          if (popupElement) {
            popupElement.addEventListener('mouseenter', () => {
              hoverPopupRef.current = true;
            });

            popupElement.addEventListener('mouseleave', () => {
              hoverPopupRef.current = false;

              setTimeout(() => {
                if (!hoverPopupRef.current) {
                  showPopupRef.current = false;
                  mapboxPopupRef.current!.remove();
                }
              }, 250);
            });
          }

          showPopupRef.current = true;
        }, 250);
      });

      mapboxRef.current!.on('mouseleave', LAYERS.WAYPOINTS, () => {
        if (!mapboxPopupRef.current) return;

        // reset cursor
        mapboxRef.current!.getCanvas().style.cursor = '';

        // remove popup
        setTimeout(() => {
          if (!hoverPopupRef.current) {
            mapboxPopupRef.current!.remove();
            showPopupRef.current = false;
          }
        }, 100);
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
    // 1. prevent dragging beyond the visible map area

    // resize the map on the container element resize

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);

      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapboxRef.current) {
        mapboxRef.current.remove();
      }
    };
  }, []);

  return (
    <div className={cn(className, 'relative w-full h-full')}>
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className="z-10 w-full h-full"
      ></div>
    </div>
  );
};
