'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader, AlertCircle } from 'lucide-react';
import type { LocationData } from '@/app/utils/locationPrivacy';

// Mapbox token loaded from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface GeocodingResult {
  id: string;
  displayName: string;
  city?: string;
  region?: string; // State/Province
  country?: string;
  continent?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface LocationAutocompleteInputProps {
  value: string; // Display value
  onChange: (location: LocationData) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * LocationAutocompleteInput Component
 * 
 * Provides geocoded location search with autocomplete suggestions.
 * Returns structured location data including coordinates.
 * 
 * IMPLEMENTATION:
 * - Integrates with Mapbox Geocoding API
 * - Uses existing Mapbox access token from platform configuration
 * 
 * BACKEND API INTEGRATION:
 * - Create endpoint: GET /api/geocoding/search?query={searchText}
 * - Backend should call Mapbox Geocoding API: https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json
 * - Debounce client-side requests (300-500ms)
 * - Cache results to minimize API calls and costs
 * - Parse Mapbox response and return structured data matching GeocodingResult interface
 * 
 * MAPBOX RESPONSE STRUCTURE:
 * - features[].place_name: Full formatted address
 * - features[].context[]: Array containing place hierarchy (city, region, country)
 * - features[].center: [lng, lat] coordinates
 * - See: https://docs.mapbox.com/api/search/geocoding/
 */
export function LocationAutocompleteInput({
  value,
  onChange,
  placeholder = 'Search for a location...',
  label,
  disabled = false,
  className = '',
}: LocationAutocompleteInputProps) {
  const [searchText, setSearchText] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);
  const hasUserTyped = useRef(false);

  // Sync searchText when external value changes (but don't trigger search)
  useEffect(() => {
    if (!hasUserTyped.current) {
      // Use a microtask to avoid synchronous setState in effect body
      queueMicrotask(() => {
        setSearchText(value);
      });
    }
  }, [value]);

  // Mark initial mount as complete after first render
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced geocoding search - only trigger when user has typed
  useEffect(() => {
    // Skip search on initial mount or if user hasn't typed yet
    if (isInitialMount.current || !hasUserTyped.current) {
      return;
    }

    // Debounce: wait 400ms after user stops typing
    const debounceTimer = setTimeout(async () => {
      if (searchText.length < 3) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await fetchMapboxGeocodingResults(searchText);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setIsLoading(false);
      } catch (_err) {
        setError('Failed to search locations');
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  // Handle selection
  const handleSelect = (result: GeocodingResult) => {
    // Reset hasUserTyped so the searchText change doesn't trigger a new search
    hasUserTyped.current = false;
    setSearchText(result.displayName);
    setIsOpen(false);
    setSelectedIndex(-1);
    setSuggestions([]);

    // Return structured location data
    onChange({
      city: result.city,
      region: result.region,
      country: result.country,
      continent: result.continent,
      coordinates: result.coordinates,
      privacyLevel: 'CITY_LEVEL', // Default, parent component will apply user's preference
      formattedAddress: result.displayName,
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => {
            hasUserTyped.current = true;
            setSearchText(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac] disabled:bg-[#f5f5f5] disabled:border-[#b5bcc4] disabled:cursor-not-allowed ${className}`}
        />
        
        {/* Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4] animate-spin" strokeWidth={2} />
          ) : error ? (
            <AlertCircle className="w-4 h-4 text-red-500" strokeWidth={2} />
          ) : (
            <MapPin className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4]" strokeWidth={2} />
          )}
        </div>

        {/* Clear button */}
        {searchText && !disabled && (
          <button
            type="button"
            onClick={() => {
              hasUserTyped.current = true;
              setSearchText('');
              setSuggestions([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#616161] dark:text-[#b5bcc4] hover:text-[#202020] dark:hover:text-[#e5e5e5] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-lg max-h-[300px] overflow-y-auto">
          {suggestions.map((result, index) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-3 py-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] border-b border-[#b5bcc4] dark:border-[#3a3a3a] last:border-b-0 ${
                index === selectedIndex ? 'bg-[#f5f5f5] dark:bg-[#2a2a2a]' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#ac6d46] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] truncate">
                    {result.city || result.displayName}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] truncate">
                    {result.region && result.country 
                      ? `${result.region}, ${result.country}`
                      : result.country || result.continent
                    }
                  </div>
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                    {result.coordinates.lat.toFixed(4)}°, {result.coordinates.lng.toFixed(4)}°
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      {searchText.length > 0 && searchText.length < 3 && (
        <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
          Type at least 3 characters to search
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Fetch geocoding results from Mapbox Geocoding API
 */
async function fetchMapboxGeocodingResults(query: string): Promise<GeocodingResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,region,country&limit=5`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Geocoding request failed');
  }

  const data = await response.json();

  // Parse Mapbox response into our GeocodingResult format
  return data.features.map((feature: any) => {
    // Extract context (city, region, country, etc.)
    const context = feature.context || [];

    // Helper to find context by type
    const findContext = (type: string) =>
      context.find((c: any) => c.id.startsWith(type))?.text;

    // Determine the place type and extract appropriate fields
    const placeType = feature.place_type?.[0];
    let city: string | undefined;
    let region: string | undefined;
    let country: string | undefined;

    if (placeType === 'place' || placeType === 'locality') {
      city = feature.text;
      region = findContext('region');
      country = findContext('country');
    } else if (placeType === 'region') {
      region = feature.text;
      country = findContext('country');
    } else if (placeType === 'country') {
      country = feature.text;
    } else {
      // Fallback
      city = feature.text;
      region = findContext('region');
      country = findContext('country');
    }

    // Get continent from country (approximate mapping)
    const continent = getContinentFromCountry(country);

    return {
      id: feature.id,
      displayName: feature.place_name,
      city,
      region,
      country,
      continent,
      coordinates: {
        lat: feature.center[1],
        lng: feature.center[0],
      },
    };
  });
}

/**
 * Map country to continent (simplified)
 */
function getContinentFromCountry(country?: string): string | undefined {
  if (!country) return undefined;

  const continentMap: Record<string, string> = {
    // North America
    'United States': 'North America',
    'Canada': 'North America',
    'Mexico': 'North America',
    // Europe
    'United Kingdom': 'Europe',
    'France': 'Europe',
    'Germany': 'Europe',
    'Italy': 'Europe',
    'Spain': 'Europe',
    'Portugal': 'Europe',
    'Netherlands': 'Europe',
    'Belgium': 'Europe',
    'Switzerland': 'Europe',
    'Austria': 'Europe',
    'Poland': 'Europe',
    'Czech Republic': 'Europe',
    'Sweden': 'Europe',
    'Norway': 'Europe',
    'Denmark': 'Europe',
    'Finland': 'Europe',
    'Greece': 'Europe',
    'Ireland': 'Europe',
    // Asia
    'China': 'Asia',
    'Japan': 'Asia',
    'South Korea': 'Asia',
    'India': 'Asia',
    'Thailand': 'Asia',
    'Vietnam': 'Asia',
    'Indonesia': 'Asia',
    'Malaysia': 'Asia',
    'Singapore': 'Asia',
    'Philippines': 'Asia',
    // Central Asia
    'Uzbekistan': 'Central Asia',
    'Kazakhstan': 'Central Asia',
    'Kyrgyzstan': 'Central Asia',
    'Tajikistan': 'Central Asia',
    'Turkmenistan': 'Central Asia',
    // Caucasus
    'Georgia': 'Caucasus',
    'Armenia': 'Caucasus',
    'Azerbaijan': 'Caucasus',
    // Middle East
    'Turkey': 'Europe/Asia',
    'Iran': 'Middle East',
    'Iraq': 'Middle East',
    'Israel': 'Middle East',
    'Jordan': 'Middle East',
    'Lebanon': 'Middle East',
    'Saudi Arabia': 'Middle East',
    'United Arab Emirates': 'Middle East',
    // Africa
    'Egypt': 'Africa',
    'Morocco': 'Africa',
    'South Africa': 'Africa',
    'Kenya': 'Africa',
    'Tanzania': 'Africa',
    'Nigeria': 'Africa',
    // South America
    'Brazil': 'South America',
    'Argentina': 'South America',
    'Chile': 'South America',
    'Peru': 'South America',
    'Colombia': 'South America',
    // Oceania
    'Australia': 'Oceania',
    'New Zealand': 'Oceania',
  };

  return continentMap[country] || undefined;
}