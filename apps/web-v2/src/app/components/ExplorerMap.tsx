'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { MapPin, User, X, Maximize2, Minimize2, Bookmark, UserPlus, UserCheck, BookmarkCheck, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/context/ThemeContext';
import { useAuth } from '@/app/context/AuthContext';
import { entryApi, explorerApi } from '@/app/services/api';

// Mapbox configuration - token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
const MAPBOX_STYLE_DARK = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

if (!MAPBOX_TOKEN) {
  console.warn('NEXT_PUBLIC_MAPBOX_TOKEN environment variable is not set');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

type MapMode = 'explorer' | 'entry';

interface MapExplorer {
  username: string;
  name: string;
  picture: string;
  location: string;
  coords: { lat: number; lng: number };
  bio: string;
  entriesCount: number;
  creator: boolean;
}

interface MapEntry {
  id: string;
  title: string;
  explorerName: string;
  explorerUsername: string;
  expeditionName: string;
  expeditionId: string;
  location: string;
  coords: { lat: number; lng: number };
  date: string;
  excerpt: string;
  mediaCount: number;
  wordCount: number;
}

export function ExplorerMap() {
  const [mapMode, setMapMode] = useState<MapMode>('entry');
  const [clickedExplorer, setClickedExplorer] = useState<MapExplorer | null>(null);
  const [clickedEntry, setClickedEntry] = useState<MapEntry | null>(null);
  const [popupPosition, setPopupPosition] = useState<'bottom-left' | 'bottom-right'>('bottom-right');
  const [visibleExplorers, setVisibleExplorers] = useState<MapExplorer[]>([]);
  const [visibleEntries, setVisibleEntries] = useState<MapEntry[]>([]);
  const [allExplorers, setAllExplorers] = useState<MapExplorer[]>([]);
  const [allEntries, setAllEntries] = useState<MapEntry[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followedExplorers, setFollowedExplorers] = useState<Set<string>>(new Set());
  const [bookmarkedEntries, setBookmarkedEntries] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const navControlRef = useRef<mapboxgl.NavigationControl | null>(null);
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Handle follow/unfollow explorer
  const handleFollowExplorer = async (username: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setActionLoading(`follow-${username}`);
    try {
      const isFollowed = followedExplorers.has(username);
      if (isFollowed) {
        await explorerApi.unfollow(username);
        setFollowedExplorers(prev => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      } else {
        await explorerApi.follow(username);
        setFollowedExplorers(prev => new Set(prev).add(username));
      }
    } catch (err) {
      console.error('Error following/unfollowing explorer:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle bookmark/unbookmark entry
  const handleBookmarkEntry = async (entryId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setActionLoading(`bookmark-${entryId}`);
    try {
      // Toggle bookmark - API handles add/remove
      await entryApi.bookmark(entryId);
      setBookmarkedEntries(prev => {
        const next = new Set(prev);
        if (next.has(entryId)) {
          next.delete(entryId);
        } else {
          next.add(entryId);
        }
        return next;
      });
    } catch (err) {
      console.error('Error bookmarking entry:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [entriesResponse, explorersResponse] = await Promise.all([
          entryApi.getAll().catch(() => ({ data: [], results: 0 })),
          explorerApi.getAll().catch(() => ({ data: [], results: 0 })),
        ]);

        // Transform entries with coordinates
        const entriesWithCoords = (entriesResponse.data || [])
          .filter(entry => entry.lat != null && entry.lon != null)
          .map(entry => ({
            id: entry.id || entry.publicId || '',
            title: entry.title,
            explorerName: entry.author?.name || entry.author?.username || 'Unknown',
            explorerUsername: entry.author?.username || '',
            expeditionName: entry.expedition?.title || entry.trip?.title || '',
            expeditionId: entry.expedition?.id || entry.trip?.id || '',
            location: entry.place || '',
            coords: { lat: entry.lat!, lng: entry.lon! },
            date: entry.date || entry.createdAt || '',
            excerpt: entry.content || '',
            mediaCount: entry.mediaCount || 0,
            wordCount: entry.wordCount || 0,
          }));
        setAllEntries(entriesWithCoords);

        // Transform explorers with coordinates (prefer locationLives, fallback to locationFrom)
        const explorersWithCoords = (explorersResponse.data || [])
          .filter(explorer =>
            (explorer.locationLivesLat != null && explorer.locationLivesLon != null) ||
            (explorer.locationFromLat != null && explorer.locationFromLon != null)
          )
          .map(explorer => ({
            username: explorer.username,
            name: explorer.name || explorer.username,
            picture: explorer.picture || '',
            location: explorer.locationLives || explorer.locationFrom || '',
            coords: {
              lat: explorer.locationLivesLat ?? explorer.locationFromLat!,
              lng: explorer.locationLivesLon ?? explorer.locationFromLon!,
            },
            bio: explorer.bio || '',
            entriesCount: explorer.entriesCount || 0,
            creator: explorer.creator || false,
          }));
        setAllExplorers(explorersWithCoords);
      } catch (err) {
        console.error('Error fetching map data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Update visible items based on map bounds
  const updateVisibleItems = useCallback(() => {
    if (!mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    if (mapMode === 'explorer') {
      const visible = allExplorers.filter(explorer =>
        bounds.contains([explorer.coords.lng, explorer.coords.lat])
      );
      setVisibleExplorers(visible);
    } else {
      const visible = allEntries.filter(entry =>
        bounds.contains([entry.coords.lng, entry.coords.lat])
      );
      setVisibleEntries(visible);
    }
  }, [mapMode, allExplorers, allEntries]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT,
      center: [30, 20],
      zoom: 1.5,
      projection: 'mercator',
    });

    mapRef.current = map;

    map.on('error', (e) => {
      if (e.error?.message?.includes('evaluated to null but was expected to be of type')) {
        return;
      }
      console.error('Mapbox error:', e);
    });

    const geocoder = new MapboxGeocoder({
      accessToken: MAPBOX_TOKEN,
      mapboxgl: mapboxgl as any,
      placeholder: 'Search for a location',
      marker: false,
      bbox: [-180, -85, 180, 85],
      types: 'country,region,place,postcode,locality,neighborhood,address,poi',
      language: 'en',
      zoom: 10,
      flyTo: {
        speed: 1.2,
        curve: 1.42,
        easing: (t: number) => t * (2 - t),
        maxDuration: 2000,
      },
    });
    map.addControl(geocoder as any, 'top-right');
    geocoderRef.current = geocoder;

    const navControl = new mapboxgl.NavigationControl();
    map.addControl(navControl, 'top-right');
    navControlRef.current = navControl;

    map.on('moveend', updateVisibleItems);
    map.on('zoomend', updateVisibleItems);

    map.on('load', () => {
      updateVisibleItems();
    });

    return () => {
      map.off('moveend', updateVisibleItems);
      map.off('zoomend', updateVisibleItems);
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when mode or data changes
  useEffect(() => {
    if (!mapRef.current || loading) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Close any open popups
    setClickedExplorer(null);
    setClickedEntry(null);

    // Track event listeners for cleanup
    const eventListeners: Array<{ element: HTMLElement; handler: (e: MouseEvent) => void }> = [];

    if (mapMode === 'explorer') {
      // Add explorer markers
      allExplorers.forEach((explorer) => {
        const el = document.createElement('div');
        el.className = 'explorer-marker';
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.cursor = 'pointer';

        const innerCircle = document.createElement('div');
        innerCircle.style.width = '32px';
        innerCircle.style.height = '32px';
        innerCircle.style.borderRadius = '50%';
        innerCircle.style.backgroundColor = explorer.creator ? '#ac6d46' : '#4676ac';
        innerCircle.style.border = '3px solid white';
        innerCircle.style.position = 'absolute';
        innerCircle.style.top = '50%';
        innerCircle.style.left = '50%';
        innerCircle.style.transform = 'translate(-50%, -50%)';
        innerCircle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        innerCircle.style.display = 'flex';
        innerCircle.style.alignItems = 'center';
        innerCircle.style.justifyContent = 'center';

        const dot = document.createElement('div');
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = 'white';
        innerCircle.appendChild(dot);

        el.appendChild(innerCircle);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([explorer.coords.lng, explorer.coords.lat])
          .addTo(mapRef.current!);

        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();

          markersRef.current.forEach(m => {
            const markerEl = m.getElement();
            if (markerEl && (markerEl as any).removeHighlight) {
              (markerEl as any).removeHighlight();
            }
          });

          if (mapContainerRef.current) {
            const mapRect = mapContainerRef.current.getBoundingClientRect();
            const markerRect = el.getBoundingClientRect();
            const markerCenterX = markerRect.left + markerRect.width / 2 - mapRect.left;
            setPopupPosition(markerCenterX > mapRect.width / 2 ? 'bottom-left' : 'bottom-right');
          }

          setClickedExplorer(explorer);

          innerCircle.style.border = '4px solid #ac6d46';
          innerCircle.style.boxShadow = '0 0 20px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.4)';
        };

        el.addEventListener('click', clickHandler);
        eventListeners.push({ element: el, handler: clickHandler });

        (el as any).removeHighlight = () => {
          innerCircle.style.border = '3px solid white';
          innerCircle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        };

        markersRef.current.push(marker);
      });
    } else {
      // Add entry markers
      allEntries.forEach((entry) => {
        const el = document.createElement('div');
        el.className = 'entry-marker';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.cursor = 'pointer';

        const pin = document.createElement('div');
        pin.style.width = '28px';
        pin.style.height = '28px';
        pin.style.borderRadius = '50% 50% 50% 0';
        pin.style.backgroundColor = '#ac6d46';
        pin.style.border = '3px solid white';
        pin.style.position = 'absolute';
        pin.style.top = '50%';
        pin.style.left = '50%';
        pin.style.transform = 'translate(-50%, -70%) rotate(-45deg)';
        pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        pin.style.display = 'flex';
        pin.style.alignItems = 'center';
        pin.style.justifyContent = 'center';

        const dot = document.createElement('div');
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = 'white';
        dot.style.transform = 'rotate(45deg)';
        pin.appendChild(dot);

        el.appendChild(pin);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([entry.coords.lng, entry.coords.lat])
          .addTo(mapRef.current!);

        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();

          markersRef.current.forEach(m => {
            const markerEl = m.getElement();
            if (markerEl && (markerEl as any).removeHighlight) {
              (markerEl as any).removeHighlight();
            }
          });

          if (mapContainerRef.current) {
            const mapRect = mapContainerRef.current.getBoundingClientRect();
            const markerRect = el.getBoundingClientRect();
            const markerCenterX = markerRect.left + markerRect.width / 2 - mapRect.left;
            setPopupPosition(markerCenterX > mapRect.width / 2 ? 'bottom-left' : 'bottom-right');
          }

          setClickedEntry(entry);

          pin.style.border = '4px solid #ac6d46';
          pin.style.boxShadow = '0 0 20px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.4)';
          pin.style.transform = 'translate(-50%, -70%) rotate(-45deg) scale(1.1)';
        };

        el.addEventListener('click', clickHandler);
        eventListeners.push({ element: el, handler: clickHandler });

        (el as any).removeHighlight = () => {
          pin.style.border = '3px solid white';
          pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          pin.style.transform = 'translate(-50%, -70%) rotate(-45deg)';
        };

        markersRef.current.push(marker);
      });
    }

    updateVisibleItems();

    return () => {
      // Remove event listeners before removing markers
      eventListeners.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [mapMode, allExplorers, allEntries, loading, updateVisibleItems]);

  // Update map style when theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    const newStyle = theme === 'dark' ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT;
    mapRef.current.setStyle(newStyle);
  }, [theme]);

  // Handle fullscreen map resize
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      mapRef.current?.resize();
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  const currentItems = mapMode === 'explorer' ? allExplorers : allEntries;

  return (
    <div className={`bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] ${
      isFullscreen ? 'fixed inset-0 z-50 border-0 flex flex-col' : ''
    }`}>
      {/* Map Header */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] dark:bg-[#3a3a3a]">
        <div className="flex items-center justify-between gap-4 p-4 text-white">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold font-mono">THE EXPLORER ATLAS</h3>
            <div className="h-4 w-px bg-white opacity-30"></div>
            <div className="text-xs font-mono bg-[#202020] bg-opacity-40 px-2.5 py-1.5 border border-[#202020] border-opacity-30 rounded-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                <span className="font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {currentItems.length} {mapMode === 'explorer' ? 'Explorers' : 'Entries'}
                </span>
              )}
            </div>
          </div>

          {/* Mode Toggle + Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMapMode('explorer')}
              className={`px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none flex items-center gap-1.5 whitespace-nowrap ${
                mapMode === 'explorer'
                  ? 'bg-[#ac6d46] text-white focus-visible:ring-[#ac6d46]'
                  : 'bg-[#202020] text-[#b5bcc4] hover:bg-[#2a2a2a] hover:text-white focus-visible:ring-[#616161]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              EXPLORERS
            </button>
            <button
              onClick={() => setMapMode('entry')}
              className={`px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none flex items-center gap-1.5 whitespace-nowrap ${
                mapMode === 'entry'
                  ? 'bg-[#ac6d46] text-white focus-visible:ring-[#ac6d46]'
                  : 'bg-[#202020] text-[#b5bcc4] hover:bg-[#2a2a2a] hover:text-white focus-visible:ring-[#616161]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              ENTRIES
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] flex items-center gap-1.5 whitespace-nowrap bg-[#202020] text-[#b5bcc4] hover:bg-[#2a2a2a] hover:text-white"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="text-xs bg-[#202020] bg-opacity-50 px-4 py-2.5 border-t-2 border-[#202020] dark:border-[#3a3a3a] font-mono text-white">
          {mapMode === 'explorer' ? (
            <span>Showing explorer locations based on their profile. Click markers to view explorer details.</span>
          ) : (
            <span>Displaying journal entries with coordinates. Click markers to preview and read full entries.</span>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className={`relative bg-[#b5bcc4] ${isFullscreen ? 'flex-1' : ''}`} style={!isFullscreen ? { height: '500px' } : {}}>
        {loading && (
          <div className="absolute inset-0 bg-[#202020] bg-opacity-50 flex items-center justify-center z-30">
            <div className="flex items-center gap-3 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="font-mono text-sm">Loading map data...</span>
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="absolute top-0 left-0 w-full h-full" />

        {/* Empty State */}
        {!loading && currentItems.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 text-center max-w-md pointer-events-auto">
              {mapMode === 'explorer' ? (
                <>
                  <User className="w-10 h-10 text-[#b5bcc4] mx-auto mb-3" />
                  <h3 className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">No Explorers with Locations</h3>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Explorers with location data in their profile will appear on this map.
                  </p>
                </>
              ) : (
                <>
                  <MapPin className="w-10 h-10 text-[#b5bcc4] mx-auto mb-3" />
                  <h3 className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">No Entries with Coordinates</h3>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Journal entries with location data will appear on this map.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Explorer Popup */}
        {clickedExplorer && mapMode === 'explorer' && (
          <div
            className={`absolute w-80 max-w-[calc(100%-2rem)] bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              popupPosition === 'bottom-left' ? 'bottom-20 left-4' : 'bottom-20 right-4'
            }`}
          >
            <div className="p-3 text-xs font-mono">
              <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] pb-2 mb-2">
                <div className="flex items-center gap-2">
                  {clickedExplorer.picture && (
                    <Image src={clickedExplorer.picture} alt={clickedExplorer.name} className="w-8 h-8 rounded-full object-cover" width={32} height={32} />
                  )}
                  <div>
                    <div className="font-bold text-sm dark:text-[#e5e5e5]">{clickedExplorer.name}</div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">@{clickedExplorer.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs ${clickedExplorer.creator ? 'bg-[#ac6d46]' : 'bg-[#4676ac]'} text-white`}>
                    {clickedExplorer.creator ? 'PRO' : 'EXPLORER'}
                  </span>
                  <button
                    onClick={() => {
                      setClickedExplorer(null);
                      markersRef.current.forEach(m => {
                        const el = m.getElement();
                        if (el && (el as any).removeHighlight) {
                          (el as any).removeHighlight();
                        }
                      });
                    }}
                    className="p-1 hover:bg-[#202020] hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded transition-all active:scale-[0.95] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                  >
                    <X className="w-4 h-4 text-[#202020] dark:text-[#e5e5e5]" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-[#202020] dark:text-[#e5e5e5]">
                {clickedExplorer.location && (
                  <div><strong>LOCATION:</strong> {clickedExplorer.location}</div>
                )}
                <div><strong>ENTRIES:</strong> {clickedExplorer.entriesCount}</div>
                {clickedExplorer.bio && (
                  <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-2 border-l-2 border-[#ac6d46] text-xs leading-relaxed">
                    {clickedExplorer.bio.substring(0, 150)}{clickedExplorer.bio.length > 150 ? '...' : ''}
                  </div>
                )}

                <div className="flex gap-2 pt-3 mt-3 border-t-2 border-[#202020] dark:border-[#616161]">
                  <button
                    onClick={() => window.open(`/journal/${clickedExplorer.username}`, '_blank')}
                    className="flex-1 bg-[#ac6d46] text-white py-2 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold text-center"
                  >
                    VIEW JOURNAL
                  </button>
                  <button
                    onClick={() => handleFollowExplorer(clickedExplorer.username)}
                    disabled={actionLoading === `follow-${clickedExplorer.username}`}
                    className={`py-2 px-3 transition-all active:scale-[0.98] disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none flex items-center justify-center ${
                      followedExplorers.has(clickedExplorer.username)
                        ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                        : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
                    }`}
                    title={followedExplorers.has(clickedExplorer.username) ? 'Following' : 'Follow'}
                  >
                    {actionLoading === `follow-${clickedExplorer.username}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : followedExplorers.has(clickedExplorer.username) ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entry Popup */}
        {clickedEntry && mapMode === 'entry' && (
          <div
            className={`absolute w-96 max-w-[calc(100%-2rem)] bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-2xl z-20 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              popupPosition === 'bottom-left' ? 'bottom-20 left-4' : 'bottom-20 right-4'
            }`}
          >
            <div className="p-3 text-xs font-mono">
              <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] pb-2 mb-2">
                <div className="flex-1">
                  <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">{clickedEntry.title}</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] text-xs">
                    <button
                      onClick={() => window.open(`/journal/${clickedEntry.explorerUsername}`, '_blank')}
                      className="text-[#ac6d46] hover:underline"
                    >
                      {clickedEntry.explorerName}
                    </button>
                    {clickedEntry.expeditionName && (
                      <>
                        {' • '}
                        <button
                          onClick={() => window.open(`/expedition/${clickedEntry.expeditionId}`, '_blank')}
                          className="text-[#4676ac] hover:underline"
                        >
                          {clickedEntry.expeditionName}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setClickedEntry(null);
                    markersRef.current.forEach(m => {
                      const el = m.getElement();
                      if (el && (el as any).removeHighlight) {
                        (el as any).removeHighlight();
                      }
                    });
                  }}
                  className="p-1 hover:bg-[#202020] hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 rounded transition-all active:scale-[0.95] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-[#616161] ml-2"
                >
                  <X className="w-4 h-4 text-[#202020] dark:text-[#e5e5e5]" />
                </button>
              </div>
              <div className="space-y-2 text-[#202020] dark:text-[#e5e5e5]">
                {clickedEntry.location && (
                  <div><strong>LOCATION:</strong> {clickedEntry.location}</div>
                )}
                {clickedEntry.date && (
                  <div><strong>POSTED:</strong> {new Date(clickedEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                )}
                {clickedEntry.excerpt && (
                  <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-2 border-l-2 border-[#ac6d46] italic text-xs leading-relaxed">
                    "{clickedEntry.excerpt.substring(0, 150)}{clickedEntry.excerpt.length > 150 ? '...' : ''}"
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#b5bcc4] dark:border-[#616161] text-xs">
                  <div><strong>MEDIA:</strong> {clickedEntry.mediaCount} items</div>
                  <div><strong>WORDS:</strong> {clickedEntry.wordCount.toLocaleString()}</div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-3 mt-3 border-t-2 border-[#202020] dark:border-[#616161]">
                  <button
                    onClick={() => window.open(`/entry/${clickedEntry.id}`, '_blank')}
                    className="col-span-3 bg-[#ac6d46] text-white py-2 px-3 hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold text-center"
                  >
                    READ ENTRY
                  </button>
                  <button
                    onClick={() => handleBookmarkEntry(clickedEntry.id)}
                    disabled={actionLoading === `bookmark-${clickedEntry.id}`}
                    className={`py-2 px-3 transition-all active:scale-[0.98] disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none flex items-center justify-center ${
                      bookmarkedEntries.has(clickedEntry.id)
                        ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                        : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] focus-visible:ring-[#616161]'
                    }`}
                    title={bookmarkedEntries.has(clickedEntry.id) ? 'Bookmarked' : 'Bookmark'}
                  >
                    {actionLoading === `bookmark-${clickedEntry.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : bookmarkedEntries.has(clickedEntry.id) ? (
                      <BookmarkCheck className="w-4 h-4" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#202020] bg-opacity-95 text-white p-4 z-10">
          {mapMode === 'explorer' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">IN VIEW</div>
                <div className="font-bold text-lg">{visibleExplorers.length}</div>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">PRO EXPLORERS</div>
                <div className="font-bold text-lg text-[#ac6d46]">{visibleExplorers.filter(e => e.creator).length}</div>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">TOTAL ENTRIES</div>
                <div className="font-bold text-lg">{visibleExplorers.reduce((sum, e) => sum + e.entriesCount, 0)}</div>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">LOCATIONS</div>
                <div className="font-bold text-lg">{new Set(visibleExplorers.map(e => e.location)).size}</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">IN VIEW</div>
                <div className="font-bold text-lg">{visibleEntries.length}</div>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">TOTAL WORDS</div>
                <div className="font-bold text-lg">
                  {visibleEntries.length > 0
                    ? (visibleEntries.reduce((sum, e) => sum + (e.wordCount || 0), 0) / 1000).toFixed(1) + 'k'
                    : '0'}
                </div>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">TOTAL MEDIA</div>
                <div className="font-bold text-lg">{visibleEntries.reduce((sum, e) => sum + (e.mediaCount || 0), 0)}</div>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">EXPLORERS</div>
                <div className="font-bold text-lg text-[#ac6d46]">{new Set(visibleEntries.map(e => e.explorerUsername)).size}</div>
              </div>
              <div className="border-l-2 border-[#ac6d46] pl-3">
                <div className="text-[#b5bcc4]">EXPEDITIONS</div>
                <div className="font-bold text-lg">{new Set(visibleEntries.filter(e => e.expeditionName).map(e => e.expeditionName)).size}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
