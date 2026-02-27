interface WaypointLike {
  name: string;
  coordinates: { lat: number; lng: number };
  date: string;
  description: string;
  sequence: number;
}

export function buildWaypointPayload(waypoint: WaypointLike) {
  return {
    title: waypoint.name,
    lat: waypoint.coordinates.lat,
    lon: waypoint.coordinates.lng,
    date: waypoint.date || null,
    description: waypoint.description || undefined,
    sequence: waypoint.sequence,
  };
}
