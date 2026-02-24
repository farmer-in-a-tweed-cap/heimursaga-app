'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type MapLayer = 'heimursaga' | 'satellite';

const HEIMURSAGA_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const HEIMURSAGA_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';
const SATELLITE_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

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

interface MapLayerContextType {
  mapLayer: MapLayer;
  setMapLayer: (layer: MapLayer) => void;
}

const MapLayerContext = createContext<MapLayerContextType | undefined>(undefined);

export function MapLayerProvider({ children }: { children: ReactNode }) {
  const [mapLayer, setMapLayerState] = useState<MapLayer>(() => {
    if (typeof window === 'undefined') return 'heimursaga';
    const saved = localStorage.getItem('heimursaga-map-layer');
    if (saved === 'heimursaga' || saved === 'satellite') return saved;
    return 'heimursaga';
  });

  useEffect(() => {
    localStorage.setItem('heimursaga-map-layer', mapLayer);
  }, [mapLayer]);

  const setMapLayer = (newLayer: MapLayer) => {
    setMapLayerState(newLayer);
  };

  return (
    <MapLayerContext.Provider value={{ mapLayer, setMapLayer }}>
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
