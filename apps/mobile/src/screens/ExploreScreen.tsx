import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Alert,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../components/ui';
import { Logo } from '../components/ui/Logo';
import { MapView, MapViewRef } from '../components/map/MapView';
import { api } from '../api';
import { useAuth } from '../hooks';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';

const { height: screenHeight } = Dimensions.get('window');

interface ExploreScreenProps {
  initialView?: 'map' | 'list';
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({ initialView = 'map' }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Core state
  const [selectedWaypoint, setSelectedWaypoint] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Drawer state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false);
  const [fullEntryData, setFullEntryData] = useState<any>(null);
  
  // View state - following web app pattern
  const [showSearchOverlay, setShowSearchOverlay] = useState(true);
  const [showListView, setShowListView] = useState(false);
  const [hasEverSearched, setHasEverSearched] = useState(false);
  const [isMapAnimating, setIsMapAnimating] = useState(false);
  const [shouldLoadWaypoints, setShouldLoadWaypoints] = useState(false);
  
  // Map state
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapState, setMapState] = useState<{
    centerCoordinate?: [number, number];
    zoomLevel?: number;
    hasInitialized?: boolean;
  }>({});

  const translateY = useRef(new Animated.Value(0)).current;
  const drawerHeight = useRef(new Animated.Value(screenHeight * 0.4)).current;
  const mapViewRef = useRef<MapViewRef>(null);

  // Get waypoints only after search is performed and map animation is complete
  const { data: recentWaypoints, isLoading } = useQuery({
    queryKey: ['map-waypoints', mapBounds],
    queryFn: async () => {
      if (mapBounds) {
        // Load waypoints for the current map bounds
        const result = await api.map.queryMap({
          context: 'global' as any,
          limit: 100,
          location: {
            bounds: mapBounds,
          },
        });
        return result;
      } else {
        // Fallback to global query
        const result = await api.map.queryMap({
          context: 'global' as any,
          limit: 100,
        });
        return result;
      }
    },
    enabled: isAuthenticated && shouldLoadWaypoints && !isMapAnimating,
  });

  // Function to determine continent from coordinates
  const getContinent = useCallback((lat: number, lon: number) => {
    // Simple continent detection based on coordinate ranges
    if (lat >= 35 && lat <= 72 && lon >= -25 && lon <= 60) {
      return 'Europe';
    } else if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) {
      return 'Africa';
    } else if (lat >= 5 && lat <= 55 && lon >= 60 && lon <= 180) {
      return 'Asia';
    } else if (lat >= 10 && lat <= 72 && lon >= -180 && lon <= -30) {
      return 'North America';
    } else if (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -35) {
      return 'South America';
    } else if (lat >= -47 && lat <= -10 && lon >= 113 && lon <= 154) {
      return 'Australia';
    } else if (lat < -60) {
      return 'Antarctica';
    } else {
      // Check for Pacific islands
      if (lat >= -25 && lat <= 30 && ((lon >= 120 && lon <= 180) || (lon >= -180 && lon <= -130))) {
        return 'Oceania';
      }
      return 'the world';
    }
  }, []);

  // Function to update bounds from map
  const updateMapBounds = useCallback(async () => {
    if (mapViewRef.current) {
      const bounds = await mapViewRef.current.getCurrentBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }
  }, []);

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (postId: string) => {
      return api.posts.bookmarkPost(postId);
    },
    onSuccess: () => {
      // Refresh waypoints data
      queryClient.invalidateQueries({ queryKey: ['recent-waypoints'] });
      queryClient.invalidateQueries({ queryKey: ['map-waypoints'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to bookmark post');
    },
  });

  const handleWaypointPress = (waypoint: any, fromListView = false) => {
    
    // If this is a different waypoint, just update it
    if (selectedWaypoint?.post?.id !== waypoint.post?.id) {
      setSelectedWaypoint(waypoint);
    }
    
    if (fromListView) {
      // From list view - go directly to expanded view
      setIsDrawerVisible(true);
      setIsLoadingExpanded(true);
      
      // Set drawer to expanded height immediately
      drawerHeight.setValue(screenHeight * 0.9);
      
      // Fetch full entry data and show expanded view
      if (waypoint.post?.id) {
        api.posts.getPostById(waypoint.post.id)
          .then((fullEntry) => {
            setFullEntryData(fullEntry);
            setIsExpanded(true);
            setIsLoadingExpanded(false);
          })
          .catch((error) => {
            console.error('Error fetching full entry:', error);
            // Fall back to preview data
            setFullEntryData(waypoint);
            setIsExpanded(true);
            setIsLoadingExpanded(false);
          });
      } else {
        // No post ID, use waypoint data
        setFullEntryData(waypoint);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      }
    } else {
      // From map view - show collapsed detail drawer
      setIsExpanded(false);
      setIsDrawerVisible(true);
      
      // Reset to collapsed state - no translateY, just height
      drawerHeight.setValue(screenHeight * 0.4);
    }
  };

  const handleBookmarkPress = useCallback((waypoint: any) => {
    if (!waypoint.post?.id) return;
    bookmarkMutation.mutate(waypoint.post.id);
  }, [bookmarkMutation]);

  // Debounced search function
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const isSelectingRef = useRef(false);
  const searchInputRef = useRef<TextInput>(null);
  
  const handleSearchQueryChange = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&types=place,locality,region,country`
        );
        
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.features || []);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSearchResultSelect = useCallback((result: any) => {
    
    // Mark that we're selecting an item
    isSelectingRef.current = true;
    
    // Hide keyboard and search overlay
    Keyboard.dismiss();
    setShowSearchResults(false);
    setShowSearchOverlay(false);
    setHasEverSearched(true);
    setIsMapAnimating(true); // Start animation state
    
    // Update query
    setSearchQuery(result.place_name);
    
    // Determine zoom level based on feature type and bbox
    const [longitude, latitude] = result.center;
    
    if (mapViewRef.current) {
      if (result.bbox) {
        // Use bounding box if available (better for countries/regions)
        const [minLon, minLat, maxLon, maxLat] = result.bbox;
        const bounds: [[number, number], [number, number]] = [
          [maxLon, maxLat], // northeast
          [minLon, minLat], // southwest
        ];
        mapViewRef.current.fitToBounds(bounds, 20);
        
        // Calculate center and rough zoom for state persistence
        const centerLon = (minLon + maxLon) / 2;
        const centerLat = (minLat + maxLat) / 2;
        const roughZoom = Math.max(1, Math.min(15, 10 - Math.log2(Math.max(maxLon - minLon, maxLat - minLat))));
        
        setMapState({
          centerCoordinate: [centerLon, centerLat],
          zoomLevel: roughZoom,
          hasInitialized: true,
        });
      } else {
        // Fallback to center with appropriate zoom based on place type
        let zoomLevel = 10; // default
        
        const placeType = result.place_type?.[0] || '';
        
        switch (placeType) {
          case 'country':
            zoomLevel = 5;
            break;
          case 'region':
            zoomLevel = 7;
            break;
          case 'place':
          case 'locality':
            zoomLevel = 10;
            break;
          case 'district':
            zoomLevel = 12;
            break;
          default:
            zoomLevel = 14;
        }
        
        mapViewRef.current.centerOnLocation(longitude, latitude, zoomLevel);
        
        // Update map state immediately
        setMapState({
          centerCoordinate: [longitude, latitude],
          zoomLevel: zoomLevel,
          hasInitialized: true,
        });
      }
    }
    
    // After map animation completes, load waypoints
    setTimeout(() => {
      setIsMapAnimating(false);
      setShouldLoadWaypoints(true);
      // Update bounds to trigger waypoint loading
      updateMapBounds();
    }, 2000); // Wait for map animation to complete
    
    // Reset selection flag after a brief delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 200);
  }, [updateMapBounds]);

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    searchInputRef.current?.blur();
    setShowSearchResults(false);
  };

  const handleBackToSearch = () => {
    setShowSearchOverlay(true);
    setSearchQuery('');
    setShowSearchResults(false);
    setShowListView(false);
    setHasEverSearched(false);
    setShouldLoadWaypoints(false); // Reset waypoint loading
    setIsMapAnimating(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSearchOverlay(true);
    setShowListView(false);
    setHasEverSearched(false);
    setShouldLoadWaypoints(false); // Reset waypoint loading
    setIsMapAnimating(false);
  };

  const handleGeolocate = useCallback(() => {
    setIsMapAnimating(true);
    setShowSearchOverlay(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          if (mapViewRef.current) {
            mapViewRef.current.centerOnLocation(longitude, latitude, 15);
            
            // Update map state
            setMapState({
              centerCoordinate: [longitude, latitude],
              zoomLevel: 15,
              hasInitialized: true,
            });
          }
          
          // Set search query to indicate location search
          setSearchQuery('My Location');
          setHasEverSearched(true);
          
          // After map animation completes, load waypoints
          setTimeout(() => {
            setIsMapAnimating(false);
            setShouldLoadWaypoints(true);
            updateMapBounds();
          }, 2000);
        },
        (error) => {
          console.error('Geolocation error:', error);
          Alert.alert('Location Error', 'Unable to retrieve your location. Please check your location permissions.');
          setIsMapAnimating(false);
          setShowSearchOverlay(true); // Show overlay again on error
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } else {
      Alert.alert('Location Error', 'Geolocation is not supported on this device');
      setIsMapAnimating(false);
      setShowSearchOverlay(true);
    }
  }, [updateMapBounds]);

  const handleToggleListView = () => {
    setShowListView(!showListView);
  };

  const handleCloseWaypointDetail = () => {
    setIsExpanded(false);
    setIsDrawerVisible(false);
    setFullEntryData(null); // Clear full entry data
    setSelectedWaypoint(null); // Clear selected waypoint to remove highlight
    
    // Shrink drawer to zero height to close
    Animated.spring(drawerHeight, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const handleExpandDetail = async () => {
    if (!selectedWaypoint?.post?.id) return;
    
    // Start loading state
    setIsLoadingExpanded(true);
    
    // Animate drawer to expand upward by increasing height
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.9, // Expand to 90% of screen
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
    }).start(async () => {
      try {
        // Fetch full entry data
        const fullEntry = await api.posts.getPostById(selectedWaypoint.post.id);
        
        setFullEntryData(fullEntry);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      } catch (error) {
        console.error('ExploreScreen: Error fetching full entry:', error);
        // Fall back to preview data
        setFullEntryData(selectedWaypoint);
        setIsExpanded(true);
        setIsLoadingExpanded(false);
      }
    });
  };

  const handleCollapseDetail = () => {
    setIsExpanded(false);
    setIsLoadingExpanded(false);
    setFullEntryData(null); // Clear full entry data
    
    // Animate back to collapsed size
    Animated.spring(drawerHeight, {
      toValue: screenHeight * 0.4,
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
    }).start();
  };

  // Pan responder for drawer gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 10;
    },
    onPanResponderGrant: () => {
      translateY.setOffset(translateY._value);
      translateY.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      translateY.setValue(gestureState.dy);
    },
    onPanResponderRelease: (_, gestureState) => {
      translateY.flattenOffset();
      
      const velocity = gestureState.vy;
      const translation = gestureState.dy;
      const currentValue = translateY._value;
      
      // Determine final position based on gesture
      if (velocity > 0.5 || translation > 100) {
        // Swipe down - close completely
        handleCloseWaypointDetail();
      } else if (velocity < -0.5 || translation < -100) {
        // Swipe up - expand
        handleExpandDetail();
      } else {
        // Snap back to current state
        if (currentValue < -screenHeight * 0.3) {
          handleExpandDetail();
        } else {
          handleCollapseDetail();
        }
      }
    },
  });

  // Check if overlay should be visible (following web app pattern)
  const overlayVisible = !searchQuery && !hasEverSearched && showSearchOverlay;

  if (!isAuthenticated) {
    return (
      <Screen>
        <View style={styles.unauthenticatedContainer}>
          <Text style={styles.unauthenticatedText}>
            Please log in to explore waypoints
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {/* Always render MapView as background */}
      <MapView 
        key="map-view"
        ref={mapViewRef} 
        onWaypointPress={handleWaypointPress} 
        selectedWaypoint={selectedWaypoint}
        onRegionChange={updateMapBounds}
        initialCenterCoordinate={mapState.centerCoordinate}
        initialZoomLevel={mapState.zoomLevel}
        onMapStateChange={(state) => {
          setMapState({ ...state, hasInitialized: true });
        }}
        style={styles.map}
      />

      {/* Search Overlay - Initial State */}
      {overlayVisible && (
        <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
          <View style={[styles.searchOverlay, { paddingTop: insets.top }]}>
            {/* Heimursaga Logo */}
            <View style={styles.logoContainer}>
              <Logo size={60} showBrand={true} brandSize={18} />
            </View>

            {/* Hero Text */}
            <View style={styles.heroContainer}>
              <Text style={styles.heroTitle}>Your Journey Begins Here...</Text>
              <Text style={styles.heroSubtitle}>
                Geolocate, search for places, entries, or explorers
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInputLarge}
                  placeholder="Search"
                  placeholderTextColor="#8E8E93"
                  value={searchQuery}
                  onChangeText={handleSearchQueryChange}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.locationButton}
                onPress={handleGeolocate}
                disabled={isMapAnimating}
              >
                <Text style={styles.locationIcon}>⊕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {showSearchResults && searchResults.length > 0 && (
              <View style={styles.searchResultsOverlay}>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item, index) => `search-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItemLarge}
                      onPress={() => handleSearchResultSelect(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.searchResultTextLarge} numberOfLines={1}>
                        {item.place_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  maxToRenderPerBatch={5}
                  initialNumToRender={5}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Compact Header - After Search */}
      {!overlayVisible && (
        <View style={[styles.compactHeader, { paddingTop: insets.top }]}>
          {/* Logo */}
          <View style={styles.compactLogoContainer}>
            <Logo size={24} showBrand={true} brandSize={14} />
          </View>
          
          {/* Compact Search Bar */}
          <View style={styles.compactSearchContainer}>
            <Text style={styles.compactSearchIcon}>🔍</Text>
            <Text style={styles.compactSearchText} numberOfLines={1}>
              {searchQuery}
            </Text>
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List View Overlay */}
      {showListView && (
        <View style={[styles.listViewOverlay, { paddingTop: overlayVisible ? insets.top : insets.top + 120 }]}>
          <FlatList
            data={recentWaypoints?.waypoints || []}
            renderItem={({ item }) => (
              <WaypointCard
                waypoint={item}
                onPress={() => {
                  handleWaypointPress(item, true);
                  setShowListView(false); // Close list view when item is selected
                }}
                onBookmarkPress={() => handleBookmarkPress(item)}
              />
            )}
            keyExtractor={(item, index) => `waypoint-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {isLoading ? 'Loading waypoints...' : 'Looks like there are no journal entries in this area.\n\nBe the first to document your adventures here!'}
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* List Toggle Button - shown when not in search overlay */}
      {!overlayVisible && (
        <TouchableOpacity 
          style={styles.listToggleButton}
          onPress={handleToggleListView}
        >
          <Text style={styles.listToggleIcon}>☰</Text>
          <Text style={styles.listToggleText}>List</Text>
        </TouchableOpacity>
      )}

      {/* Waypoint Detail Drawer */}
      {selectedWaypoint && (
        <Animated.View 
          style={[
            styles.waypointDetail, 
            { 
              height: drawerHeight,
              opacity: isDrawerVisible ? 1 : 0,
              pointerEvents: isDrawerVisible ? 'auto' : 'none',
            }
          ]}
          {...(!isExpanded ? panResponder.panHandlers : {})}
        >
          {isLoadingExpanded ? (
            <>
              <View style={styles.dragHandle} />
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading full entry...</Text>
              </View>
            </>
          ) : isExpanded ? (
            <ExpandedWaypointView
              waypoint={{
                ...selectedWaypoint,
                post: fullEntryData || selectedWaypoint.post
              }}
              onClose={handleCloseWaypointDetail}
            />
          ) : (
            <>
              <View style={styles.dragHandle} />
              <WaypointCard waypoint={selectedWaypoint} />
              <View style={styles.gestureHints}>
                <Text style={styles.gestureHintText}>
                  ↑ Swipe up for full view
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backdropFilter: 'blur(10px)', // For iOS backdrop blur effect
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: -80, // Move logo higher to match web app
  },

  heroContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: '500', // Slightly lighter weight
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5, // Tighter letter spacing
  },

  heroSubtitle: {
    fontSize: 18,
    color: '#6B7280', // Match web app gray color
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320, // Constrain width for better readability
  },

  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },

  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 50, // More rounded like the web app
    paddingHorizontal: 24,
    paddingVertical: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB', // More subtle border
    minHeight: 56, // Ensure consistent height
  },

  searchIcon: {
    fontSize: 20,
    marginRight: 16,
    color: '#9CA3AF', // Lighter gray like web app
  },

  searchInputLarge: {
    flex: 1,
    fontSize: 18,
    color: '#1F2937',
    paddingVertical: 0,
    fontWeight: '400',
  },

  locationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  locationIcon: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },

  searchResultsOverlay: {
    position: 'absolute',
    top: '70%',
    left: 32,
    right: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: 240,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  searchResultItemLarge: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  searchResultTextLarge: {
    fontSize: 17,
    color: '#1F2937',
    fontWeight: '400',
  },

  compactHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },

  compactLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },


  compactSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  compactSearchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#8E8E93',
  },

  compactSearchText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },

  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  clearButtonText: {
    fontSize: 12,
    color: '#8E8E93',
  },

  listViewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 999,
  },

  listContent: {
    paddingVertical: 8,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },

  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },

  listToggleButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#AC6D46',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },

  listToggleIcon: {
    fontSize: 16,
    color: '#ffffff',
    marginRight: 6,
  },

  listToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  waypointDetail: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    minHeight: screenHeight * 0.4,
    maxHeight: screenHeight * 0.9,
    paddingTop: 12,
  },

  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },

  gestureHints: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },

  gestureHintText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },

  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  unauthenticatedText: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});