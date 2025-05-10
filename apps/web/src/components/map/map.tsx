'use client';

import { cn } from '@repo/ui/lib/utils';
import mapboxgl, {
  MapMouseEvent,
  MapOptions,
  MapTouchEvent,
  Marker,
} from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';

import { dateformat } from '@/lib/date-format';

import { APP_CONFIG } from '@/config';
import { toGeoJson } from '@/lib';

import { MapNavigationControl } from './map-control';
import { addSources, updateSources } from './map.utils';

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

export type MapSourceType = 'point' | 'line';

export type MapSourceData<T = any> = {
  id: string;
  lat: number;
  lon: number;
  properties: T;
};

export type MapSource<T = any> = {
  sourceId: string;
  type: MapSourceType;
  data: MapSourceData<T>[];
  config?: { cluster?: boolean; draggable?: boolean };
  onChange?: (data: MapSourceData[]) => void;
};

const config = {
  style: `mapbox://styles/${APP_CONFIG.MAPBOX.STYLE}`,
  maxZoom: 18,
  minZoom: 2,
  marker: {
    color: `#${APP_CONFIG.MAPBOX.BRAND_COLOR}`,
    scale: 0.75,
    draggable: false,
  },
};

export const MAP_SOURCES = {
  WAYPOINTS: 'waypoints',
  WAYPOINTS_DRAGGABLE: 'waypoints_draggable',
  TRIPS: 'trips',
};

const MAP_LAYERS = {
  WAYPOINTS: 'waypoints',
  WAYPOINTS_ORDER_NUMBER: 'waypoint_order_number',
  WAYPOINTS_DRAGGABLE: 'waypoints_draggable',
  LINES: 'lines',
  CLUSTERS: 'clusters',
};

