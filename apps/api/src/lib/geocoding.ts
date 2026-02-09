/**
 * Geocoding utilities using Mapbox API
 * Used to reverse geocode coordinates to country codes
 */

interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  properties: {
    short_code?: string;
  };
  text: string;
  place_name: string;
  context?: Array<{
    id: string;
    short_code?: string;
    text: string;
  }>;
}

interface MapboxResponse {
  type: string;
  features: MapboxFeature[];
}

/**
 * Forward geocode a location string to coordinates using Mapbox geocoding API
 * Returns null if coordinates cannot be determined
 */
export async function getCoordinatesFromLocation(
  locationText: string,
): Promise<{ lat: number; lon: number } | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    console.warn(
      'MAPBOX_ACCESS_TOKEN not configured, skipping geocoding',
    );
    return null;
  }

  try {
    const encoded = encodeURIComponent(locationText);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Mapbox geocoding error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (data.features && data.features.length > 0) {
      const [lon, lat] = (data.features[0] as any).center as [number, number];
      return { lat, lon };
    }

    return null;
  } catch (error) {
    console.error('Error during forward geocoding:', error);
    return null;
  }
}

/**
 * Get ISO 3166-1 alpha-2 country code from coordinates using Mapbox reverse geocoding
 * Returns null if country cannot be determined
 */
export async function getCountryCodeFromCoordinates(
  lat: number,
  lon: number,
): Promise<string | null> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;

  if (!token) {
    console.warn(
      'MAPBOX_ACCESS_TOKEN not configured, skipping country code lookup',
    );
    return null;
  }

  try {
    // Use Mapbox reverse geocoding API
    // Request only country-level data for efficiency
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=country&access_token=${token}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `Mapbox geocoding error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (data.features && data.features.length > 0) {
      const countryFeature = data.features[0];

      // The short_code in properties contains the ISO country code (lowercase)
      if (countryFeature.properties?.short_code) {
        return countryFeature.properties.short_code.toUpperCase();
      }
    }

    return null;
  } catch (error) {
    console.error('Error during reverse geocoding:', error);
    return null;
  }
}
