'use client';

import { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { MapPin, Crosshair, X } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useTheme } from '@/app/context/ThemeContext';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const MAPBOX_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

interface LocationMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

export function LocationMap({ initialLat, initialLng, onLocationSelect, onClose }: LocationMapProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [zoom, setZoom] = useState(initialLat && initialLng ? 13 : 1.5);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { theme } = useTheme();

  // Delay map initialization to ensure container is rendered
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    const container = mapContainerRef.current;

    // Initialize map - default to world view centered on Atlantic
    const map = new mapboxgl.Map({
      container: container,
      style: theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
      center: [initialLng || 0, initialLat || 20],
      zoom: zoom,
    });

    // Resize map after it loads to ensure proper dimensions
    map.on('load', () => {
      map.resize();
    });

    // Add error handler - suppress style evaluation warnings
    map.on('error', (e) => {
      // Suppress Mapbox style expression evaluation warnings (non-critical)
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) {
        return; // These are harmless warnings from Mapbox's internal style
      }
      console.error('Mapbox error:', e);
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geocoder for location search
    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      marker: false, // We'll add our own marker
      placeholder: 'Search for a location...',
    });
    map.addControl(geocoder as any, 'top-left');

    // Handle geocoder result
    geocoder.on('result', (e: any) => {
      const { center } = e.result;
      const [lng, lat] = center;
      setPosition({ lat, lng });
      onLocationSelect(lat, lng);

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#ac6d46" stroke="#ac6d46" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      `;
      el.style.cursor = 'pointer';
      el.style.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))';

      // Add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

      markerRef.current = marker;
    });

    // Add geolocate control (only if geolocation is available)
    if (navigator.geolocation) {
      try {
        // Suppress console warnings temporarily
        const originalWarn = console.warn;
        const originalError = console.error;
        console.warn = () => {};
        console.error = () => {};
        
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        });
        
        // Restore console methods
        console.warn = originalWarn;
        console.error = originalError;
        
        // Suppress console errors from GeolocateControl
        geolocate.on('error', () => {
          // Silently handle errors - geolocation not available
        });
        
        map.addControl(geolocate, 'top-right');
        
        // Update position when geolocate finds user location
        geolocate.on('geolocate', (e: any) => {
          const lat = e.coords.latitude;
          const lng = e.coords.longitude;
          setPosition({ lat, lng });
          setCurrentLocation({ lat, lng });
          onLocationSelect(lat, lng);
        });
      } catch (_error) {
        // Silently handle case where GeolocateControl cannot be initialized
      }
    }

    // Update zoom on zoom end
    map.on('zoom', () => {
      setZoom(map.getZoom());
    });

    // Handle map click
    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setPosition({ lat, lng });
      onLocationSelect(lat, lng);

      // Remove existing marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#ac6d46" stroke="#ac6d46" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      `;
      el.style.cursor = 'pointer';
      el.style.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))';

      // Add marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

      markerRef.current = marker;
    });

    // Add initial marker if position exists
    if (initialLat && initialLng) {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#ac6d46" stroke="#ac6d46" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      `;
      el.style.cursor = 'pointer';
      el.style.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([initialLng, initialLat])
        .addTo(map);

      markerRef.current = marker;
    }

    mapRef.current = map;

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady, theme]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setCurrentLocation({ lat, lng });
        onLocationSelect(lat, lng);
        
        // Fly to the new location
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 13,
            duration: 2000,
          });

          // Remove existing marker
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // Add new marker
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#ac6d46" stroke="#ac6d46" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3" fill="white"></circle>
            </svg>
          `;
          el.style.cursor = 'pointer';
          el.style.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))';

          const marker = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .addTo(mapRef.current);

          markerRef.current = marker;
        }
        
        setGettingLocation(false);
      },
      (error) => {
        // Silently handle geolocation errors - these are expected when:
        // - User denies permission
        // - Browser doesn't support geolocation
        // - Geolocation times out
        // User will be prompted to click on the map instead
        let errorMessage = 'Unable to retrieve your location. Please click on the map to select a location.';
        
        if (error.code === 1) {
          errorMessage = 'Location permission denied. Please click on the map to select a location.';
        } else if (error.code === 2) {
          errorMessage = 'Location unavailable. Please click on the map to select a location.';
        } else if (error.code === 3) {
          errorMessage = 'Location request timed out. Please click on the map to select a location.';
        }
        
        alert(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const isCurrentLocation = currentLocation && position && 
    position.lat === currentLocation.lat && 
    position.lng === currentLocation.lng;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#202020] border-4 border-[#202020] dark:border-[#616161] w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              SELECT LOCATION ON MAP
            </h2>
            <div className="text-xs mt-1 text-[#e5e5e5]">
              Click anywhere on the map to set coordinates, or use your current location
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#365a87] transition-all"
            aria-label="Close map"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Coordinates Display & Controls */}
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-xs font-bold mb-1 text-[#202020] dark:text-[#e5e5e5]">
                SELECTED COORDINATES:
              </div>
              <div className="font-mono text-sm text-[#616161] dark:text-[#b5bcc4]">
                {position ? (
                  <>
                    <span className="text-[#ac6d46] font-bold">
                      {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                    </span>
                    <span className="ml-3 text-xs">
                      (±{isCurrentLocation ? '10m accurate' : 'Manual selection'})
                    </span>
                  </>
                ) : (
                  'No location selected - click on map'
                )}
              </div>
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="px-4 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Crosshair className="w-4 h-4 inline mr-2" />
              {gettingLocation ? 'LOCATING...' : 'USE CURRENT LOCATION'}
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative" style={{ minHeight: '500px', height: '500px' }}>
          <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />

          {/* Map Instructions Overlay */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 max-w-xs z-10 shadow-lg">
            <div className="text-xs font-bold mb-2 text-[#202020] dark:text-[#e5e5e5]">
              MAP INSTRUCTIONS:
            </div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
              <div>• Search for a location above</div>
              <div>• Click anywhere to drop a marker</div>
              <div>• Scroll to zoom in/out</div>
              <div>• Drag to pan the map</div>
              <div>• Use location button (top-right) for GPS</div>
            </div>
          </div>

          {/* Zoom Level & Map Info Indicator */}
          <div className="absolute bottom-4 right-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] px-3 py-2 z-10 font-mono text-xs">
            <div className="space-y-1">
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Zoom:</span>{' '}
                <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                  {zoom.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Style:</span>{' '}
                <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                  Outdoors
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#202020] dark:border-[#616161] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">DATA SOURCE:</div>
              {isCurrentLocation ? (
                <div>Live GPS Capture (Real-time device location)</div>
              ) : position ? (
                <div>Map Reference (Mapbox manual selection)</div>
              ) : (
                <div>No location selected yet</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all text-sm"
              >
                CANCEL
              </button>
              <button
                onClick={onClose}
                disabled={!position}
                className="px-6 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                CONFIRM LOCATION
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}