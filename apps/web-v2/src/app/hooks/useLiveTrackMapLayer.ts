'use client';

import { useEffect } from 'react';

import type mapboxgl from 'mapbox-gl';

import type { TrackPolyline } from '@/app/services/api';

const SOURCE_ID = 'live-track';
const LINE_LAYER_ID = 'live-track-line';
const HEAD_LAYER_ID = 'live-track-head';

interface UseLiveTrackMapLayerArgs {
  /** Mapbox map reference. Layer is no-op until the map is non-null. */
  mapRef: React.RefObject<mapboxgl.Map | null>;
  /**
   * Caller signal that the map's `load` event has fired and its layers are
   * safe to add. Refs don't trigger re-renders, so we lift this readiness
   * signal up to a state flag.
   */
  mapReady: boolean;
  /** The polyline to render. Null or empty hides the layer. */
  polyline: TrackPolyline | null;
}

/**
 * Adds a "live track" GeoJSON source + line layer + head-point layer to the
 * given Mapbox map. Idempotently syncs whenever `polyline` changes. The
 * line is placed at the top of the layer stack so the actual GPS path
 * draws above the planned-route line — the live data is the truth in a
 * live-tracked expedition.
 */
export function useLiveTrackMapLayer({
  mapRef,
  mapReady,
  polyline,
}: UseLiveTrackMapLayerArgs) {
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    const setupAndSync = () => {
      try {
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });
        }
      } catch {
        // Source already exists from a concurrent install path — fine.
        return;
      }
      if (!map.getLayer(LINE_LAYER_ID)) {
        map.addLayer({
          id: LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          // Mapbox GL JS v3+ expression-style filter. Old `$type` syntax
          // still works but is deprecated and was the suspect cause of
          // silent no-render at v3.17.
          filter: ['==', ['geometry-type'], 'LineString'],
          paint: {
            'line-color': '#22c55e', // green to read as "live"
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
      }
      if (!map.getLayer(HEAD_LAYER_ID)) {
        map.addLayer({
          id: HEAD_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': 7,
            'circle-color': '#22c55e',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 3,
          },
        });
      }
      const src = map.getSource(SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (!src) return;

      if (!polyline || polyline.coordinates.length === 0) {
        src.setData({ type: 'FeatureCollection', features: [] });
        return;
      }

      const head = polyline.coordinates[polyline.coordinates.length - 1];
      src.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: polyline.coordinates,
            },
          },
          {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: head },
          },
        ],
      });
    };

    // mapReady is only set true by the parent's map-init load callback,
    // so by the time we run, the 'load' event has already fired. Install
    // synchronously — `map.once('load', ...)` would register too late and
    // `isStyleLoaded()` was returning false here in Mapbox v3.17 even
    // after load, which led to the polyline only appearing on the next
    // poll cycle when a new polyline reference triggered a re-run.
    setupAndSync();

    // Reinstall on every style reload (theme switch, basemap switch via
    // setStyle()). Mapbox wipes all custom sources/layers when the style
    // changes — without this listener the polyline would vanish on the
    // next basemap or theme toggle.
    map.on('style.load', setupAndSync);

    return () => {
      // try/catch in case the parent's map-init effect cleanup ran first
      // and called map.remove() — Mapbox currently only logs a warning
      // for off() on a disposed map, but defensive in case that changes.
      try {
        map.off('style.load', setupAndSync);
      } catch {
        /* ignore */
      }
    };
    // mapRef intentionally omitted — it's a stable React ref identity that
    // never changes. Including it would imply re-runs we don't want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, polyline]);
}
