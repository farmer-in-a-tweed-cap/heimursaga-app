'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type MapLayer = 'heimursaga' | 'satellite';

const HEIMURSAGA_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const HEIMURSAGA_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';
const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

export const OPENSEAMAP_TILES = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';

export function getMapStyle(layer: MapLayer, theme: 'light' | 'dark'): string {
  if (layer === 'satellite') {
    return SATELLITE_STYLE;
  }
  return theme === 'dark' ? HEIMURSAGA_STYLE_DARK : HEIMURSAGA_STYLE_LIGHT;
}

/** Returns a casing (outline) color that contrasts with the current map background. */
export function getLineCasingColor(layer: MapLayer, theme: 'light' | 'dark'): string {
  // Light Heimursaga map is mostly white terrain — use dark casing
  if (layer === 'heimursaga' && theme === 'light') return '#202020';
  // Dark Heimursaga and satellite are dark backgrounds — use white casing
  return '#ffffff';
}

/** Add / remove the OpenSeaMap raster overlay on a Mapbox GL map instance. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyNauticalOverlay(map: any, enabled: boolean) {
  if (!map.isStyleLoaded()) return;
  if (enabled) {
    if (!map.getSource('openseamap')) {
      map.addSource('openseamap', {
        type: 'raster',
        tiles: [OPENSEAMAP_TILES],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors',
      });
    }
    if (!map.getLayer('openseamap-layer')) {
      map.addLayer({
        id: 'openseamap-layer',
        type: 'raster',
        source: 'openseamap',
      });
    }
  } else {
    if (map.getLayer('openseamap-layer')) map.removeLayer('openseamap-layer');
    if (map.getSource('openseamap')) map.removeSource('openseamap');
  }
}

interface MapLayerContextType {
  mapLayer: MapLayer;
  setMapLayer: (layer: MapLayer) => void;
  nauticalOverlay: boolean;
  setNauticalOverlay: (on: boolean) => void;
}

const MapLayerContext = createContext<MapLayerContextType | undefined>(undefined);

export function MapLayerProvider({ children }: { children: ReactNode }) {
  const [mapLayer, setMapLayerState] = useState<MapLayer>(() => {
    if (typeof window === 'undefined') return 'heimursaga';
    const saved = localStorage.getItem('heimursaga-map-layer');
    if (saved === 'heimursaga' || saved === 'satellite') return saved;
    return 'heimursaga';
  });

  const [nauticalOverlay, setNauticalOverlayState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('heimursaga-nautical-overlay') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('heimursaga-map-layer', mapLayer);
  }, [mapLayer]);

  useEffect(() => {
    localStorage.setItem('heimursaga-nautical-overlay', String(nauticalOverlay));
  }, [nauticalOverlay]);

  const setMapLayer = (newLayer: MapLayer) => {
    setMapLayerState(newLayer);
  };

  const setNauticalOverlay = (on: boolean) => {
    setNauticalOverlayState(on);
  };

  return (
    <MapLayerContext.Provider value={{ mapLayer, setMapLayer, nauticalOverlay, setNauticalOverlay }}>
      {children}
    </MapLayerContext.Provider>
  );
}

export function useMapLayer() {
  const context = useContext(MapLayerContext);
  if (context === undefined) {
    throw new Error('useMapLayer must be used within a MapLayerProvider');
  }
  return context;
}
