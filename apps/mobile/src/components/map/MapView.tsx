import React, { useState, useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import type { IMapQueryPayload, MapQueryContext } from '@repo/types';

// Try to import Mapbox, fallback if not available
let MapboxGL;
let MAPBOX_ACCESS_TOKEN;
let MAP_STYLES;

try {
  MapboxGL = require('@rnmapbox/maps').default;
  const mapboxConfig = require('../../config/mapbox');
  MAPBOX_ACCESS_TOKEN = mapboxConfig.MAPBOX_ACCESS_TOKEN;
  MAP_STYLES = mapboxConfig.MAP_STYLES;
  
  // Set Mapbox access token if available
  if (MapboxGL && MAPBOX_ACCESS_TOKEN) {
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }
} catch (e) {
  console.log('Mapbox not available, using fallback');
}

interface MapViewProps {
  onWaypointPress?: (waypoint: any) => void;
  selectedWaypoint?: any;
  onRegionChange?: () => void;
  initialCenterCoordinate?: [number, number];
  initialZoomLevel?: number;
  onMapStateChange?: (state: { centerCoordinate: [number, number]; zoomLevel: number }) => void;
}

export interface MapViewRef {
  centerOnLocation: (longitude: number, latitude: number, zoomLevel?: number) => void;
  fitToBounds: (bounds: [[number, number], [number, number]], padding?: number) => void;
  getCurrentBounds: () => Promise<any>;
}

export const MapView = forwardRef<MapViewRef, MapViewProps>(({ 
  onWaypointPress, 
  selectedWaypoint, 
  onRegionChange, 
  initialCenterCoordinate,
  initialZoomLevel,
  onMapStateChange 
}, ref) => {
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [, setMapBounds] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasInitialized = useRef(false);

  // Set initial camera position if provided and map is ready
  useEffect(() => {
    if (isMapReady && cameraRef.current && !hasInitialized.current && initialCenterCoordinate && initialZoomLevel) {
      console.log('Setting initial camera position:', initialCenterCoordinate, initialZoomLevel);
      hasInitialized.current = true;
      cameraRef.current.setCamera({
        centerCoordinate: initialCenterCoordinate,
        zoomLevel: initialZoomLevel,
        animationDuration: 0, // No animation for initial positioning
      });
    } else if (isMapReady && !hasInitialized.current) {
      hasInitialized.current = true;
    }
  }, [isMapReady, initialCenterCoordinate, initialZoomLevel]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    centerOnLocation: (longitude: number, latitude: number, zoomLevel = 10) => {
      if (cameraRef.current && isMapReady) {
        cameraRef.current.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: zoomLevel,
          animationDuration: 1000,
        });
      }
    },
    fitToBounds: (bounds: [[number, number], [number, number]], padding = 50) => {
      if (cameraRef.current && isMapReady) {
        cameraRef.current.fitBounds(
          bounds[0], // northeast
          bounds[1], // southwest
          padding, // padding
          1000 // animation duration
        );
      }
    },
    getCurrentBounds: async () => {
      if (mapRef.current && isMapReady) {
        try {
          const bounds = await mapRef.current.getVisibleBounds();
          console.log('Raw Mapbox bounds:', bounds);
          
          // bounds[0] = southwest [lon, lat]
          // bounds[1] = northeast [lon, lat]
          const swLon = bounds[0][0];
          const swLat = bounds[0][1];
          const neLon = bounds[1][0];
          const neLat = bounds[1][1];
          
          const result = {
            ne: { lat: Math.max(swLat, neLat), lon: Math.max(swLon, neLon) },
            sw: { lat: Math.min(swLat, neLat), lon: Math.min(swLon, neLon) },
          };
          
          console.log('Corrected bounds:', result);
          return result;
        } catch (error) {
          console.error('Error getting bounds:', error);
          return null;
        }
      }
      return null;
    },
  }));

  // Query waypoints based on current map bounds
  const { data: waypointsData, isLoading, error } = useQuery({
    queryKey: ['map-waypoints-global'], // Fixed key since we're not using bounds
    queryFn: async () => {
      // For now, always fetch global waypoints without bounds filtering
      // This ensures waypoints are always visible
      console.log('MapView: Fetching global waypoints (no bounds filtering)');
      const queryPayload: IMapQueryPayload = {
        context: 'global' as MapQueryContext,
        limit: 100,
      };
      
      const result = await api.map.queryMap(queryPayload);
      console.log('MapView: Query result:', result);
      console.log('MapView: Waypoints count:', result?.waypoints?.length);
      
      // Log waypoint locations for debugging
      if (result?.waypoints) {
        result.waypoints.forEach((waypoint, index) => {
          console.log(`Waypoint ${index}: ${waypoint.post?.title || 'Untitled'} at [${waypoint.lon}, ${waypoint.lat}]`);
        });
      }
      
      return result;
    },
    enabled: isMapReady, // Remove mapBounds requirement to allow initial load
  });

  const handleRegionDidChange = useCallback(async () => {
    if (!mapRef.current || !cameraRef.current) return;
    
    try {
      const bounds = await mapRef.current.getVisibleBounds();
      const newBounds = {
        ne: bounds[1], // [lon, lat]
        sw: bounds[0], // [lon, lat]
      };
      
      setMapBounds(newBounds);
      
      // Get current camera state for persistence
      if (onMapStateChange) {
        try {
          const center = await mapRef.current.getCenter();
          const zoom = await mapRef.current.getZoom();
          onMapStateChange({
            centerCoordinate: center,
            zoomLevel: zoom,
          });
        } catch (error) {
          console.error('Error getting camera state:', error);
        }
      }
      
      // Notify parent component of region change
      if (onRegionChange) {
        onRegionChange();
      }
    } catch (error) {
      console.error('Error getting map bounds:', error);
    }
  }, [onRegionChange, onMapStateChange]);

  const handleWaypointPress = (waypoint: any) => {
    console.log('MapView: handleWaypointPress called:', waypoint.post?.title);
    
    if (onWaypointPress) {
      onWaypointPress(waypoint);
    }
    
    // Center the map on the selected waypoint (without changing zoom)
    if (cameraRef.current) {
      const screenHeight = Dimensions.get('window').height;
      const drawerHeight = screenHeight * 0.4; // Account for drawer taking up bottom 40%
      
      cameraRef.current.setCamera({
        centerCoordinate: [waypoint.lon, waypoint.lat],
        animationDuration: 800,
        padding: {
          paddingTop: 0,
          paddingBottom: drawerHeight,
          paddingLeft: 0,
          paddingRight: 0,
        },
      });
    }
  };

  const renderedWaypoints = useMemo(() => {
    if (!waypointsData?.waypoints) {
      return null;
    }
    
    return waypointsData.waypoints.map((waypoint, index) => {
      const isSelected = selectedWaypoint && 
        selectedWaypoint.post?.id === waypoint.post?.id;
      
      return (
      <MapboxGL.PointAnnotation
        key={`waypoint-${waypoint.post?.id || index}`}
        id={`waypoint-${waypoint.post?.id || index}`}
        coordinate={[waypoint.lon, waypoint.lat]}
        onSelected={() => {
          console.log('MapView: PointAnnotation selected:', waypoint.post?.title);
          handleWaypointPress(waypoint);
        }}
      >
        <View style={[
          styles.waypointMarker,
          isSelected && styles.waypointMarkerSelected
        ]} />
      </MapboxGL.PointAnnotation>
      );
    });
  }, [waypointsData?.waypoints, selectedWaypoint, handleWaypointPress]);

  // If MapboxGL is available, render the full map
  if (MapboxGL) {
    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          onDidFinishLoadingMap={() => setIsMapReady(true)}
          onRegionDidChange={handleRegionDidChange}
          styleURL={MAP_STYLES?.custom}
          rotateEnabled={true}
          pitchEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={initialZoomLevel || 1.5}
            centerCoordinate={initialCenterCoordinate || [0, 45]}
            animationMode="none"
            animationDuration={0}
          />
          
          {renderedWaypoints}
          
          {/* Crosshairs for selected waypoint */}
          {selectedWaypoint && (
            <MapboxGL.PointAnnotation
              key="crosshairs"
              id="crosshairs"
              coordinate={[selectedWaypoint.lon, selectedWaypoint.lat]}
            >
              <View style={styles.crosshairs} />
            </MapboxGL.PointAnnotation>
          )}
        </MapboxGL.MapView>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading waypoints...</Text>
          </View>
        )}
        
        {error && (
          <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(220, 38, 38, 0.9)' }]}>
            <Text style={styles.loadingText}>Error loading waypoints</Text>
            <Text style={[styles.loadingText, { fontSize: 12, marginTop: 4 }]}>
              {error.message || 'Unknown error'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Fallback when MapboxGL isn't available
  return (
    <View style={styles.container}>
      <View style={[styles.map, styles.fallback]}>
        <Text style={styles.fallbackText}>🗺️ Map View</Text>
        <Text style={styles.fallbackSubtext}>Mapbox integration coming soon</Text>
        {waypointsData?.waypoints && (
          <Text style={styles.fallbackSubtext}>
            {waypointsData.waypoints.length} waypoints available
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  map: {
    flex: 1,
  },
  
  waypointTouchArea: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  waypointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#AA6C46', // Using your brand color
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  waypointMarkerSelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#AC6D46', // Primary color when selected
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  
  waypointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  
  waypointDotSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  crosshairs: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#AC6D46',
    backgroundColor: 'transparent',
    opacity: 0.8,
  },

  fallback: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fallbackText: {
    fontSize: 32,
    marginBottom: 8,
  },

  fallbackSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
});