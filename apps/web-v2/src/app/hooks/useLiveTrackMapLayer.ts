'use client';

import { useEffect, useRef } from 'react';

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
  // Track which map instance we last installed against so a navigation
  // between expedition pages (map destroyed + re-created) reinstalls.
  const lastMapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    const setupAndSync = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.getLayer(LINE_LAYER_ID)) {
        map.addLayer({
          id: LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', '$type', 'LineString'],
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
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 7,
            'circle-color': '#22c55e',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 3,
          },
        });
      }
      lastMapRef.current = map;

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

    if (map.isStyleLoaded()) {
      setupAndSync();
    } else {
      map.once('load', setupAndSync);
    }

    return () => {
      try {
        map.off('load', setupAndSync);
      } catch {
        /* ignore */
      }
    };
  }, [mapRef, mapReady, polyline]);
}
