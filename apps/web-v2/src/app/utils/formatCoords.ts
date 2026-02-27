export function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}\u00B0${ns}, ${Math.abs(lng).toFixed(4)}\u00B0${ew}`;
}
