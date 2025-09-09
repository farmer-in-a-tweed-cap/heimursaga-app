// Mapbox configuration
// You'll need to get a Mapbox access token from https://account.mapbox.com/access-tokens/
// For development, you can use the default public token, but for production you should use your own

// Using the same Mapbox token as the web app
export const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiY25oMTE4NyIsImEiOiJja28wZTZpNGowY3RoMnBvaTgxZ2M5c3ljIn0.t3_T3EN00e5w7D0et4hf-w';

// Default map configuration
export const MAP_CONFIG = {
  defaultZoom: 2,
  defaultCenter: [0, 20] as [number, number], // World view centered slightly north
  maxZoom: 18,
  minZoom: 1,
} as const;

// Map styles - using the same custom style as the web app
export const MAP_STYLES = {
  custom: 'mapbox://styles/cnh1187/clikkzykm00wb01qf28pz4adt', // Main Heimursaga style
  street: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
} as const;