import mapboxgl from 'mapbox-gl';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

/**
 * Creates an externalGeocoder function for @mapbox/mapbox-gl-geocoder that
 * supplements standard Geocoding v5 results with POI data from the
 * Mapbox Search Box API (Foursquare-backed business/POI coverage).
 *
 * Uses a two-step flow: suggest (get IDs) → retrieve (get coordinates).
 */
export function createPOIGeocoder(map: mapboxgl.Map) {
  const sessionToken = crypto.randomUUID();

  return async (query: string): Promise<any[]> => {
    if (query.length < 2) return [];

    const center = map.getCenter();

    try {
      // Step 1: Suggest — get POI suggestions with mapbox_ids
      const suggestUrl =
        `https://api.mapbox.com/search/searchbox/v1/suggest` +
        `?q=${encodeURIComponent(query)}` +
        `&proximity=${center.lng},${center.lat}` +
        `&types=poi` +
        `&limit=3` +
        `&session_token=${sessionToken}` +
        `&access_token=${MAPBOX_TOKEN}`;

      const suggestRes = await fetch(suggestUrl);
      if (!suggestRes.ok) return [];
      const suggestData = await suggestRes.json();

      const suggestions = suggestData.suggestions || [];
      if (suggestions.length === 0) return [];

      // Step 2: Retrieve — get full GeoJSON for each suggestion
      const features = await Promise.all(
        suggestions.map(async (s: any) => {
          try {
            const retrieveUrl =
              `https://api.mapbox.com/search/searchbox/v1/retrieve/${s.mapbox_id}` +
              `?session_token=${sessionToken}` +
              `&access_token=${MAPBOX_TOKEN}`;
            const retrieveRes = await fetch(retrieveUrl);
            if (!retrieveRes.ok) return null;
            const retrieveData = await retrieveRes.json();
            const f = retrieveData.features?.[0];
            if (!f) return null;

            // Convert to v5-compatible extended GeoJSON for the geocoder dropdown
            return {
              type: 'Feature',
              geometry: f.geometry,
              center: f.geometry.coordinates,
              place_name: [
                f.properties.name,
                f.properties.place_formatted,
              ]
                .filter(Boolean)
                .join(', '),
              text: f.properties.name || '',
              properties: f.properties,
            };
          } catch {
            return null;
          }
        }),
      );

      return features.filter(Boolean);
    } catch {
      return [];
    }
  };
}