type Props = {
  token: string;
  mode?: 'basic' | 'trips';
  sources?: MapSource[];
  minZoom?: number;
  maxZoom?: number;
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

export const Map: React.FC<Props> = ({
  className,
  token,
  cursor,
  marker,
  sources = [],
  minZoom = 4,
  maxZoom = 10,
  coordinates = { lat: 48, lon: 7, alt: 5 },
  controls = true,
  markerEnabled = false,
  disabled = false,
  onLoad,
  onMove,
  onMarkerChange,
  onSourceClick,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  const [waypointDraggable, setWaypointDraggable] = useState<{
    id: string;
    lat: number;
    lon: number;
  }>();

  // refs
  const mapboxRef = useRef<mapboxgl.Map | null>(null);
  const mapboxContainerRef = useRef<any>(null);
  const mapboxPopupRef = useRef<mapboxgl.Popup | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const showPopupRef = useRef<boolean>(false);
  const hoverPopupRef = useRef<boolean>(false);
  const waypointDraggableRef = useRef(waypointDraggable);

  // if there is no token, don't render the map
  if (!token) {
    return <></>;
  }

  const handleWaypointMove = ({
    sourceId,
    data,
  }: {
    sourceId: string;
    data: {
      id: string;
      lat: number;
      lon: number;
    };
  }) => {
    const { id, lat, lon } = data;

    const source = sources.find((source) => source.sourceId === sourceId);

    if (source) {
      const { onChange } = source;
      let data = source.data;

      const index = data.findIndex((e) => e.id === id);
      const element = index > -1 ? data[index] : null;

      if (element) {
        data[index] = {
          ...element,
          lat,
          lon,
        };
      }

      if (onChange) {
        onChange(data);
      }
    }
  };

  useEffect(() => {
    waypointDraggableRef.current = waypointDraggable;
  }, [waypointDraggable]);

  // update sources on change
  useEffect(() => {
    if (!mapboxRef.current || !mapLoaded || !sources) return;
    updateSources({ mapbox: mapboxRef.current, sources });
  }, [sources]);

  // update coordinates on change
  useEffect(() => {
    if (!mapboxRef.current || !mapLoaded) return;

    const { lat, lon, alt } = coordinates;

    if (disabled) {
      mapboxRef.current.setCenter([lon, lat]);
      mapboxRef.current.setZoom(alt);
    }
  }, [coordinates]);

  // update a marker on change
  useEffect(() => {
    if (!mapboxRef.current || !mapLoaded || !marker) return;

    // remove existing marker if it exists
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // create a marker
    const { lat, lon } = marker;
    markerRef.current = new mapboxgl.Marker(config.marker)
      .setLngLat({ lat, lng: lon })
      .addTo(mapboxRef.current);
  }, [marker]);

  // render the map
  useEffect(() => {
    mapboxgl.accessToken = token;

    // check if the container element available
    if (!mapboxContainerRef.current) return;

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

    // create a mapbox instance
    let mapboxConfig: MapOptions = {
      container: mapboxContainerRef.current,
      style: config.style,
      maxZoom: maxZoom ? maxZoom : config.maxZoom,
      minZoom: minZoom ? minZoom : config.minZoom,
    };

    if (coordinates) {
      mapboxConfig = {
        ...mapboxConfig,
        center: [coordinates.lon, coordinates.lat],
        zoom: coordinates.alt,
      };
    } else {
      mapboxConfig = {
        ...mapboxConfig,
        center: [
          APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON,
          APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT,
        ],
        zoom: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT,
      };
    }

    if (disabled) {
      mapboxConfig = {
        ...mapboxConfig,
        dragPan: false,
        scrollZoom: false,
      };
    }

    mapboxRef.current = new mapboxgl.Map(mapboxConfig);

    const canvas = mapboxRef.current.getCanvasContainer();

    // set max bounds
    const bounds = new mapboxgl.LngLatBounds([-180, -85], [180, 85]);
    mapboxRef.current.setMaxBounds(bounds);

    // create a marker
    if (marker) {
      // remove existing marker if it exists
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // create a marker
      const { lat, lon } = marker;
      markerRef.current = new mapboxgl.Marker(config.marker)
        .setLngLat({ lat, lng: lon })
        .addTo(mapboxRef.current);
    }

    function onWaypointMouseMove(e: MapMouseEvent | MapTouchEvent) {
      const { lat, lng: lon } = e.lngLat;

      canvas.style.cursor = 'grabbing';

      if (waypointDraggableRef.current) {
        const id = waypointDraggableRef.current.id;

        console.log('move', { id, lat, lon });
      }

      // geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
      // mapRef.current.getSource('point').setData(geojson);
    }

    function onWaypointMouseUp(e: MapMouseEvent | MapTouchEvent) {
      const { lat, lng: lon } = e.lngLat;

      console.log('up', { id: waypointDraggableRef.current?.id, lat, lon });

      canvas.style.cursor = '';

      if (waypointDraggableRef.current) {
        handleWaypointMove({
          sourceId: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
          data: { id: waypointDraggableRef.current.id, lat, lon },
        });
      }

      mapboxRef.current!.off('mousemove', onWaypointMouseMove);
      mapboxRef.current!.off('touchmove', onWaypointMouseMove);
    }

    // update mapbox on load
    mapboxRef.current.on('load', () => {
      setMapLoaded(true);

      if (!mapboxRef.current) return;

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

      // add layers
      mapboxRef.current.addLayer({
        id: MAP_LAYERS.WAYPOINTS,
        type: 'circle',
        source: MAP_SOURCES.WAYPOINTS,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            // dynamic point sizes ([zoom, radius])
            ...[5, 5],
            ...[8, 8],
            ...[12, 12],
            ...[15, 12],
          ],
          'circle-stroke-width': 2,
          'circle-color': config.marker.color,
          'circle-stroke-color': '#ffffff',
        },
      });

      mapboxRef.current.addLayer({
        id: MAP_LAYERS.LINES,
        type: 'line',
        source: MAP_SOURCES.TRIPS,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': `#${APP_CONFIG.MAPBOX.BRAND_COLOR}`,
          'line-width': 3,
        },
      });

      mapboxRef.current.addLayer({
        id: MAP_LAYERS.WAYPOINTS_DRAGGABLE,
        type: 'circle',
        source: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            // dynamic point sizes ([zoom, radius])
            ...[5, 10],
            ...[8, 10],
            ...[12, 14],
            ...[15, 14],
          ],
          'circle-stroke-width': 2,
          'circle-color': config.marker.color,
          'circle-stroke-color': '#ffffff',
        },
      });

      mapboxRef.current.addLayer({
        id: MAP_LAYERS.WAYPOINTS_ORDER_NUMBER,
        type: 'symbol',
        source: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
        layout: {
          'text-field': ['get', 'index'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            // dynamic font size ([zoom, radius])
            ...[5, 10],
            ...[8, 10],
            ...[12, 14],
            ...[15, 14],
          ],
          'text-anchor': 'center',
          'text-offset': [0, 0],
        },
        paint: {
          'text-color': '#ffffff',
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
      // handle click event
      mapboxRef.current.on('click', (e) => {
        if (!mapboxRef.current) return;

        const { lat, lng: lon } = e.lngLat;

        if (markerEnabled) {
          // remove existing marker if it exists
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // create a new marker
          markerRef.current = new mapboxgl.Marker(config.marker)
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

      // handle waypoint layer click event
      mapboxRef.current!.on('click', MAP_LAYERS.WAYPOINTS, (e) => {
        if (mapboxRef.current && onSourceClick) {
          const sourceId = e.features?.[0].properties?.id;
          onSourceClick(sourceId);
        }
      });

      mapboxRef.current!.on('mouseover', MAP_LAYERS.WAYPOINTS, (e) => {
        if (
          !mapboxRef.current ||
          !mapboxPopupRef.current ||
          !e.features ||
          !e.features?.length
        )
          return;

        // set cursor
        canvas.style.cursor = 'pointer';

        const feature = e.features[0];
        const properties = feature?.properties as {
          id: string;
          title: string;
          content: string;
          date: string;
        };

        const { id, title, content, date } = properties;
        const coordinates = (feature.geometry as any).coordinates as [
          number,
          number,
        ];

        // @todo
        // set custom popup
        // const popupContent = `
        //   <div class="map-popup cursor-pointer">
        //     <div class="flex flex-col justify-start gap-0">
        //       <span class="text-base font-medium">${title}</span>
        //       <span class="text-[0.7rem] font-normal text-gray-800">${dateformat(date).format('MMM DD')}</span>
        //     </div>
        //     <div class="">
        //       <p class="text-sm font-normal text-gray-600">${content ? (content.length < 80 ? content : `${content.slice(0, 80)}..`) : ''}</p>
        //     </div>
        //   </div>
        // `;

        // setTimeout(() => {
        //   mapboxPopupRef
        //     .current!.setLngLat([coordinates[0], coordinates[1]])
        //     .setHTML(popupContent)
        //     .addTo(mapboxRef.current!);

        //   const popupElement = mapboxPopupRef.current!._content;

        //   if (popupElement) {
        //     popupElement.addEventListener('mouseenter', () => {
        //       hoverPopupRef.current = true;
        //     });

        //     popupElement.addEventListener('mouseleave', () => {
        //       hoverPopupRef.current = false;

        //       setTimeout(() => {
        //         if (!hoverPopupRef.current) {
        //           showPopupRef.current = false;
        //           mapboxPopupRef.current!.remove();
        //         }
        //       }, 250);
        //     });
        //   }

        //   showPopupRef.current = true;
        // }, 250);
      });

      mapboxRef.current!.on('mouseleave', MAP_LAYERS.WAYPOINTS, () => {
        if (!mapboxPopupRef.current) return;

        // reset cursor
        canvas.style.cursor = '';

        // remove popup
        setTimeout(() => {
          if (!hoverPopupRef.current) {
            mapboxPopupRef.current!.remove();
            showPopupRef.current = false;
          }
        }, 100);
      });

      mapboxRef.current!.on(
        'mouseover',
        MAP_LAYERS.WAYPOINTS_DRAGGABLE,
        (e) => {
          if (
            !mapboxRef.current ||
            !mapboxPopupRef.current ||
            !e.features ||
            !e.features?.length
          )
            return;

          // set cursor
          canvas.style.cursor = 'move';

          // const feature = e.features[0];
          // const properties = feature?.properties as {
          //   id: string;
          //   title: string;
          //   content: string;
          //   date: string;
          // };

          // const { id, title, content, date } = properties;
          // const coordinates = (feature.geometry as any).coordinates as [
          //   number,
          //   number,
          // ];
        },
      );

      mapboxRef.current!.on(
        'mouseleave',
        MAP_LAYERS.WAYPOINTS_DRAGGABLE,
        () => {
          // reset cursor
          canvas.style.cursor = '';
        },
      );

      mapboxRef.current.on('mousedown', MAP_LAYERS.WAYPOINTS_DRAGGABLE, (e) => {
        e.preventDefault();
        canvas.style.cursor = 'grab';

        const { lat, lng: lon } = e.lngLat;
        const properties = e.features?.[0]?.properties as { id: string };
        const waypointId = properties.id;

        if (waypointId) {
          setWaypointDraggable({ id: waypointId, lat, lon });
          mapboxRef.current!.on('mousemove', onWaypointMouseMove);
          mapboxRef.current!.once('mouseup', onWaypointMouseUp);
        }
      });

      mapboxRef.current.on(
        'touchstart',
        MAP_LAYERS.WAYPOINTS_DRAGGABLE,
        (e) => {
          if (e.points.length !== 1) return;
          e.preventDefault();
          mapboxRef.current!.on('touchmove', onWaypointMouseMove);
          mapboxRef.current!.once('touchend', onWaypointMouseUp);
        },
      );

      mapboxRef.current!.on('mouseleave', MAP_LAYERS.WAYPOINTS, () => {
        if (!mapboxPopupRef.current) return;

        // reset cursor
        canvas.style.cursor = '';

        // remove popup
        setTimeout(() => {
          if (!hoverPopupRef.current) {
            mapboxPopupRef.current!.remove();
            showPopupRef.current = false;
          }
        }, 100);
      });

      // update on map drag
      mapboxRef.current.on('moveend', () => {
        // get coordinates
        const { lng: lon, lat } = mapboxRef.current!.getCenter();
        const alt = mapboxRef.current!.getZoom();

        // get bounds
        const bounds = mapboxRef.current!.getBounds();
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

      // update on map zoom
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
      <div className="absolute bottom-5 right-5 z-20 bg-white text-black text-xs">
        {JSON.stringify({ d: waypointDraggable })}
      </div>
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className="z-10 w-full h-full"
      ></div>
    </div>
  );
};
