'use client';

import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTheme } from '@/app/context/ThemeContext';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const MAPBOX_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

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
      style: theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
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

    // Create custom marker
    const el = document.createElement('div');
    el.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#ac6d46" stroke="#ac6d46" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
      </svg>
    `;
    el.style.cursor = 'pointer';
    el.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))';

    new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapReady, lat, lng, theme]);

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
