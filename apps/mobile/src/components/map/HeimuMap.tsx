import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { View, ViewStyle, StyleSheet, Animated, Easing } from 'react-native';
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

MapboxGL.setAccessToken(MAPBOX_TOKEN)
  .then(() => {
    _tokenReady = true;
    _tokenReadyCallbacks.splice(0).forEach((cb) => cb());
  })
  .catch(() => {
    // Still mark ready so the map renders (will use fallback style)
    _tokenReady = true;
    _tokenReadyCallbacks.splice(0).forEach((cb) => cb());
  });

// ─── Types ────────────────────────────────────────────────────────────────────

export type WaypointType = 'origin' | 'waypoint' | 'destination' | 'entry' | 'current' | 'poi';

export interface WaypointMarker {
  /** [longitude, latitude] */
  coordinates: [number, number];
  type: WaypointType;
  /** Descriptive label (e.g. place name) */
  label?: string;
  /** Short text rendered inside the marker (e.g. "S", "1", "E") */
  text?: string;
  /** When true, this marker is the current location and gets a pulse ring */
  isCurrent?: boolean;
  /** Entry IDs linked to this marker — used for tap-to-open behaviour */
  entryIds?: string[];
  /** Override the default white stroke color (e.g. blue border for round-trip start) */
  strokeColor?: string;
  /** Number of markers merged into this cluster (1 = single marker) */
  clusterSize?: number;
  /** All coordinates within this cluster — used to compute expansion zoom */
  clusterCoords?: [number, number][];
}

export interface HeimuMapProps {
  /** Outer container style */
  style?: ViewStyle;
  /** [longitude, latitude] map centre — defaults to North America [-98, 40] */
  center?: [number, number];
  /** Initial zoom level — defaults to 2 */
  zoom?: number;
  /** Fit camera to these bounds: { ne: [lng, lat], sw: [lng, lat] } */
  bounds?: { ne: [number, number]; sw: [number, number]; padding?: number };
  /** Ordered array of [lng, lat] pairs that form the route polyline */
  routeCoords?: [number, number][];
  /** Override route line color — defaults to copper */
  routeColor?: string;
  /** Point markers to render on the map */
  waypoints?: WaypointMarker[];
  /** When false the map ignores all touch gestures — defaults to true */
  interactive?: boolean;
  /** Called with [lng, lat] when the user taps the map */
  onMapPress?: (coords: [number, number]) => void;
  /** Called with the waypoint index when a marker is tapped */
  onWaypointPress?: (index: number) => void;
  /** Called with the current zoom level when the camera changes */
  onZoomChange?: (zoom: number) => void;
  /** Index of the selected waypoint to highlight */
  selectedIndex?: number;
  /** When true, display OpenSeaMap nautical chart overlay */
  nauticalOverlay?: boolean;
}

export interface HeimuMapRef {
  flyTo: (coords: [number, number], zoom?: number) => void;
  fitBounds: (coords: [number, number][], padding?: number) => void;
  getVisibleBounds: () => Promise<{ ne: [number, number]; sw: [number, number] } | null>;
  getZoom: () => Promise<number | null>;
}

// ─── Zoom-sensitive marker clustering ────────────────────────────────────────

