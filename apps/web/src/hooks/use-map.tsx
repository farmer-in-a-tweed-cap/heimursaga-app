'use client';

import { useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { APP_CONFIG } from '@/config';

const MAP_MOVE_DEBOUNCE_TIMEOUT = 500;

export const MAP_CONTEXT_PARAMS = {
  GLOBAL: 'global',
  FOLLOWING: 'following',
  USER: 'user',
  JOURNEY: 'journey',
};

export const MAP_FILTER_PARAMS = {
  POST: 'post',
  JOURNEY: 'journey',
};

export const MAP_VIEW_PARAMS = {
  LIST: 'list',
  MAP: 'map',
};

export const MAP_SEARCH_PARAMS = {
  CONTEXT: 'context',
  LAT: 'lat',
  LON: 'lon',
  ZOOM: 'zoom',
  POST_ID: 'entry_id',
  SEARCH: 'search',
  USER: 'user',
  FILTER: 'filter',
};

export type MapSearchParams = {
  lat: string | null;
  lon: string | null;
  zoom: string | null;
  context: string | null;
  post_id: string | null;
  search: string | null;
  user: string | null;
  filter: string | null;
};

export type MapCoordinatesValue = { lat: number; lon: number };

export type MapWaypointValue = MapCoordinatesValue & {
  id: number;
  title?: string;
  date?: Date;
};

export type MapBoundsValue = {
  sw: MapCoordinatesValue;
  ne: MapCoordinatesValue;
};

export type MapLoadHandler = (data: {
  mapbox: mapboxgl.Map | null;
  center: MapCoordinatesValue;
  zoom: number;
  bounds?: MapBoundsValue;
}) => void;

export type MapMoveHandler = (data: {
  center: MapCoordinatesValue;
  zoom: number;
  bounds?: MapBoundsValue;
}) => void;

export const useMap = (state?: {
  zoom?: number;
  view?: string;
  sidebar?: boolean;
  drawer?: boolean;
  context?: string;
  filter?: string;
  center?: MapCoordinatesValue;
  marker?: MapCoordinatesValue;
  bounds?: MapBoundsValue;
}) => {
  const [loaded, setLoaded] = useState<boolean>(false);
  const [view, setView] = useState<string>(state?.view || MAP_VIEW_PARAMS.LIST);
  const [sidebar, setSidebar] = useState<boolean>(state?.sidebar || false);
  const [drawer, setDrawer] = useState<boolean>(state?.drawer || false);

  const [zoom, setZoom] = useState<number>(
    state?.zoom || APP_CONFIG.MAP.DEFAULT.ZOOM,
  );
  const [marker, setMarker] = useState<MapCoordinatesValue | undefined>(
    state?.marker,
  );
  const [center, setCenter] = useState<MapCoordinatesValue>(
    state?.center || {
      lon: APP_CONFIG.MAP.DEFAULT.CENTER.LON,
      lat: APP_CONFIG.MAP.DEFAULT.CENTER.LAT,
    },
  );
  const [_bounds, setBounds] = useState<MapBoundsValue | undefined>(
    state?.bounds,
  );
  const [bounds] = useDebounce(_bounds, MAP_MOVE_DEBOUNCE_TIMEOUT);

  const mapboxRef = useRef<mapboxgl.Map | null>(null);
  const viewRef = useRef<string>(state?.view || MAP_VIEW_PARAMS.LIST);

  const updateCenter = (center: MapCoordinatesValue) => {
    setCenter(center);

    if (mapboxRef.current) {
      mapboxRef.current.setCenter(center);
    }
  };

  const updateZoom = (zoom: number) => {
    setZoom(zoom);

    if (mapboxRef.current) {
      mapboxRef.current.setZoom(zoom);
    }
  };

  const updateBounds = (bounds: MapBoundsValue) => {
    if (!mapboxRef.current) return;

    mapboxRef.current.fitBounds(
      [bounds.sw.lon, bounds.sw.lat, bounds.ne.lon, bounds.ne.lat],
      {
        duration: 0,
        padding: 0,
      },
    );
  };

  const handleLoad: MapLoadHandler = (data) => {
    const { mapbox, center, zoom = 0, bounds } = data;

    // update mapbox ref
    if (mapbox) {
      mapboxRef.current = mapbox;
    }

    // update zoom
    setZoom(zoom);

    // update center
    if (center) {
      const { lat, lon } = center;
      setCenter({ lat, lon });
    }

    // update bounds
    if (bounds) {
      setBounds(bounds);
    }

    setLoaded(true);
  };

  const handleMove: MapMoveHandler = (data) => {
    const { center, zoom = 0, bounds } = data;

    // update zoom
    setZoom(zoom);

    // update center
    if (center) {
      const { lat, lon } = center;
      setCenter({ lat, lon });
    }

    // update bounds
    if (bounds) {
      setBounds(bounds);
    }
  };

  const handleDrawerOpen = () => {
    setDrawer(true);
  };

  const handleDrawerClose = () => {
    setDrawer(false);
  };

  const handleViewToggle = () => {
    setView((prev) => {
      const view =
        prev === MAP_VIEW_PARAMS.LIST
          ? MAP_VIEW_PARAMS.MAP
          : MAP_VIEW_PARAMS.LIST;
      viewRef.current = view;
      return view;
    });
  };

  const handleSidebarToggle = () => {
    // update sidebar
    setSidebar((sidebar) => !sidebar);

    // resize the map
    if (mapboxRef.current) {
      mapboxRef.current.resize();
    }
  };

  const handleMarkerChange = (marker: MapCoordinatesValue) => {
    setMarker(marker);
  };

  return {
    loaded,
    view,
    sidebar,
    drawer,
    viewRef,
    zoom,
    setZoom,
    center,
    updateZoom,
    setCenter,
    updateCenter,
    bounds,
    setBounds,
    marker,
    setMarker,
    updateBounds,
    handleLoad,
    handleMove,
    handleSidebarToggle,
    handleDrawerOpen,
    handleDrawerClose,
    handleViewToggle,
    handleMarkerChange,
    mapbox: mapboxRef.current,
  };
};
