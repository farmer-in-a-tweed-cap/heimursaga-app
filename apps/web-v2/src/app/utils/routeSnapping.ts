/** Project point p onto segment a→b, return squared distance and parameter t ∈ [0,1] */
export function projectToSegment(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): { distSq: number; t: number } {
  const cosLat = Math.cos((p.lat * Math.PI) / 180);
  const px = p.lng * cosLat, py = p.lat;
  const ax = a.lng * cosLat, ay = a.lat;
  const bx = b.lng * cosLat, by = b.lat;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  }
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return { distSq: (px - projX) ** 2 + (py - projY) ** 2, t };
}

/**
 * Build merged [lng, lat] route coordinates with entries snapped to their
 * nearest waypoint-to-waypoint segment.
 */
export function buildMergedRouteCoords(
  waypointCoords: Array<{ lat: number; lng: number }>,
  entryCoords: Array<{ lat: number; lng: number }>,
): number[][] {
  const wps = waypointCoords.filter(c => c.lat !== 0 || c.lng !== 0);
  const ents = entryCoords.filter(c => c.lat !== 0 || c.lng !== 0);

  if (wps.length === 0 && ents.length === 0) return [];
  if (wps.length === 0) return ents.map(c => [c.lng, c.lat]);
  if (ents.length === 0) return wps.map(c => [c.lng, c.lat]);

  if (wps.length < 2) {
    return [[wps[0].lng, wps[0].lat], ...ents.map(c => [c.lng, c.lat])];
  }

  const snapped = ents.map(coord => {
    let bestDistSq = Infinity;
    let bestSeg = 0;
    let bestT = 0;
    for (let i = 0; i < wps.length - 1; i++) {
      const { distSq, t } = projectToSegment(coord, wps[i], wps[i + 1]);
      if (distSq < bestDistSq) { bestDistSq = distSq; bestSeg = i; bestT = t; }
    }
    return { coord, segIdx: bestSeg, t: bestT };
  });
  snapped.sort((a, b) => a.segIdx !== b.segIdx ? a.segIdx - b.segIdx : a.t - b.t);

  const result: number[][] = [];
  let snapIdx = 0;
  for (let i = 0; i < wps.length; i++) {
    result.push([wps[i].lng, wps[i].lat]);
    while (snapIdx < snapped.length && snapped[snapIdx].segIdx === i) {
      result.push([snapped[snapIdx].coord.lng, snapped[snapIdx].coord.lat]);
      snapIdx++;
    }
  }
  while (snapIdx < snapped.length) {
    result.push([snapped[snapIdx].coord.lng, snapped[snapIdx].coord.lat]);
    snapIdx++;
  }
  return result;
}