/** Cluster markers that overlap at the given zoom level (~30px threshold). */
export function clusterMarkers(markers: WaypointMarker[], zoom: number): WaypointMarker[] {
  if (markers.length <= 1) return markers;
  // ~30 screen-pixels worth of degrees at this zoom
  const thresholdDeg = 30 * 360 / (256 * Math.pow(2, zoom));
  const thresholdSq = thresholdDeg * thresholdDeg;

  const clusters: WaypointMarker[][] = [];
  for (const m of markers) {
    let merged = false;
    for (const cluster of clusters) {
      const c = cluster[0].coordinates;
      const dLng = m.coordinates[0] - c[0];
      const dLat = m.coordinates[1] - c[1];
      if (dLng * dLng + dLat * dLat < thresholdSq) {
        cluster.push(m);
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push([m]);
  }

  return clusters.map(group => {
    if (group.length === 1) return group[0];
    const base = group[0];
    const texts = group.map(m => m.text ?? '').filter(Boolean);
    const nums = texts.map(Number).filter(n => !isNaN(n));
    const specials = texts.filter(t => isNaN(Number(t)));
    let mergedText: string;
    if (specials.length > 0) {
      mergedText = specials[0]; // "S" or "E" takes priority
    } else if (nums.length >= 2) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      mergedText = min === max ? String(min) : `${min}-${max}`;
    } else if (texts.length === 0) {
      // No text on any marker — show cluster count
      mergedText = String(group.length);
    } else {
      mergedText = texts[0] ?? '';
    }
    return {
      ...base,
      text: mergedText,
      isCurrent: group.some(m => m.isCurrent),
      entryIds: group.flatMap(m => m.entryIds ?? []),
      clusterSize: group.length,
      clusterCoords: group.map(m => m.coordinates),
    };
  });
}

/** Spread markers that are at or near the same coordinates into a small ring. */
export function spreadCoincidentMarkers(markers: WaypointMarker[]): WaypointMarker[] {
  if (markers.length <= 1) return markers;
  // Group markers that are within ~0.001° of each other (~100m)
  const NEAR_THRESHOLD = 0.001;
  const groups: number[][] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < markers.length; i++) {
    if (assigned.has(i)) continue;
    const group = [i];
    assigned.add(i);
    for (let j = i + 1; j < markers.length; j++) {
      if (assigned.has(j)) continue;
      const dLng = Math.abs(markers[i].coordinates[0] - markers[j].coordinates[0]);
      const dLat = Math.abs(markers[i].coordinates[1] - markers[j].coordinates[1]);
      if (dLng < NEAR_THRESHOLD && dLat < NEAR_THRESHOLD) {
        group.push(j);
        assigned.add(j);
      }
    }
    groups.push(group);
  }

  const result = markers.map(m => ({ ...m }));
  // Offset radius ~0.002° ≈ 200m, separates around zoom 14
  const RADIUS = 0.002;
  for (const group of groups) {
    if (group.length < 2) continue;
    const center: [number, number] = [
      markers[group[0]].coordinates[0],
      markers[group[0]].coordinates[1],
    ];
    const n = group.length;
    group.forEach((idx, j) => {
      const angle = (2 * Math.PI * j) / n;
      result[idx] = {
        ...result[idx],
        coordinates: [
          center[0] + RADIUS * Math.cos(angle),
          center[1] + RADIUS * Math.sin(angle),
        ],
      };
    });
  }
  return result;
}

/** Compute the minimum zoom level at which all points in `coords` would no longer cluster. */
export function getClusterExpansionZoom(coords: [number, number][]): number {
  if (coords.length < 2) return 20;
  // Find the minimum pairwise distance
  let minDistSq = Infinity;
  for (let i = 0; i < coords.length; i++) {
    for (let j = i + 1; j < coords.length; j++) {
      const dLng = coords[i][0] - coords[j][0];
      const dLat = coords[i][1] - coords[j][1];
      const dSq = dLng * dLng + dLat * dLat;
      if (dSq < minDistSq) minDistSq = dSq;
    }
  }
  const minDist = Math.sqrt(minDistSq);
  if (minDist === 0) return 20; // identical points
  // Threshold formula: thresholdDeg = 30 * 360 / (256 * 2^zoom)
  // Solve for zoom: 2^zoom = 30 * 360 / (256 * minDist)
  const zoom = Math.log2((30 * 360) / (256 * minDist));
  return Math.min(Math.ceil(zoom) + 1, 20); // +1 to ensure full separation, cap at 20
}

// ─── Marker colors ───────────────────────────────────────────────────────────

// Matches web app legend: start=copper, end=blue, waypoint=gray, entry=copper
const MARKER_COLOR: Record<WaypointType, string> = {
  origin: brandColors.copper,     // Start (web: 26px copper diamond "S")
  waypoint: '#616161',            // Waypoint (web: 22px gray diamond with number)
  destination: brandColors.blue,  // End (web: 26px blue diamond "E")
  entry: brandColors.copper,      // Journal entry (web: 22px copper circle with number)
  current: '#616161',             // Current location (web: gray diamond with pulse)
  poi: brandColors.blue,           // POI search result (blue dot)
};

