'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { X, MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTheme } from '@/app/context/ThemeContext';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const MAPBOX_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

interface ViewLocationMapProps {
  lat: number;
  lng: number;
  locationName: string;
  elevation: number;
  onClose: () => void;
}

export function ViewLocationMap({ lat, lng, locationName, elevation, onClose }: ViewLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);

  // Delay map initialization to ensure container is rendered
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
      center: [lng, lat],
      zoom: 13,
    });

    // Resize map after it loads
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

    // Add fullscreen control
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="#ac6d46" stroke="#ac6d46" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
      </svg>
    `;
    el.style.cursor = 'pointer';
    el.style.filter = 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))';

    // Add marker
    new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map);

    // Add popup with location info
    new mapboxgl.Popup({ offset: 25, closeButton: false })
      .setLngLat([lng, lat])
      .setHTML(`
        <div style="font-family: monospace; font-size: 12px; padding: 4px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${locationName}</div>
          <div style="color: #616161;">
            ${lat.toFixed(6)}°, ${lng.toFixed(6)}°<br/>
            Elevation: ${elevation}m
          </div>
        </div>
      `)
      .addTo(map);

    mapRef.current = map;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady, lat, lng, locationName, elevation, theme]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#202020] border-4 border-[#202020] dark:border-[#616161] w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              LOCATION MAP
            </h2>
            <div className="text-xs mt-1 text-[#f5f5f5]">
              {locationName}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#8a5738] transition-all"
            aria-label="Close map"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Location Info Bar */}
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161] p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">GPS COORDINATES:</div>
              <div className="font-bold text-[#ac6d46]">
                {lat.toFixed(6)}°N, {lng.toFixed(6)}°E
              </div>
            </div>
            <div>
              <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">ELEVATION:</div>
              <div className="font-bold dark:text-[#e5e5e5]">{elevation} meters</div>
            </div>
            <div>
              <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">MAP STYLE:</div>
              <div className="font-bold dark:text-[#e5e5e5]">Mapbox Outdoors</div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative" style={{ minHeight: '500px', height: '500px' }}>
          <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />

          {/* Map Instructions Overlay */}
          <div className="absolute top-4 left-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 max-w-xs z-10 shadow-lg">
            <div className="text-xs font-bold mb-2 text-[#202020] dark:text-[#e5e5e5]">
              MAP CONTROLS:
            </div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
              <div>• Scroll to zoom in/out</div>
              <div>• Drag to pan the map</div>
              <div>• Use controls (top-right) for zoom/fullscreen</div>
              <div>• Copper marker shows entry location</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#202020] dark:border-[#616161] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">LOCATION SOURCE:</div>
              <div>GPS coordinates from journal entry metadata</div>
            </div>
            <div className="flex gap-3">
              <a
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all text-sm whitespace-nowrap"
              >
                OPEN IN GOOGLE MAPS
              </a>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all text-sm whitespace-nowrap"
              >
                CLOSE MAP
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}