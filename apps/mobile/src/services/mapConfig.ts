// ─── Mapbox Configuration ────────────────────────────────────────────────────
//
// SECURITY NOTE: The access token below is a public Mapbox token (pk.*).
// It is safe to bundle in client applications but should be scope-restricted
// in the Mapbox dashboard to the app's bundle ID and allowed URLs.
//
// For production builds, prefer loading this from a build-time env variable
// (e.g. MAPBOX_PUBLIC_TOKEN in your CI/CD pipeline) rather than committing
// the literal value here.

export const STYLE_LIGHT = 'mapbox://styles/cnh1187/cm9lit4gy007101rz4wxfdss6';
export const STYLE_DARK  = 'mapbox://styles/cnh1187/cminkk0hb002d01qy60mm74g0';

export const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

export function getMapStyle(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? STYLE_DARK : STYLE_LIGHT;
}
