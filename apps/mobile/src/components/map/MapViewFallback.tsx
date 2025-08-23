import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { WaypointCard } from './WaypointCard';

interface MapViewFallbackProps {
  onWaypointPress?: (waypoint: any) => void;
}

export const MapViewFallback: React.FC<MapViewFallbackProps> = ({ onWaypointPress }) => {
  const [, setSelectedWaypoint] = useState<any>(null);

  // Get recent waypoints for display
  const { data: waypointsData, isLoading } = useQuery({
    queryKey: ['recent-waypoints-fallback'],
    queryFn: async () => {
      // Query for waypoints globally
      return api.map.queryMap({
        context: 'global' as any,
        limit: 20,
      });
    },
  });

  const handleWaypointPress = useCallback((waypoint: any) => {
    setSelectedWaypoint(waypoint);
    if (onWaypointPress) {
      onWaypointPress(waypoint);
    }
  }, [onWaypointPress]);

  const renderWaypoint = ({ item }: { item: any }) => (
    <WaypointCard
      waypoint={item}
      onPress={() => handleWaypointPress(item)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>🗺️ Map View</Text>
        <Text style={styles.subHeaderText}>Mapbox is loading... Showing waypoints list</Text>
      </View>
      
      <FlatList
        data={waypointsData?.waypoints || []}
        renderItem={renderWaypoint}
        keyExtractor={(item, index) => `waypoint-fallback-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Loading waypoints...' : 'No waypoints found'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  
  subHeaderText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  listContent: {
    paddingVertical: 8,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});