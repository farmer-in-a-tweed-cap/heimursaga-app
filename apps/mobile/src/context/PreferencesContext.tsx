import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

/**
 * User display preferences — distance unit and map style. Mirrors the
 * web app's DistanceUnitContext + MapLayerContext (same units, same
 * conversion factors, same satellite style) so an explorer who uses
 * both surfaces sees consistent numbers and maps.
 *
 * Persistence is per-device (SecureStore, like ThemeContext), matching
 * the web's localStorage approach — these are device preferences, not
 * account state.
 */
export type DistanceUnit = 'km' | 'mi' | 'nm';
export type MapLayer = 'heimursaga' | 'satellite';

const KM_TO_MI = 0.621371;
const KM_TO_NM = 0.539957;

// Key + legacy values predate this context (the preferences screen wrote
// them before anything consumed them) — keep both for back-compat.
const DISTANCE_UNIT_KEY = 'heimursaga_distance_unit';
const MAP_LAYER_KEY = 'heimursaga_map_layer';

const STORED_TO_UNIT: Record<string, DistanceUnit> = {
  metric: 'km',
  imperial: 'mi',
  nautical: 'nm',
};
const UNIT_TO_STORED: Record<DistanceUnit, string> = {
  km: 'metric',
  mi: 'imperial',
  nm: 'nautical',
};

interface PreferencesValue {
  distanceUnit: DistanceUnit;
  setDistanceUnit(unit: DistanceUnit): void;
  mapLayer: MapLayer;
  setMapLayer(layer: MapLayer): void;
  /** Format a kilometre value in the user's unit, e.g. "12.4 mi". */
  formatDistance(km: number, decimals?: number): string;
  /** Raw numeric conversion of a kilometre value into the user's unit —
   * for displays that style the number and unit label separately. */
  convertDistance(km: number): number;
  /** Format a km/h value in the user's unit, e.g. "4.2 kn". */
  formatSpeed(kmh: number): string;
  distanceLabel: string;
  speedLabel: string;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>('mi');
  const [mapLayer, setMapLayerState] = useState<MapLayer>('heimursaga');

  useEffect(() => {
    void (async () => {
      try {
        const [storedUnit, storedLayer] = await Promise.all([
          SecureStore.getItemAsync(DISTANCE_UNIT_KEY),
          SecureStore.getItemAsync(MAP_LAYER_KEY),
        ]);
        if (storedUnit && STORED_TO_UNIT[storedUnit]) {
          setDistanceUnitState(STORED_TO_UNIT[storedUnit]);
        }
        if (storedLayer === 'heimursaga' || storedLayer === 'satellite') {
          setMapLayerState(storedLayer);
        }
      } catch {
        // defaults stand
      }
    })();
  }, []);

  const setDistanceUnit = useCallback((unit: DistanceUnit) => {
    setDistanceUnitState(unit);
    void SecureStore.setItemAsync(DISTANCE_UNIT_KEY, UNIT_TO_STORED[unit]).catch(() => {});
  }, []);

  const setMapLayer = useCallback((layer: MapLayer) => {
    setMapLayerState(layer);
    void SecureStore.setItemAsync(MAP_LAYER_KEY, layer).catch(() => {});
  }, []);

  const formatDistance = useCallback(
    (km: number, decimals = 1): string => {
      if (distanceUnit === 'nm') return `${(km * KM_TO_NM).toFixed(decimals)} nm`;
      if (distanceUnit === 'mi') return `${(km * KM_TO_MI).toFixed(decimals)} mi`;
      return `${km.toFixed(decimals)} km`;
    },
    [distanceUnit],
  );

  const convertDistance = useCallback(
    (km: number): number => {
      if (distanceUnit === 'nm') return km * KM_TO_NM;
      if (distanceUnit === 'mi') return km * KM_TO_MI;
      return km;
    },
    [distanceUnit],
  );

  const formatSpeed = useCallback(
    (kmh: number): string => {
      if (distanceUnit === 'nm') return `${(kmh * KM_TO_NM).toFixed(1)} kn`;
      if (distanceUnit === 'mi') return `${(kmh * KM_TO_MI).toFixed(1)} mph`;
      return `${kmh.toFixed(1)} km/h`;
    },
    [distanceUnit],
  );

  const value = useMemo<PreferencesValue>(
    () => ({
      distanceUnit,
      setDistanceUnit,
      mapLayer,
      setMapLayer,
      formatDistance,
      convertDistance,
      formatSpeed,
      distanceLabel: distanceUnit,
      speedLabel: distanceUnit === 'nm' ? 'kn' : distanceUnit === 'mi' ? 'mph' : 'km/h',
    }),
    [distanceUnit, setDistanceUnit, mapLayer, setMapLayer, formatDistance, convertDistance, formatSpeed],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return ctx;
}
