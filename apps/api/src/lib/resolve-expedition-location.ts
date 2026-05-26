import { PrismaService } from '@/modules/prisma';

interface LocationReference {
  type: string;
  id: string;
}

export interface ResolvedLocation {
  lat: number;
  lon: number;
  name: string;
  countryCode?: string;
}

/**
 * Batch resolve expedition current_location references (waypoint IDs or entry public_ids)
 * to their actual coordinates.
 *
 * @returns Map keyed by `type:id` → `{ lat, lon, name }`
 */
export async function resolveExpeditionLocations(
  prisma: PrismaService,
  references: LocationReference[],
): Promise<Map<string, ResolvedLocation>> {
  const result = new Map<string, ResolvedLocation>();
  if (references.length === 0) return result;

  // Group by type
  const waypointIds: number[] = [];
  const entryPublicIds: string[] = [];
  const trackPointIds: bigint[] = [];

  for (const ref of references) {
    if (ref.type === 'waypoint') {
      const parsed = parseInt(ref.id, 10);
      if (!isNaN(parsed)) waypointIds.push(parsed);
    } else if (ref.type === 'entry') {
      entryPublicIds.push(ref.id);
    } else if (ref.type === 'live_track') {
      // BigInt parse defensively — invalid strings (e.g. stale data) just
      // miss the lookup rather than throw.
      try {
        trackPointIds.push(BigInt(ref.id));
      } catch {
        /* ignore */
      }
    }
  }

  // Batch fetch waypoints
  if (waypointIds.length > 0) {
    const waypoints = await prisma.waypoint.findMany({
      where: { id: { in: waypointIds }, deleted_at: null },
      select: { id: true, lat: true, lon: true, title: true },
    });
    for (const wp of waypoints) {
      if (wp.lat != null && wp.lon != null) {
        result.set(`waypoint:${wp.id}`, {
          lat: wp.lat,
          lon: wp.lon,
          name: wp.title || 'Waypoint',
        });
      }
    }
  }

  // Batch fetch entries
  if (entryPublicIds.length > 0) {
    const entries = await prisma.entry.findMany({
      where: { public_id: { in: entryPublicIds }, deleted_at: null },
      select: {
        public_id: true,
        lat: true,
        lon: true,
        place: true,
        country_code: true,
      },
    });
    for (const entry of entries) {
      if (entry.lat != null && entry.lon != null) {
        result.set(`entry:${entry.public_id}`, {
          lat: entry.lat,
          lon: entry.lon,
          name: entry.place || 'Entry location',
          countryCode: entry.country_code || undefined,
        });
      }
    }
  }

  // Batch fetch live track points. Name is a placeholder — Phase 1 displays
  // coordinates rather than a reverse-geocoded label.
  if (trackPointIds.length > 0) {
    const points = await prisma.trackPoint.findMany({
      where: { id: { in: trackPointIds } },
      select: { id: true, lat: true, lon: true },
    });
    for (const p of points) {
      result.set(`live_track:${p.id}`, {
        lat: p.lat,
        lon: p.lon,
        name: 'Live position',
      });
    }
  }

  return result;
}
