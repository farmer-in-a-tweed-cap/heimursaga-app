const R_KM = 6371;
const TO_RAD = Math.PI / 180;

/**
 * Haversine distance between two [lng, lat] coordinate pairs.
 * Returns distance in kilometres.
 */
export function haversineKm(coord1: number[], coord2: number[]): number {
  const dLat = (coord2[1] - coord1[1]) * TO_RAD;
  const dLon = (coord2[0] - coord1[0]) * TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1[1] * TO_RAD) *
      Math.cos(coord2[1] * TO_RAD) *
      Math.sin(dLon / 2) ** 2;
  return R_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Haversine distance between two {lat, lng} objects.
 * Returns distance in kilometres.
 */
export function haversineFromLatLng(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineKm([a.lng, a.lat], [b.lng, b.lat]);
}

/**
 * Haversine distance between two {lat, lng} objects.
 * Returns distance in metres.
 */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return haversineFromLatLng(a, b) * 1000;
}
