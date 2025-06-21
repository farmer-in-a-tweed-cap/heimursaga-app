'use client';

import { cn } from '@repo/ui/lib/utils';
import mapboxgl, {
  LngLat,
  MapEvent,
  MapMouseEvent,
  MapOptions,
  MapTouchEvent,
  Marker,
} from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { APP_CONFIG } from '@/config';
import {
  MapBoundsValue,
  MapCoordinatesValue,
  MapLoadHandler,
  MapMoveHandler,
} from '@/hooks';
import { dateformat } from '@/lib';

import { MapNavigationControl } from './map-control';
import { addSources, updateSources } from './map.utils';

export type MapSourceType = 'point' | 'line';

export type MapSourceData<T = any> = {
  id: number;
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

export type MapLayer = {
  layerId: string;
  radius?: number;
};

const config = {
  style: `mapbox://styles/${APP_CONFIG.MAPBOX.STYLE}`,
  maxZoom: 18,
  minZoom: 2,
  point: {
    radius: 12,
    color: `#${APP_CONFIG.MAPBOX.BRAND_COLOR}`,
    colorHover: `#000`,
    scale: 0.75,
    draggable: false,
  },
  cluster: {
    radius: 12,
    color: `#${APP_CONFIG.MAPBOX.BRAND_COLOR}`,
    colorHover: `#000`,
  },
};

export const MAP_SOURCES = {
  WAYPOINTS: 'waypoints',
  WAYPOINT_LINES: 'waypoint_lines',
  WAYPOINTS_DRAGGABLE: 'waypoints_draggable',
  TRIP_WAYPOINTS: 'trip_waypoints',
  TRIP_WAYPOINT_ORDER_NUMBERS: 'trip_waypoint_order_numbers',
  TRIP_LINES: 'trip_lines',
};

export const MAP_LAYERS = {
  WAYPOINTS: 'waypoints',
  WAYPOINT_ORDER_NUMBERS: 'waypoint_order_numbers',
  WAYPOINT_LINES: 'waypoint_lines',
  WAYPOINTS_DRAGGABLE: 'waypoints_draggable',
  WAYPOINTS_DRAGGABLE_ORDER_NUMBER: 'waypoint_draggable_order_number',
  TRIP_WAYPOINTS: 'trip_waypoints',
  TRIP_WAYPOINT_ORDER_NUMBERS: 'trip_waypoint_order_numbers',
  TRIP_LINES: 'trip_lines',
  CLUSTERS: 'clusters',
  CLUSTER_COUNT: 'cluster_count',
};

const MAP_FEATURE_STATE = {
  WAYPOINT_HOVER: 'waypoint_hover',
  TRIP_WAYPOINT_HOVER: 'trip_waypoint_hover',
};

type Props = {
  token: string;
  mode?: 'basic' | 'trips';
  sources?: MapSource[];
  styles?: {
    layer?: {
      waypoint: {
        radius: number;
      };
    };
  };
  layers?: { id: string; source: string }[];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  center?: MapCoordinatesValue;
  marker?: MapCoordinatesValue;
  bounds?: MapBoundsValue;
  className?: string;
  cursor?: string;
  controls?: boolean;
  disabled?: boolean;
  markerEnabled?: boolean;
  width?: number;
  height?: number;
  onLoad?: MapLoadHandler;
  onMove?: MapMoveHandler;
  onSourceClick?: MapOnSourceClickHandler;
  onWaypointMove?: MapWaypointMoveHandler;
  onMarkerChange?: (data: { lat: number; lon: number }) => void;
};

export type MapWaypointMoveHandler = (
  waypoint: MapCoordinatesValue & { id: number },
) => void;

export type MapOnSourceClickHandler = (sourceId: string) => void;

type PopupState = {
  visible?: boolean;
  hovered?: boolean;
  content?: string;
  lon?: number;
  lat?: number;
};

export const Map: React.FC<Props> = ({
  className,
  token,
  cursor,
  marker,
  sources = [],
  layers = [],
  styles,
  minZoom = 0,
  maxZoom = 15,
  center = {
    lat: APP_CONFIG.MAP.DEFAULT.CENTER.LAT,
    lon: APP_CONFIG.MAP.DEFAULT.CENTER.LON,
  },
  zoom = APP_CONFIG.MAP.DEFAULT.ZOOM,
  controls = true,
  markerEnabled = false,
  disabled = false,
  bounds,
  onLoad,
  onMove,
  onMarkerChange,
  onWaypointMove,
  onSourceClick,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const isInternalUpdate = useRef<boolean>(false);

  const [_waypointDraggable, setWaypointDraggable] = useState<{
    id: number;
    lat: number;
    lon: number;
  } | null>(null);
  const [waypointDraggable] = useDebounce(_waypointDraggable, 100);
  const waypointDraggableId = useRef<number | null>(null);
  const waypointDragging = useRef<boolean>(false);

  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    hovered: false,
    content: '',
    lon: 0,
    lat: 0,
  });

  // refs
  const mapboxRef = useRef<mapboxgl.Map | null>(null);
  const mapboxContainerRef = useRef<any>(null);
  const mapboxPopupRef = useRef<mapboxgl.Popup | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const showPopupRef = useRef<boolean>(false);
  const hoverPopupRef = useRef<boolean>(false);
  const waypointDraggableRef = useRef(waypointDraggable);

  const popupHovered = useRef<boolean>(false);
  const hoveredPointIdRef = useRef<string | null>(null);
  const hoveredClusterIdRef = useRef<string | null>(null);

  // if there is no token, don't render the map
  if (!token) {
    return <></>;
  }

  const handleLoad: MapLoadHandler = (data) => {
    if (!mapboxRef.current) return;

    const { center, zoom, bounds } = data;

    console.log('map: onload', { center, zoom, bounds });

    if (onLoad) {
      onLoad({
        mapbox: mapboxRef.current,
        center,
        zoom,
        bounds,
      });
    }
  };

  const handleMove = () => {
    if (!mapboxRef.current) return;

    isInternalUpdate.current = true;

    // get coordinates
    const { lng: lon, lat } = mapboxRef.current.getCenter();
    const zoom = mapboxRef.current.getZoom();

    // // get bounds
    const bbx = mapboxRef.current!.getBounds();
    const ne = bbx?.getNorthEast();
    const sw = bbx?.getSouthWest();
    const bounds =
      ne && sw
        ? {
            ne: { lat: ne.lat, lon: ne.lng },
            sw: { lat: sw.lat, lon: sw.lng },
          }
        : undefined;

    // update state
    if (onMove) {
      console.log('map: onmove', bounds);

      onMove({
        center: { lat, lon },
        zoom,
        bounds,
      });
    }
  };

  const handleWaypointClick = ({
    event,
    source,
  }: {
    event: MapMouseEvent;
    source: string;
  }) => {
    if (!mapboxRef.current) return;

    if (onSourceClick) {
      const sourceId = event.features?.[0].properties?.id;
      onSourceClick(sourceId);
    }
  };

  const handleWaypointMouseEnter = ({
    event,
    source,
    state = {},
  }: {
    event: MapMouseEvent;
    source: string;
    state?: { [key: string]: number | string | boolean };
  }) => {
    if (
      !mapboxRef.current ||
      !mapboxPopupRef.current ||
      !event.features ||
      !event.features?.length
    )
      return;

    const canvas = mapboxRef.current.getCanvasContainer();
    const feature = event.features[0];
    const pointId = feature.id as string;
    const geometry = feature.geometry as GeoJSON.Point;
    const [lon, lat] = (geometry.coordinates as [number, number]) || [];

    const properties = feature?.properties as {
      id: string;
      title: string;
      content: string;
      date: string;
    };

    // update cursor
    canvas.style.cursor = 'pointer';

    // update styles
    if (pointId) {
      mapboxRef.current.setFeatureState(
        {
          source,
          id: pointId,
        },
        state,
      );

      hoveredPointIdRef.current = pointId;
    }

    // show popup
    popupHovered.current = true;

    const { title = '', content = '', date = new Date() } = properties || {};
    const popupContent = `
      <div class="flex flex-col justify-start">
        <div class="flex flex-col justify-start gap-0">
          <span class="text-base font-medium">${title}</span>
          <span class="text-[0.7rem] font-normal text-gray-500">${dateformat(date).format('MMM DD')}</span>
        </div>
        <div class="mt-2">
          <p class="text-sm font-normal text-gray-500">${content ? (content.length < 50 ? content : `${content.slice(0, 50)}..`) : ''}</p>
        </div>
      </div>
    `;

    setPopup((prev) => ({
      ...prev,
      visible: true,
      lat,
      lon,
      content: popupContent,
    }));

    // const { id, title, content, date } = properties;
    // const coordinates = (feature.geometry as any).coordinates as [
    //   number,
    //   number,
    // ];

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
  };

  const handleWaypointMouseLeave = ({
    source,
    state = {},
  }: {
    event: MapMouseEvent;
    source: string;
    state?: { [key: string]: number | string | boolean };
  }) => {
    if (!mapboxRef.current || !mapboxPopupRef.current) return;

    const canvas = mapboxRef.current.getCanvasContainer();
    const pointId = hoveredPointIdRef.current;

    // update cursor
    canvas.style.cursor = '';

    // update styles
    if (pointId) {
      mapboxRef.current.setFeatureState(
        {
          source,
          id: pointId,
        },
        state,
      );

      hoveredPointIdRef.current = null;
    }

    // remove popup
    setTimeout(() => {
      setPopup((prev) =>
        prev?.hovered
          ? prev
          : {
              ...prev,
              visible: false,
              lat: 0,
              lon: 0,
              content: '',
            },
      );
    }, 100);
  };

  const handleWaypointMouseMove = (e: MapMouseEvent | MapTouchEvent) => {
    if (!mapboxRef.current) return;

    const canvas = mapboxRef.current.getCanvasContainer();
    const { lat, lng: lon } = e.lngLat;

    canvas.style.cursor = 'grabbing';

    if (waypointDraggableRef.current) {
      const id = waypointDraggableRef.current.id;

      console.log('move', { id, lat, lon });
    }

    // geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
    // mapRef.current.getSource('point').setData(geojson);
  };

  const handleWaypointDraggableMouseDown = (
    e: MapMouseEvent | MapTouchEvent,
  ) => {
    e.preventDefault();

    if (!mapboxRef.current) return;

    console.log('waypoint: mousedown');

    waypointDragging.current = true;

    const canvas = mapboxRef.current.getCanvasContainer();
    canvas.style.cursor = 'grabbing';

    const feature = e.features?.[0];
    const waypointId = feature?.id as number;
    const { lat, lng: lon } = e.lngLat;

    // update waypoint
    if (waypointId) {
      waypointDraggableId.current = waypointId;
      setWaypointDraggable(() => ({ id: waypointId, lat, lon }));
    }
  };

  const handleWaypointDraggableMouseUp = (e: MapMouseEvent | MapTouchEvent) => {
    if (!mapboxRef.current) return;
    if (!waypointDragging.current) return;

    const { lat, lng: lon } = e.lngLat;
    const canvas = mapboxRef.current.getCanvasContainer();
    const waypointId = waypointDraggableId.current;

    console.log('waypoint: mouseup');

    if (waypointId) {
      // update waypoint
      if (onWaypointMove) {
        onWaypointMove({
          id: waypointId,
          lat,
          lon,
        });
      }
    }

    waypointDragging.current = false;
    waypointDraggableId.current = null;
    canvas.style.cursor = '';
  };

  const handleWaypointDraggableMouseMove = (
    e: MapMouseEvent | MapTouchEvent,
  ) => {
    if (!mapboxRef.current) return;
    if (!waypointDragging.current) return;

    const waypointId = waypointDraggableId.current;
    const { lat, lng: lon } = e.lngLat;

    console.log('waypoint: mousemove', { waypointId, lat, lon });

    if (waypointId) {
      setWaypointDraggable(() => ({ id: waypointId, lat, lon }));
    }
  };

  useEffect(() => {
    waypointDraggableRef.current = waypointDraggable;
  }, [waypointDraggable]);

  // update a marker on change
  useEffect(() => {
    if (!mapboxRef.current || !mapLoaded || !marker) return;

    // remove existing marker if it exists
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // create a marker
    const { lat, lon } = marker;
    markerRef.current = new mapboxgl.Marker(config.point)
      .setLngLat({ lat, lng: lon })
      .addTo(mapboxRef.current);
  }, [marker]);

  // update sources on change
  useEffect(() => {
    if (!mapboxRef.current || !mapLoaded || !sources) return;
    updateSources({ mapbox: mapboxRef.current, sources });
  }, [sources]);

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
      zoom,
      maxZoom: maxZoom >= 0 ? maxZoom : config.maxZoom,
      minZoom: minZoom >= 0 ? minZoom : config.minZoom,
      bearing: 0,
      dragPan: true,
      scrollZoom: true,
      dragRotate: false,
      touchPitch: false,
    };

    if (center) {
      mapboxConfig = {
        ...mapboxConfig,
        center: [center.lon, center.lat],
      };
    } else {
      if (bounds) {
        mapboxConfig = {
          ...mapboxConfig,
          bounds: [bounds.sw.lon, bounds.sw.lat, bounds.ne.lon, bounds.ne.lat],
        };
      }
    }

    if (disabled) {
      mapboxConfig = {
        ...mapboxConfig,
        dragPan: false,
        scrollZoom: false,
      };
    }

    // create a map
    mapboxRef.current = new mapboxgl.Map(mapboxConfig);

    const canvas = mapboxRef.current.getCanvasContainer();

    // set center
    mapboxRef.current.setCenter({ lat: center.lat, lon: center.lon });
    mapboxRef.current.setZoom(zoom);

    // set max bounds
    const maxBounds = new mapboxgl.LngLatBounds([-180, -85], [180, 85]);
    mapboxRef.current.setMaxBounds(maxBounds);

    // create a marker
    if (marker) {
      // remove existing marker if it exists
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // create a marker
      const { lat, lon } = marker;
      markerRef.current = new mapboxgl.Marker(config.point)
        .setLngLat({ lat, lng: lon })
        .addTo(mapboxRef.current);
    }

    // update mapbox on load
    mapboxRef.current.on('load', (e) => {
      setMapLoaded(true);

      if (!mapboxRef.current) return;

      // get bounds
      const bounds = mapboxRef.current.getBounds();
      const ne = bounds?.getNorthEast();
      const sw = bounds?.getSouthWest();

      // set initial props
      handleLoad({
        mapbox: mapboxRef.current,
        center: { lat: center.lat, lon: center.lon },
        zoom,
        bounds:
          ne && sw
            ? {
                ne: { lat: ne.lat, lon: ne.lng },
                sw: { lat: sw.lat, lon: sw.lng },
              }
            : undefined,
      });

      // add sources
      if (sources) {
        addSources({ mapbox: mapboxRef.current, sources });
      }

      // add layers
      if (layers.length) {
        layers.forEach(({ id, source }) => {
          if (!mapboxRef.current) return;

          switch (id) {
            case MAP_LAYERS.WAYPOINTS:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'circle',
                filter: ['!', ['has', 'point_count']],
                paint: {
                  'circle-radius': styles?.layer?.waypoint.radius
                    ? styles?.layer?.waypoint.radius
                    : [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        ...[0, config.point.radius],
                        ...[5, config.point.radius],
                      ],
                  'circle-color': [
                    'case',
                    [
                      '==',
                      ['feature-state', MAP_FEATURE_STATE.WAYPOINT_HOVER],
                      true,
                    ],
                    config.cluster.colorHover,
                    config.cluster.color,
                  ],
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#ffffff',
                },
              });
              break;
            case MAP_LAYERS.WAYPOINTS_DRAGGABLE:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'circle',
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
                  'circle-stroke-width': 1,
                  'circle-color': config.point.color,
                  'circle-stroke-color': '#ffffff',
                },
              });
              break;
            case MAP_LAYERS.WAYPOINT_ORDER_NUMBERS:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'symbol',
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
              break;
            case MAP_LAYERS.WAYPOINTS_DRAGGABLE_ORDER_NUMBER:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'symbol',
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
              break;
            case MAP_LAYERS.WAYPOINT_LINES:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'line',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': `#${APP_CONFIG.MAPBOX.BRAND_COLOR}`,
                  'line-width': 3,
                },
              });
              break;
            case MAP_LAYERS.TRIP_WAYPOINTS:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'circle',
                filter: ['!', ['has', 'point_count']],
                paint: {
                  'circle-radius': styles?.layer?.waypoint.radius
                    ? styles?.layer?.waypoint.radius
                    : [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        ...[0, config.point.radius],
                        ...[5, config.point.radius],
                      ],
                  'circle-color': [
                    'case',
                    [
                      '==',
                      ['feature-state', MAP_FEATURE_STATE.TRIP_WAYPOINT_HOVER],
                      true,
                    ],
                    config.cluster.colorHover,
                    config.cluster.color,
                  ],
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#ffffff',
                },
              });
              break;
            case MAP_LAYERS.CLUSTERS:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'circle',
                filter: ['has', 'point_count'],
                paint: {
                  'circle-color': [
                    'case',
                    ['==', ['feature-state', 'hovered_cluster'], true],
                    config.cluster.colorHover,
                    config.cluster.color,
                  ],
                  'circle-radius': config.cluster.radius,
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff',
                },
              });
              break;
            case MAP_LAYERS.CLUSTER_COUNT:
              mapboxRef.current.addLayer({
                id,
                source,
                type: 'symbol',
                filter: ['has', 'point_count'],
                layout: {
                  'text-field': '{point_count_abbreviated}',
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                  'text-size': 12,
                },
                paint: {
                  'text-color': '#fff',
                  // 'text-halo-color': 'rgba(0, 0, 0, 0.5)',
                  // 'text-halo-width': 1,
                },
              });
              break;
          }
        });
      }

      // set cursor
      if (cursor) {
        mapboxRef.current.getCanvas().style.cursor = cursor;
      }

      // set controls
      if (controls) {
        mapboxRef.current.addControl(
          new MapNavigationControl(),
          'bottom-right',
        );
      }
    });

    if (disabled) return;

    // set popup
    mapboxPopupRef.current = new mapboxgl.Popup({
      closeOnMove: true,
      closeButton: false,
      anchor: 'top',
      offset: 15,
    });

    // handle events
    mapboxRef.current.on('click', (e) => {
      if (!mapboxRef.current) return;

      const { lat, lng: lon } = e.lngLat;

      if (markerEnabled) {
        // remove existing marker if it exists
        if (markerRef.current) {
          markerRef.current.remove();
        }

        // create a new marker
        markerRef.current = new mapboxgl.Marker(config.point)
          .setLngLat({ lat, lng: lon })
          .addTo(mapboxRef.current);

        // update marker coordinates
        if (onMarkerChange) {
          onMarkerChange({ lat, lon });
        }
      }
    });

    mapboxRef.current.on('moveend', handleMove);

    mapboxRef.current.on('zoomend', handleMove);

    mapboxRef.current!.on('click', MAP_LAYERS.WAYPOINTS, (event) =>
      handleWaypointClick({ event, source: MAP_SOURCES.WAYPOINTS }),
    );

    mapboxRef.current!.on('click', MAP_LAYERS.TRIP_WAYPOINTS, (event) =>
      handleWaypointClick({ event, source: MAP_SOURCES.TRIP_WAYPOINTS }),
    );

    mapboxRef.current!.on('mouseenter', MAP_LAYERS.WAYPOINTS, (event) =>
      handleWaypointMouseEnter({
        event,
        source: MAP_SOURCES.WAYPOINTS,
        state: { [MAP_FEATURE_STATE.WAYPOINT_HOVER]: true },
      }),
    );

    mapboxRef.current!.on('mouseleave', MAP_LAYERS.WAYPOINTS, (event) =>
      handleWaypointMouseLeave({
        event,
        source: MAP_SOURCES.WAYPOINTS,
        state: { [MAP_FEATURE_STATE.WAYPOINT_HOVER]: false },
      }),
    );

    mapboxRef.current!.on('mouseenter', MAP_LAYERS.TRIP_WAYPOINTS, (event) =>
      handleWaypointMouseEnter({
        event,
        source: MAP_SOURCES.TRIP_WAYPOINTS,
        state: { [MAP_FEATURE_STATE.TRIP_WAYPOINT_HOVER]: true },
      }),
    );

    mapboxRef.current!.on('mouseleave', MAP_LAYERS.TRIP_WAYPOINTS, (event) =>
      handleWaypointMouseLeave({
        event,
        source: MAP_SOURCES.TRIP_WAYPOINTS,
        state: { [MAP_FEATURE_STATE.TRIP_WAYPOINT_HOVER]: false },
      }),
    );

    // mapboxRef.current!.on('mouseover', MAP_LAYERS.WAYPOINTS_DRAGGABLE, (e) => {
    //   if (
    //     !mapboxRef.current ||
    //     !mapboxPopupRef.current ||
    //     !e.features ||
    //     !e.features?.length
    //   )
    //     return;

    //   // set cursor
    //   canvas.style.cursor = 'move';

    //   const feature = e.features[0];
    //   const [lon, lat] = (feature.geometry as any).coordinates as [
    //     number,
    //     number,
    //   ];

    //   // console.log('waypoint drag', { lon, lat });

    //   // const feature = e.features[0];
    //   // const properties = feature?.properties as {
    //   //   id: string;
    //   //   title: string;
    //   //   content: string;
    //   //   date: string;
    //   // };

    //   // const { id, title, content, date } = properties;
    //   // const coordinates = (feature.geometry as any).coordinates as [
    //   //   number,
    //   //   number,
    //   // ];
    // });

    // mapboxRef.current!.on('mouseleave', MAP_LAYERS.WAYPOINTS_DRAGGABLE, () => {
    //   // reset cursor
    //   canvas.style.cursor = '';
    // });

    mapboxRef.current!.on(
      'mousedown',
      MAP_LAYERS.WAYPOINTS_DRAGGABLE,
      handleWaypointDraggableMouseDown,
    );

    mapboxRef.current!.on('mouseup', handleWaypointDraggableMouseUp);

    mapboxRef.current!.on('mousemove', handleWaypointDraggableMouseMove);

    // mapboxRef.current!.on('mousedown', MAP_LAYERS.WAYPOINTS_DRAGGABLE, (e) => {
    //   e.preventDefault();

    //   // ch
    //   canvas.style.cursor = 'grab';

    //   console.log('grab');

    //   const { lat, lng: lon } = e.lngLat;
    //   const properties = e.features?.[0]?.properties as { id: string };
    //   const waypointId = properties.id;

    //   if (waypointId) {
    //     setWaypointDraggable({ id: waypointId, lat, lon });
    //     mapboxRef.current!.on('mousemove', handleWaypointMouseMove);
    //     mapboxRef.current!.once('mouseup', handleWaypointMouseUp);
    //   }
    // });

    // @todo
    // mapboxRef.current!.on('touchstart', MAP_LAYERS.WAYPOINTS_DRAGGABLE, (e) => {
    //   if (e.points.length !== 1) return;
    //   e.preventDefault();
    //   mapboxRef.current!.on('touchmove', handleWaypointMouseMove);
    //   mapboxRef.current!.once('touchend', handleWaypointMouseUp);
    // });

    mapboxRef.current!.on('click', MAP_LAYERS.CLUSTERS, (e) => {
      if (!mapboxRef.current || !e.features || !e.features.length) return;

      const feature = e.features[0];
      const clusterId = feature.properties?.cluster_id;
      const geometry = feature.geometry as GeoJSON.Point;
      const coordinates = geometry.coordinates.slice();

      const source = mapboxRef.current.getSource(
        MAP_SOURCES.WAYPOINTS,
      ) as mapboxgl.GeoJSONSource;

      source.getClusterLeaves(clusterId, Infinity, 0, (e, f) => {
        if (!mapboxRef.current) return;

        const features = f || [];

        if (e) {
          console.error('error getting cluster leaves:', e);
          return;
        }

        // calculate bounds from cluster points
        const bounds = new mapboxgl.LngLatBounds();
        features.forEach((feature) => {
          const pointGeometry = feature.geometry as GeoJSON.Point;
          const [lon, lat] = pointGeometry.coordinates;
          bounds.extend([lon, lat]);
        });

        // extend bounds
        const buffer = 0.4;
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const extendedBounds = new mapboxgl.LngLatBounds(
          [sw.lng - buffer, sw.lat - buffer],
          [ne.lng + buffer, ne.lat + buffer],
        );

        // zoom to bounds with padding
        mapboxRef.current.fitBounds(extendedBounds, {
          padding: 0,
          maxZoom: 9,
          duration: 800,
        });
      });
    });

    mapboxRef.current!.on('mouseenter', MAP_LAYERS.CLUSTERS, (e) => {
      if (!mapboxRef.current || !e.features || !e.features.length) return;

      const feature = e.features[0];
      const clusterId = feature.properties?.cluster_id;

      // update cursor
      canvas.style.cursor = 'pointer';

      // update styles
      if (clusterId) {
        hoveredClusterIdRef.current = clusterId;

        mapboxRef.current.setFeatureState(
          {
            source: MAP_SOURCES.WAYPOINTS,
            id: clusterId,
          },
          { hovered_cluster: true },
        );
      }
    });

    mapboxRef.current!.on('mouseleave', MAP_LAYERS.CLUSTERS, () => {
      if (!mapboxRef.current) return;

      const clusterId = hoveredClusterIdRef.current;

      // update cursor
      canvas.style.cursor = '';

      // update styles
      if (clusterId) {
        mapboxRef.current.setFeatureState(
          {
            source: MAP_SOURCES.WAYPOINTS,
            id: clusterId,
          },
          { hovered_cluster: false },
        );

        hoveredClusterIdRef.current = null;
      }
    });

    // clear
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);

      if (mapboxRef.current) {
        mapboxRef.current.remove();
      }

      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, []);

  return (
    <div className={cn(className, 'relative w-full h-full')}>
      {/* <div className="absolute bottom-5 right-5 z-20 bg-white text-black text-xs">
        {JSON.stringify({ d: waypointDraggable })}
      </div> */}
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className="z-10 w-full h-full"
      >
        {mapboxRef.current && popup.visible && (
          <Popup
            lat={popup.lat}
            lon={popup.lon}
            content={popup.content}
            map={mapboxRef.current}
            setPopup={setPopup}
          />
        )}
      </div>
    </div>
  );
};

