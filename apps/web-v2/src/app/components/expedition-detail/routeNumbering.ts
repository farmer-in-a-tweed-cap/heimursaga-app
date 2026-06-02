/**
 * Combined route-stop numbering, shared by the expedition detail "route" tab
 * (ContentTabs) and the map markers (ExpeditionDetailPage banner + modal maps)
 * so the two views never disagree.
 *
 * A route is a single ordered sequence of stops. Each stop is either an
 * unconverted waypoint or a journal entry (a "converted" waypoint renders its
 * linked entries in its place). We number them with ONE sequential counter in
 * route order — matching the builder's `positionNumber = routeIdx + 1` — rather
 * than the old scheme of independent per-type counters that produced duplicate
 * "#1" badges for an entry and a waypoint.
 *
 * Ordering (must match ContentTabs' routeItems build):
 *   1. Walk waypoints in sequence. For a waypoint with linked entries, inline
 *      those entries (in entryIds order); otherwise the waypoint itself.
 *   2. Append entries linked to no waypoint, sorted by date (with route
 *      position then createdAt as tiebreakers).
 *
 * Start/End and multi-entry cluster markers render 'S'/'E' or a count instead of
 * the position number, but each stop still consumes a position so the remaining
 * numbers stay sequential.
 */

interface WaypointLike {
  id: string;
  entryIds?: string[];
}

interface EntryLike {
  id: string;
  date: string;
  createdAt?: string;
}

export interface RouteNumbering {
  /** entry public_id → 1-based position in the combined route order */
  numberByEntryId: Map<string, number>;
  /** waypoint id → 1-based position (only unconverted waypoints appear here) */
  numberByWaypointId: Map<string, number>;
}

export function computeRouteNumbering(
  waypoints: WaypointLike[],
  journalEntries: EntryLike[],
): RouteNumbering {
  const entryById = new Map(journalEntries.map((e) => [e.id, e]));

  // Route position of each linked entry, used as a tiebreaker when ordering
  // entries that share a date.
  const entryRoutePosition = new Map<string, number>();
  waypoints.forEach((wp, wpIdx) => {
    (wp.entryIds || []).forEach((eid) => entryRoutePosition.set(eid, wpIdx));
  });

  const sortedEntries = [...journalEntries].sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (da !== db) return da - db;
    const ra = entryRoutePosition.get(a.id) ?? Infinity;
    const rb = entryRoutePosition.get(b.id) ?? Infinity;
    if (ra !== rb) return ra - rb;
    return (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
  });

  const numberByEntryId = new Map<string, number>();
  const numberByWaypointId = new Map<string, number>();
  let pos = 0;

  for (const wp of waypoints) {
    const eids = wp.entryIds || [];
    if (eids.length > 0) {
      for (const eid of eids) {
        if (entryById.has(eid)) {
          pos += 1;
          numberByEntryId.set(eid, pos);
        }
      }
    } else {
      pos += 1;
      numberByWaypointId.set(wp.id, pos);
    }
  }

  const linkedEntryIds = new Set(waypoints.flatMap((wp) => wp.entryIds || []));
  for (const entry of sortedEntries) {
    if (!linkedEntryIds.has(entry.id)) {
      pos += 1;
      numberByEntryId.set(entry.id, pos);
    }
  }

  return { numberByEntryId, numberByWaypointId };
}
