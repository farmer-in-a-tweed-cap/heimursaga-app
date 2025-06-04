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

import { APP_CONFIG } from '@/config';

import { MapNavigationControl } from './map-control';
import { addSources, updateSources } from './map.utils';

export type MapOnLoadHandler = (data: MapOnLoadHandlerValue) => void;

export type MapOnLoadHandlerValue = {
  mapbox: mapboxgl.Map | null;
  viewport: { lat: number; lon: number };
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
  WAYPOINTS_DRAGGABLE: 'waypoints_draggable',
  TRIPS: 'trips',
};

const MAP_LAYERS = {
  WAYPOINTS: 'waypoints',
  WAYPOINTS_ORDER_NUMBER: 'waypoint_order_number',
  WAYPOINTS_DRAGGABLE: 'waypoints_draggable',
  LINES: 'lines',
  CLUSTERS: 'clusters',
  CLUSTER_COUNT: 'cluster_count',
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
  layers?: MapLayer[];
  minZoom?: number;
  maxZoom?: number;
  coordinates?: { lat: number; lon: number; alt: number };
  bounds?: [number, number, number, number];
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
  layers = [],
  styles,
  minZoom = 4,
  maxZoom = 10,
  coordinates = { lat: 48, lon: 7, alt: 5 },
  controls = true,
  markerEnabled = false,
  disabled = false,
  bounds,
  onLoad,
  onMove,
  onMarkerChange,
  onSourceClick,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapUpdatingExternally, setMapUpdatingExternally] =
    useState<boolean>(false);
  const [mapUpdatingInternally, setMapUpdatingInternally] =
    useState<boolean>(false);

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
  const mapUpdatingExternallyRef = useRef(mapUpdatingExternally);
  const mapUpdatingInternallyRef = useRef(mapUpdatingInternally);

  const hoveredPointIdRef = useRef<string | null>(null);
  const hoveredClusterIdRef = useRef<string | null>(null);

  // if there is no token, don't render the map
  if (!token) {
    return <></>;
  }

  const handleMapMove = () => {
    if (!mapboxRef.current) return;

    // skip if map is updating externally
    if (mapUpdatingExternallyRef.current) return;

    mapUpdatingInternallyRef.current = true;

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
    setTimeout(() => {
      mapUpdatingInternallyRef.current = false;
    }, 500);
  };

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

  // update bounds on change
  useEffect(() => {
    if (!mapboxRef.current || !mapLoaded || !bounds) return;
    if (mapUpdatingInternallyRef.current) return;

    mapUpdatingExternallyRef.current = true;

    console.log('bounds:', bounds);

    mapboxRef.current.fitBounds(bounds, {
      duration: 200,
      easing: (t) => t,
      padding: 0,
    });

    setTimeout(() => {
      mapUpdatingExternallyRef.current = false;
    }, 500);
  }, [bounds]);

  // update coordinates on change
  useEffect(() => {
    if (!mapboxRef.current || !mapLoaded) return;

    const { lat, lon, alt } = coordinates;

    if (disabled) {
      mapboxRef.current.setCenter([lon, lat]);
      mapboxRef.current.setZoom(alt);
    }
  }, [coordinates]);

  // useEffect(() => {
  //   mapUpdatingExternallyRef.current = mapUpdatingExternally;
  // }, [mapUpdatingExternally]);

  // useEffect(() => {
  //   mapUpdatingInternallyRef.current = mapUpdatingInternally;
  // }, [mapUpdatingInternally]);

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
      maxZoom: maxZoom >= 0 ? maxZoom : config.maxZoom,
      minZoom: minZoom >= 0 ? minZoom : config.minZoom,
      bearing: 0,
      dragPan: true,
      scrollZoom: true,
      dragRotate: false,
      touchPitch: false,
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
      markerRef.current = new mapboxgl.Marker(config.point)
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
    mapboxRef.current.on('load', (e) => {
      setMapLoaded(true);

      if (!mapboxRef.current) return;

      // get bounds
      const center = mapboxRef.current.getCenter();
      const bounds = mapboxRef.current.getBounds();
      const ne = bounds?.getNorthEast(); // northeast corner
      const sw = bounds?.getSouthWest(); // southwest corner

      // set initial props
      if (onLoad) {
        onLoad({
          mapbox: mapboxRef.current,
          viewport: { lat: center.lat, lon: center.lng },
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
                // ...[8,config.point.radius],
                // ...[12, config.point.radius],
                // ...[15, config.point.radius],
              ],
          'circle-color': [
            'case',
            ['==', ['feature-state', 'hovered_point'], true],
            config.cluster.colorHover,
            config.cluster.color,
          ],
          'circle-stroke-width': 2,
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
          'circle-color': config.point.color,
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

      mapboxRef.current.addLayer({
        id: MAP_LAYERS.CLUSTERS,
        type: 'circle',
        source: MAP_SOURCES.WAYPOINTS,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'case',
            ['==', ['feature-state', 'hovered_cluster'], true],
            config.cluster.colorHover,
            config.cluster.color,
          ],
          'circle-radius': config.cluster.radius,
          //  [
          //   'step',
          //   ['get', 'point_count'],
          //   20,
          //   100,
          //   30,
          //   750,
          //   40,
          // ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      mapboxRef.current.addLayer({
        id: MAP_LAYERS.CLUSTER_COUNT,
        type: 'symbol',
        source: MAP_SOURCES.WAYPOINTS,
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
        markerRef.current = new mapboxgl.Marker(config.point)
          .setLngLat({ lat, lng: lon })
          .addTo(mapboxRef.current);

        // update marker coordinates
        if (onMarkerChange) {
          onMarkerChange({ lat, lon });
        }
      }
    });

    // update on drag event
    mapboxRef.current.on('moveend', handleMapMove);

    // update on zoom event
    mapboxRef.current.on('zoomend', handleMapMove);

    // set popup
    mapboxPopupRef.current = new mapboxgl.Popup({
      closeOnMove: true,
      closeButton: false,
      anchor: 'top',
      offset: 15,
    });

    // waypoints
    mapboxRef.current!.on('click', MAP_LAYERS.WAYPOINTS, (e) => {
      if (mapboxRef.current && onSourceClick) {
        const sourceId = e.features?.[0].properties?.id;
        onSourceClick(sourceId);
      }
    });

    mapboxRef.current!.on('mouseenter', MAP_LAYERS.WAYPOINTS, (e) => {
      if (
        !mapboxRef.current ||
        !mapboxPopupRef.current ||
        !e.features ||
        !e.features?.length
      )
        return;

      const feature = e.features[0];
      const pointId = feature.id as string;

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
            source: MAP_SOURCES.WAYPOINTS,
            id: pointId,
          },
          { hovered_point: true },
        );

        hoveredPointIdRef.current = pointId;
      }

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
    });

    mapboxRef.current!.on('mouseleave', MAP_LAYERS.WAYPOINTS, () => {
      if (!mapboxRef.current || !mapboxPopupRef.current) return;

      const pointId = hoveredPointIdRef.current;

      // update cursor
      canvas.style.cursor = '';

      // update styles
      if (pointId) {
        mapboxRef.current.setFeatureState(
          {
            source: MAP_SOURCES.WAYPOINTS,
            id: pointId,
          },
          { hovered_point: false },
        );

        hoveredPointIdRef.current = null;
      }

      // remove popup
      setTimeout(() => {
        if (!hoverPopupRef.current) {
          mapboxPopupRef.current!.remove();
          showPopupRef.current = false;
        }
      }, 100);
    });

    // waypoints draggable
    mapboxRef.current!.on('mouseover', MAP_LAYERS.WAYPOINTS_DRAGGABLE, (e) => {
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
    });

    mapboxRef.current!.on('mouseleave', MAP_LAYERS.WAYPOINTS_DRAGGABLE, () => {
      // reset cursor
      canvas.style.cursor = '';
    });

    mapboxRef.current!.on('mousedown', MAP_LAYERS.WAYPOINTS_DRAGGABLE, (e) => {
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

    mapboxRef.current!.on('touchstart', MAP_LAYERS.WAYPOINTS_DRAGGABLE, (e) => {
      if (e.points.length !== 1) return;
      e.preventDefault();
      mapboxRef.current!.on('touchmove', onWaypointMouseMove);
      mapboxRef.current!.once('touchend', onWaypointMouseUp);
    });

    // clusters
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
        {/* {JSON.stringify({ d: waypointDraggable })} */}
      </div>
      <div
        id="map-container"
        ref={mapboxContainerRef}
        className="z-10 w-full h-full"
      ></div>
    </div>
  );
};
