'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';

import { APP_CONFIG } from '@/config';

const MAP_MOVE_DEBOUNCE_TIMEOUT = 500;

export const MAP_CONTEXT_PARAMS = {
  GLOBAL: 'global',
  FOLLOWING: 'following',
  USER: 'user',
};

export const MAP_FILTER_PARAMS = {
  POST: 'post',
  TRIP: 'trip',
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
  POST_ID: 'post_id',
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

export type MapHookConfig = {
  updateSearchParams?: boolean;
};

export type MapCoordinatesValue = { lat: number; lon: number };

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

export const useMap = (
  state: {
    mapbox: mapboxgl.Map | null;
    zoom?: number;
    view?: string;
    sidebar?: boolean;
    drawer?: boolean;
    context?: string;
    filter?: string;
    center?: MapCoordinatesValue;
    bounds?: MapBoundsValue;
  },
  _config?: MapHookConfig,
) => {
  const router = useRouter();
  const pathname = usePathname();
  const _searchParams = useSearchParams();

  const config: MapHookConfig = _config
    ? _config
    : { updateSearchParams: false };

  const [searchParams] = useState<MapSearchParams>({
    context: _searchParams.get(MAP_SEARCH_PARAMS.CONTEXT),
    lat: _searchParams.get(MAP_SEARCH_PARAMS.LAT),
    lon: _searchParams.get(MAP_SEARCH_PARAMS.LON),
    zoom: _searchParams.get(MAP_SEARCH_PARAMS.ZOOM),
    post_id: _searchParams.get(MAP_SEARCH_PARAMS.POST_ID),
    search: _searchParams.get(MAP_SEARCH_PARAMS.SEARCH),
    user: _searchParams.get(MAP_SEARCH_PARAMS.USER),
    filter: _searchParams.get(MAP_SEARCH_PARAMS.FILTER),
  });

  const [view, setView] = useState<string>(state.view || MAP_VIEW_PARAMS.LIST);
  const [sidebar, setSidebar] = useState<boolean>(state.sidebar || false);
  const [drawer, setDrawer] = useState<boolean>(state.drawer || false);
  const [context, setContext] = useState<string>(
    state.context || MAP_CONTEXT_PARAMS.GLOBAL,
  );
  const [filter, setFilter] = useState<string | undefined>(state.filter);
  const [zoom, setZoom] = useState<number>(0);
  const [center, setCenter] = useState<MapCoordinatesValue>(
    state.center || {
      lon: 0,
      lat: 0,
    },
  );
  const [_bounds, setBounds] = useState<MapBoundsValue>(
    state.bounds || {
      ne: {
        lon: APP_CONFIG.MAP.DEFAULT.BOUNDS.NE.LON,
        lat: APP_CONFIG.MAP.DEFAULT.BOUNDS.NE.LON,
      },
      sw: {
        lon: APP_CONFIG.MAP.DEFAULT.BOUNDS.SW.LON,
        lat: APP_CONFIG.MAP.DEFAULT.BOUNDS.SW.LON,
      },
    },
  );
  const [bounds] = useDebounce(_bounds, MAP_MOVE_DEBOUNCE_TIMEOUT);

  const mapboxRef = useRef<mapboxgl.Map | null>(state.mapbox || null);
  const viewRef = useRef<string>(state.view || MAP_VIEW_PARAMS.LIST);

  const updateSearchParams = (payload: Partial<MapSearchParams>) => {
    const { lat, lon, zoom, post_id, search, context, user, filter } = payload;

    const s = new URLSearchParams(searchParams.toString());

    const params = [
      { key: MAP_SEARCH_PARAMS.LAT, value: lat },
      { key: MAP_SEARCH_PARAMS.LON, value: lon },
      { key: MAP_SEARCH_PARAMS.ZOOM, value: zoom },
      { key: MAP_SEARCH_PARAMS.POST_ID, value: post_id },
      { key: MAP_SEARCH_PARAMS.SEARCH, value: search },
      { key: MAP_SEARCH_PARAMS.CONTEXT, value: context },
      { key: MAP_SEARCH_PARAMS.USER, value: user },
      { key: MAP_SEARCH_PARAMS.FILTER, value: filter },
    ];

    params.forEach(({ key, value }) => {
      if (value) {
        s.set(key, `${value}`);
      } else {
        if (value === null) {
          s.delete(key);
        }
      }
    });

    // update the url
    router.push(`${pathname}?${s.toString()}`, { scroll: false });
  };

  const mapboxUpdateBounds = (bounds: MapBoundsValue) => {
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

    // update search params
    if (config.updateSearchParams) {
      const { lat, lon } = center;
      updateSearchParams({
        lat: `${lat}`,
        lon: `${lon}`,
        zoom: `${zoom}`,
      });
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

  const handleContextChange = (context: string, callback?: () => void) => {
    setContext(context);

    if (callback) {
      callback();
    }
  };

  const handleFilterChange = (filter: string, callback?: () => void) => {
    setFilter(filter);

    if (callback) {
      callback();
    }
  };

  return {
    view,
    sidebar,
    drawer,
    viewRef,
    filter,
    setFilter,
    context,
    setContext,
    zoom,
    center,
    setCenter,
    bounds,
    setBounds,
    handleLoad,
    handleMove,
    handleSidebarToggle,
    handleDrawerOpen,
    handleDrawerClose,
    handleViewToggle,
    handleContextChange,
    handleFilterChange,
    mapbox: {
      ref: mapboxRef.current,
      updateBounds: mapboxUpdateBounds,
    },
  };
};
