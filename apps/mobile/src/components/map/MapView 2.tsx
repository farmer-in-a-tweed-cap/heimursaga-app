import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Alert, Text, Dimensions, TouchableOpacity, Pressable } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { MAPBOX_ACCESS_TOKEN, MAP_CONFIG, MAP_STYLES } from '../../config/mapbox';
import type { IMapQueryPayload, IMapQueryResponse, MapQueryContext } from '@repo/types';

// Set Mapbox access token
MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

interface MapViewProps {
  onWaypointPress?: (waypoint: any) => void;
  selectedWaypoint?: any;
}

export const MapView: React.FC<MapViewProps> = ({ onWaypointPress, selectedWaypoint }) => {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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
    if (!mapRef.current) return;
    
    try {
      const bounds = await mapRef.current.getVisibleBounds();
      const newBounds = {
        ne: bounds[1], // [lon, lat]
        sw: bounds[0], // [lon, lat]
      };
      
      setMapBounds(newBounds);
    } catch (error) {
      console.error('Error getting map bounds:', error);
    }
  }, []);

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
  }, [waypointsData?.waypoints, selectedWaypoint?.post?.id]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        onRegionDidChange={handleRegionDidChange}
        styleURL={MAP_STYLES.custom}
        rotateEnabled={true}
        pitchEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={1.5}
          centerCoordinate={[0, 45]} // Center more on northern hemisphere where waypoints are
          animationMode="flyTo"
          animationDuration={2000}
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
};

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
});