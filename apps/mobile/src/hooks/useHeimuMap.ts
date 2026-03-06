import { useState, useEffect, ComponentType } from 'react';
import type { HeimuMapProps } from '@/components/map/HeimuMap';

/**
 * Defers the Mapbox import so its native module initialisation
 * doesn't block the JS thread during screen mount.
 *
 * Returns `null` until the component is ready (after a 300 ms delay).
 */
export function useHeimuMap(delay = 300): ComponentType<HeimuMapProps> | null {
  const [MapComponent, setMapComponent] = useState<ComponentType<HeimuMapProps> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/map/HeimuMap').then((mod) => setMapComponent(() => mod.default));
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return MapComponent;
}