const Popup: React.FC<{
  map: mapboxgl.Map | null;
  content?: string;
  lat?: number;
  lon?: number;
  setPopup?: Dispatch<SetStateAction<PopupState>>;
}> = ({ content = '', lat = 0, lon = 0, map, setPopup }) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const popupInstance = useRef<mapboxgl.Popup | null>(null);

  const handleMouseEnter = () => {
    if (setPopup) {
      setPopup((prev) => ({ ...prev, hovered: true }));
    }
  };
  const handleMouseLeave = () => {
    if (setPopup) {
      setPopup((prev) => ({ ...prev, visible: false, hovered: false }));
    }
  };

  useEffect(() => {
    if (!map) return;

    // create a container div for the popup content
    const popupContainer = document.createElement('div');
    popupContainer.className = 'map-popup animate-in fade-in duration-300';
    popupContainer.innerHTML = content;
    popupRef.current = popupContainer;

    popupContainer.addEventListener('mouseenter', handleMouseEnter);
    popupContainer.addEventListener('mouseleave', handleMouseLeave);

    // create mapbox popup
    popupInstance.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 15,
    })
      .setLngLat({ lon, lat })
      .setDOMContent(popupContainer)
      .addTo(map);

    return () => {
      if (popupInstance.current) {
        popupInstance.current.remove();
        popupInstance.current = null;
      }
    };
  }, [lon, lat, map]);

  return null;
};
