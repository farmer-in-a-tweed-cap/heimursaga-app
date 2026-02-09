/**
 * Location Privacy Utilities
 * Handles location data privacy levels and formatting for the Heimursaga platform
 */

export type LocationPrivacyLevel = 
  | 'PRECISE_COORDINATES'
  | 'CITY_LEVEL'
  | 'REGIONAL_LEVEL'
  | 'COUNTRY_LEVEL'
  | 'CONTINENT_LEVEL'
  | 'HIDDEN';

export interface LocationData {
  // Full granular data stored in backend
  city?: string;
  region?: string;
  country?: string;
  continent?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  // Privacy level determines what gets displayed
  privacyLevel: LocationPrivacyLevel;
  // For display
  formattedAddress?: string;
}

export interface LocationPrivacyOption {
  value: LocationPrivacyLevel;
  label: string;
  description: string;
  detailLevel: 'minimal' | 'moderate' | 'precise';
  example: string;
}

/**
 * Available privacy levels with descriptions
 */
export const LOCATION_PRIVACY_OPTIONS: LocationPrivacyOption[] = [
  {
    value: 'HIDDEN',
    label: 'Hidden',
    description: 'Do not display any current location information',
    detailLevel: 'minimal',
    example: '[Location Hidden]',
  },
  {
    value: 'CONTINENT_LEVEL',
    label: 'Continent/Region Level',
    description: 'Show only continent or large geographic region',
    detailLevel: 'minimal',
    example: 'Central Asia',
  },
  {
    value: 'COUNTRY_LEVEL',
    label: 'Country Level',
    description: 'Show only country name',
    detailLevel: 'minimal',
    example: 'Uzbekistan',
  },
  {
    value: 'REGIONAL_LEVEL',
    label: 'Regional/State Level',
    description: 'Show region, state, or province within country',
    detailLevel: 'moderate',
    example: 'Samarkand Region, Uzbekistan',
  },
  {
    value: 'CITY_LEVEL',
    label: 'City Level',
    description: 'Show city name and country',
    detailLevel: 'moderate',
    example: 'Samarkand, Uzbekistan',
  },
  {
    value: 'PRECISE_COORDINATES',
    label: 'Precise Coordinates',
    description: 'Show exact GPS coordinates for maximum detail',
    detailLevel: 'precise',
    example: '39.6270°N, 66.9750°E',
  },
];

/**
 * Format location data according to privacy level
 */
export function formatLocationByPrivacy(
  location: LocationData
): { displayText: string; displayCoordinates?: string } {
  const { privacyLevel, city, region, country, continent, coordinates } = location;

  switch (privacyLevel) {
    case 'HIDDEN':
      return {
        displayText: '[Location Hidden]',
        displayCoordinates: undefined,
      };

    case 'CONTINENT_LEVEL':
      return {
        displayText: continent || 'Unknown Region',
        displayCoordinates: undefined,
      };

    case 'COUNTRY_LEVEL':
      return {
        displayText: country || 'Unknown Country',
        displayCoordinates: undefined,
      };

    case 'REGIONAL_LEVEL':
      const regionName = region || city; // city may actually be a state/region for 2-part locations
      if (regionName && country) {
        return {
          displayText: `${regionName}, ${country}`,
          displayCoordinates: coordinates ? `~${Math.round(coordinates.lat)}°N, ~${Math.round(coordinates.lng)}°E` : undefined,
        };
      }
      return {
        displayText: country || 'Unknown Region',
        displayCoordinates: undefined,
      };

    case 'CITY_LEVEL':
      if (city && country) {
        return {
          displayText: `${city}, ${country}`,
          displayCoordinates: coordinates ? `~${coordinates.lat.toFixed(1)}°N, ~${coordinates.lng.toFixed(1)}°E` : undefined,
        };
      }
      return {
        displayText: region || country || 'Unknown City',
        displayCoordinates: undefined,
      };

    case 'PRECISE_COORDINATES':
      const displayText = city && country 
        ? `${city}, ${country}`
        : region || country || 'Unknown Location';
      
      return {
        displayText,
        displayCoordinates: coordinates 
          ? `${coordinates.lat.toFixed(4)}°${coordinates.lat >= 0 ? 'N' : 'S'}, ${Math.abs(coordinates.lng).toFixed(4)}°${coordinates.lng >= 0 ? 'E' : 'W'}`
          : undefined,
      };

    default:
      return {
        displayText: 'Location Not Set',
        displayCoordinates: undefined,
      };
  }
}

/**
 * Get privacy level option details
 */
export function getPrivacyLevelInfo(level: LocationPrivacyLevel): LocationPrivacyOption {
  return LOCATION_PRIVACY_OPTIONS.find(opt => opt.value === level) || LOCATION_PRIVACY_OPTIONS[0];
}

/**
 * Check if coordinates should be displayed based on privacy level
 */
export function shouldDisplayCoordinates(level: LocationPrivacyLevel): boolean {
  return level === 'PRECISE_COORDINATES' || 
         level === 'CITY_LEVEL' || 
         level === 'REGIONAL_LEVEL';
}

/**
 * Parse location string into structured data
 * Example: "Samarkand, Samarkand Region, Uzbekistan"
 */
export function parseLocationString(locationStr: string): Partial<LocationData> {
  const parts = locationStr.split(',').map(s => s.trim());
  
  if (parts.length === 1) {
    return { country: parts[0] };
  } else if (parts.length === 2) {
    return { city: parts[0], country: parts[1] };
  } else if (parts.length >= 3) {
    return {
      city: parts[0],
      region: parts[1],
      country: parts[2],
    };
  }
  
  return {};
}

/**
 * Sync current location from active expedition
 * This would be called when an expedition updates its location
 */
export function syncLocationFromExpedition(
  expeditionLocation: LocationData,
  explorerPrivacyLevel: LocationPrivacyLevel
): LocationData {
  return {
    ...expeditionLocation,
    privacyLevel: explorerPrivacyLevel, // Use explorer's privacy settings
  };
}

/**
 * Validate if location data is complete enough for display
 */
export function isLocationDataValid(location: LocationData, minLevel: LocationPrivacyLevel): boolean {
  switch (minLevel) {
    case 'PRECISE_COORDINATES':
      return !!location.coordinates;
    case 'CITY_LEVEL':
      return !!location.city && !!location.country;
    case 'REGIONAL_LEVEL':
      return !!location.region && !!location.country;
    case 'COUNTRY_LEVEL':
      return !!location.country;
    case 'CONTINENT_LEVEL':
      return !!location.continent;
    case 'HIDDEN':
      return true; // Always valid for hidden
    default:
      return false;
  }
}