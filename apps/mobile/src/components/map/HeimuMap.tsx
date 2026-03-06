import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useTheme } from '@/theme/ThemeContext';
import { getMapStyle, MAPBOX_TOKEN } from '@/services/mapConfig';
import { colors as brandColors } from '@/theme/tokens';

// Default Mapbox styles as fallback when custom styles fail to load
const FALLBACK_STYLES = {
  light: MapboxGL.StyleURL.Light,
  dark: MapboxGL.StyleURL.Dark,
};

// ─── One-time SDK initialisation ─────────────────────────────────────────────
let _tokenReady = false;
const _tokenReadyCallbacks: Array<() => void> = [];

MapboxGL.setAccessToken(MAPBOX_TOKEN).then(() => {
  _tokenReady = true;
  _tokenReadyCallbacks.splice(0).forEach((cb) => cb());
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type WaypointType = 'origin' | 'waypoint' | 'destination';

export interface WaypointMarker {
  /** [longitude, latitude] */
  coordinates: [number, number];
  type: WaypointType;
  label?: string;
}

export interface HeimuMapProps {
  /** Outer container style */
  style?: ViewStyle;
  /** [longitude, latitude] map centre — defaults to [0, 20] */
  center?: [number, number];
  /** Initial zoom level — defaults to 2 */
  zoom?: number;
  /** Fit camera to these bounds: { ne: [lng, lat], sw: [lng, lat] } */
  bounds?: { ne: [number, number]; sw: [number, number]; padding?: number };
  /** Ordered array of [lng, lat] pairs that form the route polyline */
  routeCoords?: [number, number][];
  /** Point markers to render on the map */
  waypoints?: WaypointMarker[];
  /** When false the map ignores all touch gestures — defaults to true */
  interactive?: boolean;
  /** Called with [lng, lat] when the user taps the map */
  onMapPress?: (coords: [number, number]) => void;
  /** Called with the waypoint index when a marker is tapped */
  onWaypointPress?: (index: number) => void;
}

// ─── Marker colors ───────────────────────────────────────────────────────────

const MARKER_COLOR: Record<WaypointType, string> = {
  origin: brandColors.blue,
  waypoint: brandColors.copper,
  destination: brandColors.green,
};

const MARKER_RADIUS: Record<WaypointType, number> = {
  origin: 8,
  waypoint: 6,
  destination: 8,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function HeimuMap({
  style,
  center = [0, 20],
  zoom = 2,
  bounds,
  routeCoords,
  waypoints,
  interactive = true,
  onMapPress,
  onWaypointPress,
}: HeimuMapProps) {
  const { mode } = useTheme();
  const [useFallbackStyle, setUseFallbackStyle] = useState(false);
  const [tokenReady, setTokenReady] = useState(_tokenReady);

  useEffect(() => {
    if (_tokenReady) return;
    const cb = () => setTokenReady(true);
    _tokenReadyCallbacks.push(cb);
    return () => {
      const idx = _tokenReadyCallbacks.indexOf(cb);
      if (idx !== -1) _tokenReadyCallbacks.splice(idx, 1);
    };
  }, []);

  const styleURL = useFallbackStyle
    ? FALLBACK_STYLES[mode]
    : getMapStyle(mode);

  const handleMapLoadError = useCallback(() => {
    if (!useFallbackStyle) setUseFallbackStyle(true);
  }, [useFallbackStyle]);

  // ── Route GeoJSON ──────────────────────────────────────────────────────────
  const routeGeoJSON = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(() => {
    if (!routeCoords || routeCoords.length < 2) return null;
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routeCoords },
      properties: {},
    };
  }, [routeCoords]);

  // ── Waypoint GeoJSON (native CircleLayer — no React views / no reactTag) ──
  const waypointGeoJSON = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!waypoints?.length) return null;
    return {
      type: 'FeatureCollection',
      features: waypoints.map((wp, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: wp.coordinates },
        properties: {
          type: wp.type,
          color: MARKER_COLOR[wp.type],
          radius: MARKER_RADIUS[wp.type],
          strokeWidth: wp.type === 'destination' ? 2 : 0,
          strokeColor: MARKER_COLOR[wp.type],
          index: i,
        },
      })),
    };
  }, [waypoints]);

  // ── Waypoint press handler ─────────────────────────────────────────────────
  const handleWaypointPress = useCallback(
    (event: any) => {
      if (!onWaypointPress) return;
      const feature = event?.features?.[0];
      if (feature?.properties?.index != null) {
        onWaypointPress(feature.properties.index);
      }
    },
    [onWaypointPress],
  );

  // ── Map press handler ──────────────────────────────────────────────────────
  const handlePress = useCallback(
    (event: any) => {
      if (!onMapPress) return;
      const [lng, lat] = event.geometry.coordinates as [number, number];
      onMapPress([lng, lat]);
    },
    [onMapPress],
  );

  if (!tokenReady) {
    return <View style={[styles.container, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={styleURL}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        attributionEnabled={false}
        logoEnabled={false}
        onPress={onMapPress ? handlePress : undefined}
        onMapLoadingError={handleMapLoadError}
      >
        <MapboxGL.Camera
          {...(bounds
            ? {
                bounds: { ne: bounds.ne, sw: bounds.sw, paddingTop: bounds.padding ?? 60, paddingBottom: bounds.padding ?? 60, paddingLeft: bounds.padding ?? 60, paddingRight: bounds.padding ?? 60 },
                animationMode: 'none' as const,
              }
            : {
                centerCoordinate: center,
                zoomLevel: zoom,
                animationMode: 'none' as const,
              }
          )}
        />

        {/* ── Route polyline ────────────────────────────────────────────── */}
        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="heimu-route-source" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="heimu-route-line"
              style={{
                lineColor: brandColors.copper,
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ── Waypoint markers (native CircleLayer — New Arch safe) ───── */}
        {waypointGeoJSON && (
          <MapboxGL.ShapeSource
            id="heimu-waypoints-source"
            shape={waypointGeoJSON}
            onPress={onWaypointPress ? handleWaypointPress : undefined}
            hitbox={{ width: 24, height: 24 }}
          >
            {/* Outer stroke ring for destination markers */}
            <MapboxGL.CircleLayer
              id="heimu-waypoints-stroke"
              style={{
                circleRadius: ['get', 'radius'],
                circleColor: 'transparent',
                circleStrokeWidth: ['get', 'strokeWidth'],
                circleStrokeColor: ['get', 'strokeColor'],
                circleStrokeOpacity: 0.5,
              }}
              filter={['==', ['get', 'type'], 'destination']}
            />
            {/* Filled circle for all markers */}
            <MapboxGL.CircleLayer
              id="heimu-waypoints-fill"
              style={{
                circleRadius: ['get', 'radius'],
                circleColor: ['get', 'color'],
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});
