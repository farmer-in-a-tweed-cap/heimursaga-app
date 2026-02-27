'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTheme } from '@/app/context/ThemeContext';
import { useMapLayer, getMapStyle } from '@/app/context/MapLayerContext';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface InlineLocationMapProps {
  lat: number;
  lng: number;
  locationName?: string;
  className?: string;
}

export function InlineLocationMap({ lat, lng, className = '' }: InlineLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { theme } = useTheme();
  const { mapLayer } = useMapLayer();
  const [mapReady, setMapReady] = useState(false);

  // Delay map initialization to ensure container is rendered
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapRef.current || !MAPBOX_TOKEN) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(mapLayer, theme),
      center: [lng, lat],
      zoom: 12,
      interactive: true,
    });

    map.on('load', () => {
      map.resize();
    });

    // Suppress non-critical Mapbox warnings
    map.on('error', (e) => {
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) {
        return;
      }
      console.error('Mapbox error:', e);
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    // Create circle marker (matching entry markers on expedition maps)
    const el = document.createElement('div');
    Object.assign(el.style, {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: '#ac6d46',
      border: '3px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      cursor: 'pointer',
    });

    new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady, lat, lng, theme, mapLayer]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`bg-[#e8e8e8] dark:bg-[#2a2a2a] flex items-center justify-center ${className}`}>
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] text-center p-4">
          Map unavailable
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
