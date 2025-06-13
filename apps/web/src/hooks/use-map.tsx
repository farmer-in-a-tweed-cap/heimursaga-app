'use client';

import { useRef, useState } from 'react';

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

export const useMap = ({
  mapbox,
  ...state
}: {
  mapbox: mapboxgl.Map | null;
  view?: string;
  sidebar?: boolean;
  drawer?: boolean;
  context?: string;
  filter?: string;
}) => {
  const [view, setView] = useState<string>(state.view || MAP_VIEW_PARAMS.LIST);
  const [sidebar, setSidebar] = useState<boolean>(state.sidebar || false);
  const [drawer, setDrawer] = useState<boolean>(state.drawer || false);
  const [context, setContext] = useState<string>(
    state.context || MAP_CONTEXT_PARAMS.GLOBAL,
  );
  const [filter, setFilter] = useState<string | undefined>(state.filter);

  const viewRef = useRef<string>(state.view || MAP_VIEW_PARAMS.LIST);

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
    if (mapbox) {
      mapbox.resize();
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
    handleSidebarToggle,
    handleDrawerOpen,
    handleDrawerClose,
    handleViewToggle,
    handleContextChange,
    handleFilterChange,
  };
};