// Circle radii — approximate web marker sizes (web uses CSS px for diameter)
const MARKER_RADIUS: Record<WaypointType, number> = {
  origin: 11,      // web: 26px → ~13px radius
  waypoint: 9,     // web: 22px → ~11px radius
  destination: 11,  // web: 26px → ~13px radius
  entry: 9,        // web: 22px → ~11px radius
  current: 9,      // web: 22px
  poi: 6,           // small blue dot for search results
};

const MARKER_STROKE_WIDTH: Record<WaypointType, number> = {
  origin: 3,
  waypoint: 2,
  destination: 3,
  entry: 2,
  current: 3,
  poi: 2,
};

// ─── Stable empty GeoJSON (module-scope to avoid identity changes) ──────────
const EMPTY_LINE: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const EMPTY_POINTS: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// ─── Component ────────────────────────────────────────────────────────────────

const HeimuMap = forwardRef<HeimuMapRef, HeimuMapProps>(function HeimuMap({
  style,
  center = [-98, 40],
  zoom = 2,
  bounds,
  routeCoords,
  routeColor,
  waypoints,
  interactive = true,
  onMapPress,
  onWaypointPress,
  onZoomChange,
  selectedIndex,
  nauticalOverlay,
}, ref) {
  const { mode } = useTheme();
  const [useFallbackStyle, setUseFallbackStyle] = useState(false);
  const [tokenReady, setTokenReady] = useState(_tokenReady);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapViewRef = useRef<MapboxGL.MapView>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  useImperativeHandle(ref, () => ({
    flyTo: (coords: [number, number], zoomLevel?: number) => {
      if (!mountedRef.current) return;
      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: zoomLevel ?? 10,
        animationDuration: 1000,
      });
    },
    fitBounds: (coords: [number, number][], padding = 80) => {
      if (!mountedRef.current || coords.length === 0) return;
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      cameraRef.current?.setCamera({
        bounds: {
          ne: [maxLng, maxLat],
          sw: [minLng, minLat],
          paddingTop: padding,
          paddingBottom: padding,
          paddingLeft: padding,
          paddingRight: padding,
        },
        animationDuration: 1000,
      });
    },
    getVisibleBounds: async () => {
      if (!mountedRef.current) return null;
      try {
        const bounds = await mapViewRef.current?.getVisibleBounds();
        if (!bounds) return null;
        return { ne: bounds[0] as [number, number], sw: bounds[1] as [number, number] };
      } catch {
        return null;
      }
    },
    getZoom: async () => {
      if (!mountedRef.current) return null;
      try {
        return await mapViewRef.current?.getZoom() ?? null;
      } catch {
        return null;
      }
    },
  }));

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

  // ── Pulse animation for current location ───────────────────────────────────
  const currentWaypoint = useMemo(
    () => waypoints?.find(wp => wp.isCurrent),
    [waypoints],
  );

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!currentWaypoint) return;
    pulseAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [currentWaypoint, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  // ── Route GeoJSON (always valid — empty when no route) ─────────────────────

  const routeGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!routeCoords || routeCoords.length < 2) return EMPTY_LINE;
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: routeCoords },
        properties: {},
      }],
    };
  }, [routeCoords]);

  // ── Waypoint GeoJSON (always valid — empty when no markers) ───────────────
  const waypointGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!waypoints?.length) return EMPTY_POINTS;
    return {
      type: 'FeatureCollection',
      features: waypoints.map((wp, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: wp.coordinates },
        properties: {
          type: wp.type,
          color: MARKER_COLOR[wp.type],
          radius: MARKER_RADIUS[wp.type],
          strokeWidth: MARKER_STROKE_WIDTH[wp.type],
          strokeColor: wp.strokeColor ?? '#ffffff',
          index: i,
          text: wp.text ?? '',
        },
      })),
    };
  }, [waypoints]);

  // ── Selected marker highlight GeoJSON ───────────────────────────────────────
  const highlightGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (selectedIndex == null || !waypoints?.[selectedIndex]) return EMPTY_POINTS;
    const wp = waypoints[selectedIndex];
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: wp.coordinates },
        properties: { radius: MARKER_RADIUS[wp.type] + 6 },
      }],
    };
  }, [selectedIndex, waypoints]);

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

  // ── Zoom/bounds change handler ──────────────────────────────────────────────
  const mountTimeRef = useRef(Date.now());
  const handleCameraChanged = useCallback(
    (event: any) => {
      if (!onZoomChange) return;
      // Skip events in the first second while the camera settles to bounds
      if (Date.now() - mountTimeRef.current < 1000) return;
      const z = event?.properties?.zoom;
      if (z != null) onZoomChange(z);
    },
    [onZoomChange],
  );

  // ── Map press handler ──────────────────────────────────────────────────────
  const handlePress = useCallback(
    (event: any) => {
      if (!onMapPress) return;
      const coords = event?.geometry?.coordinates as [number, number] | undefined;
      if (!coords) return;
      onMapPress(coords);
    },
    [onMapPress],
  );

  if (!tokenReady) {
    return <View style={[styles.container, style]} />;
  }

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        ref={mapViewRef}
        style={styles.map}
        styleURL={styleURL}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
        onPress={onMapPress ? handlePress : undefined}
        onCameraChanged={onZoomChange ? handleCameraChanged : undefined}
        onMapLoadingError={handleMapLoadError}
      >
        <MapboxGL.Camera
          ref={cameraRef}
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

        {/* ── Nautical chart overlay (OpenSeaMap) ──────── */}
        {nauticalOverlay && (
          <MapboxGL.RasterSource
            id="openseamap-source"
            tileUrlTemplates={['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png']}
            tileSize={256}
          >
            <MapboxGL.RasterLayer
              id="openseamap-layer"
              style={{ rasterOpacity: 0.85 }}
            />
          </MapboxGL.RasterSource>
        )}

        {/* ── Route polyline (always mounted, below waypoints) ──────── */}
        <MapboxGL.ShapeSource id="heimu-route-source" shape={routeGeoJSON}>
          <MapboxGL.LineLayer
            id="heimu-route-line"
            style={{
              lineColor: routeColor ?? brandColors.copper,
              lineWidth: 3,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Selected marker highlight ring ──────── */}
        <MapboxGL.ShapeSource id="heimu-highlight-source" shape={highlightGeoJSON}>
          <MapboxGL.CircleLayer
            id="heimu-highlight-ring"
            style={{
              circleRadius: ['get', 'radius'],
              circleColor: brandColors.copper,
              circleOpacity: 0.25,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff',
              circleStrokeOpacity: 0.8,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Waypoint markers (always mounted, on top of route) ──────── */}
        <MapboxGL.ShapeSource
          id="heimu-waypoints-source"
          shape={waypointGeoJSON}
          onPress={onWaypointPress ? handleWaypointPress : undefined}
          hitbox={{ width: 16, height: 16 }}
        >
          <MapboxGL.CircleLayer
            id="heimu-waypoints-fill"
            style={{
              circleRadius: ['get', 'radius'],
              circleColor: ['get', 'color'],
              circleStrokeWidth: ['get', 'strokeWidth'],
              circleStrokeColor: ['get', 'strokeColor'],
            }}
          />
          <MapboxGL.SymbolLayer
            id="heimu-waypoints-text"
            style={{
              textField: ['get', 'text'],
              textSize: 11,
              textColor: '#ffffff',
              textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              textAllowOverlap: true,
              textIgnorePlacement: true,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* ── Current location pulse ring (MarkerView + Animated) ──── */}
        {currentWaypoint && (
          <MapboxGL.MarkerView
            coordinate={currentWaypoint.coordinates}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap
          >
            <Animated.View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                borderWidth: 2,
                borderColor: '#ffffff',
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              }}
            />
          </MapboxGL.MarkerView>
        )}
      </MapboxGL.MapView>
    </View>
  );
});

export default HeimuMap;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});
