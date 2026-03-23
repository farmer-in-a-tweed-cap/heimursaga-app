/**
 * Waterway Graph Builder
 *
 * Fetches waterway data from OpenStreetMap via Overpass API,
 * builds a directed graph suitable for A* pathfinding.
 *
 * Node ordering convention: OSM waterway nodes are ordered upstream→downstream.
 * For canoe routing, edges are bidirectional (can paddle upstream).
 * For motorboat routing, edges follow flow direction only.
 */

export interface GraphNode {
  id: number; // OSM node ID
  lat: number;
  lon: number;
}

export interface GraphEdge {
  from: number; // OSM node ID
  to: number;
  distanceKm: number;
  waterwayType: string; // river, canal, stream
  waterwayName: string | null;
  isUpstream: boolean; // true if edge goes against flow (canoe only)
  motorboatAllowed: boolean;
}

export interface WaterwayGraph {
  nodes: Map<number, GraphNode>;
  adjacency: Map<number, GraphEdge[]>; // node ID → outgoing edges
  builtAt: number;
}

/** Tile key for caching: "lat_floor,lon_floor" */
export function tileKey(lat: number, lon: number): string {
  return `${Math.floor(lat)},${Math.floor(lon)}`;
}

/** Compute all tile keys needed to cover a bounding box */
export function tilesForBbox(
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number,
): string[] {
  const keys: string[] = [];
  for (let lat = Math.floor(minLat); lat <= Math.floor(maxLat); lat++) {
    for (let lon = Math.floor(minLon); lon <= Math.floor(maxLon); lon++) {
      keys.push(`${lat},${lon}`);
    }
  }
  return keys;
}

/** Haversine distance in kilometers */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Snap tolerance for connecting nearby waterway endpoints (meters)
const SNAP_TOLERANCE_M = 25;

interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

/**
 * Determines if a waterway is navigable for the given profile.
 */
function isNavigable(
  tags: Record<string, string>,
  profile: 'canoe' | 'motorboat',
): boolean {
  const type = tags.waterway;

  // Explicit navigability tags
  if (profile === 'canoe') {
    if (tags.canoe === 'yes' || tags.boat === 'yes') return true;
    if (tags.canoe === 'no') return false;
  }
  if (profile === 'motorboat') {
    if (tags.motorboat === 'yes' || tags.ship === 'yes') return true;
    if (tags.boat === 'yes') return true;
    if (tags.motorboat === 'no' || tags.boat === 'no') return false;
  }

  // CEMT classification implies navigability
  if (tags.CEMT && tags.CEMT !== '0') return true;

  // Canals are built for navigation
  if (type === 'canal') return true;
  if (type === 'fairway') return true;

  // Rivers: use heuristics
  if (type === 'river') {
    // Named rivers are generally significant enough to navigate
    if (tags.name) return true;
    // Width check
    const width = parseFloat(tags.width);
    if (!isNaN(width)) {
      if (profile === 'canoe' && width >= 3) return true;
      if (profile === 'motorboat' && width >= 10) return true;
    }
    // Default: canoes can attempt unnamed rivers, motorboats cannot
    return profile === 'canoe';
  }

  // Streams: canoe only, and only if explicitly tagged or wide enough
  if (type === 'stream') {
    if (profile === 'motorboat') return false;
    if (tags.canoe === 'yes' || tags.boat === 'yes') return true;
    const width = parseFloat(tags.width);
    if (!isNaN(width) && width >= 3) return true;
    // Named streams get a pass for canoes
    if (tags.name) return true;
    return false;
  }

  return false;
}

/**
 * Fetch waterway data from Overpass API for a 1°×1° tile.
 */
export async function fetchOverpassTile(
  latFloor: number,
  lonFloor: number,
): Promise<OverpassElement[]> {
  const bbox = `${latFloor},${lonFloor},${latFloor + 1},${lonFloor + 1}`;

  const query = `
[out:json][timeout:90];
(
  way["waterway"~"river|canal|fairway"](${bbox});
  way["waterway"="stream"]["canoe"="yes"](${bbox});
  way["waterway"="stream"]["boat"="yes"](${bbox});
);
out body;
>;
out skel qt;
`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  const encodedQuery = `data=${encodeURIComponent(query)}`;

  for (let attempt = 0; attempt < endpoints.length; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(endpoints[attempt], {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodedQuery,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (
          (response.status === 504 || response.status === 429) &&
          attempt < endpoints.length - 1
        ) {
          continue; // Try next endpoint
        }
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();
      return data.elements || [];
    } catch (err: any) {
      if (attempt < endpoints.length - 1 && err.name !== 'AbortError') {
        continue; // Try next endpoint
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  return []; // Should not reach here
}

/**
 * Build a routing graph from Overpass API elements.
 * Includes snap-tolerance merging for imperfect confluences.
 */
export function buildGraph(
  elements: OverpassElement[],
  profile: 'canoe' | 'motorboat',
): WaterwayGraph {
  const nodes = new Map<number, GraphNode>();
  const adjacency = new Map<number, GraphEdge[]>();

  // Phase 1: Index all nodes by ID
  for (const el of elements) {
    if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, { id: el.id, lat: el.lat, lon: el.lon });
    }
  }

  // Phase 2: Process waterway ways into edges
  for (const el of elements) {
    if (el.type !== 'way' || !el.nodes || !el.tags) continue;
    if (!el.tags.waterway) continue;
    if (!isNavigable(el.tags, profile)) continue;

    const wayNodes = el.nodes;
    const waterwayType = el.tags.waterway;
    const waterwayName = el.tags.name || null;
    const isCanalOrFairway =
      waterwayType === 'canal' || waterwayType === 'fairway';

    // Motorboat check for this specific way
    const motorboatAllowed =
      el.tags.motorboat === 'yes' ||
      el.tags.ship === 'yes' ||
      (el.tags.boat === 'yes' && el.tags.motorboat !== 'no') ||
      (el.tags.CEMT !== undefined && el.tags.CEMT !== '0') ||
      (waterwayType === 'canal' &&
        el.tags.motorboat !== 'no' &&
        el.tags.boat !== 'no');

    for (let i = 0; i < wayNodes.length - 1; i++) {
      const fromId = wayNodes[i];
      const toId = wayNodes[i + 1];
      const fromNode = nodes.get(fromId);
      const toNode = nodes.get(toId);
      if (!fromNode || !toNode) continue;

      const dist = haversineKm(
        fromNode.lat,
        fromNode.lon,
        toNode.lat,
        toNode.lon,
      );

      // Downstream edge (flow direction)
      const downstreamEdge: GraphEdge = {
        from: fromId,
        to: toId,
        distanceKm: dist,
        waterwayType,
        waterwayName,
        isUpstream: false,
        motorboatAllowed,
      };

      if (!adjacency.has(fromId)) adjacency.set(fromId, []);
      adjacency.get(fromId)!.push(downstreamEdge);

      // Upstream edge (canoe can paddle upstream; canals are bidirectional)
      if (profile === 'canoe' || isCanalOrFairway) {
        const upstreamEdge: GraphEdge = {
          from: toId,
          to: fromId,
          distanceKm: dist,
          waterwayType,
          waterwayName,
          isUpstream: !isCanalOrFairway, // canals have no "upstream"
          motorboatAllowed,
        };

        if (!adjacency.has(toId)) adjacency.set(toId, []);
        adjacency.get(toId)!.push(upstreamEdge);
      }
    }
  }

  // Phase 3: Snap-tolerance merging for imperfect confluences
  // Uses a spatial grid for O(1) neighbor lookup instead of O(N) scans
  const snapThresholdKm = SNAP_TOLERANCE_M / 1000;
  // Grid cell size ~0.001° ≈ 111m — comfortably covers 25m snap tolerance
  const CELL_SIZE = 0.001;

  // Build incoming-edge set for fast endpoint detection
  const hasIncoming = new Set<number>();
  for (const edges of adjacency.values()) {
    for (const e of edges) hasIncoming.add(e.to);
  }

  // Identify endpoints: nodes with ≤1 outgoing edge or no incoming edges
  const endpointIds = new Set<number>();
  for (const [id, edges] of adjacency) {
    if (edges.length <= 1 || !hasIncoming.has(id)) {
      endpointIds.add(id);
    }
  }

  // Build spatial grid of all graph nodes (only those with edges)
  const grid = new Map<string, number[]>();
  for (const [id] of adjacency) {
    const node = nodes.get(id);
    if (!node) continue;
    const cellKey = `${Math.floor(node.lat / CELL_SIZE)},${Math.floor(node.lon / CELL_SIZE)}`;
    if (!grid.has(cellKey)) grid.set(cellKey, []);
    grid.get(cellKey)!.push(id);
  }

  // For each endpoint, check only neighboring grid cells
  const merged = new Set<string>();
  for (const epId of endpointIds) {
    const ep = nodes.get(epId);
    if (!ep) continue;

    const cellLat = Math.floor(ep.lat / CELL_SIZE);
    const cellLon = Math.floor(ep.lon / CELL_SIZE);

    // Build connected-to set for fast lookup
    const connectedTo = new Set<number>();
    for (const e of adjacency.get(epId) || []) connectedTo.add(e.to);

    let bestId: number | null = null;
    let bestDist = snapThresholdKm;

    // Check 3×3 neighborhood of grid cells
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        const neighborKey = `${cellLat + dLat},${cellLon + dLon}`;
        const cellNodes = grid.get(neighborKey);
        if (!cellNodes) continue;

        for (const candidateId of cellNodes) {
          if (candidateId === epId) continue;
          if (connectedTo.has(candidateId)) continue;

          const candidate = nodes.get(candidateId)!;
          const d = haversineKm(ep.lat, ep.lon, candidate.lat, candidate.lon);
          if (d < bestDist) {
            bestDist = d;
            bestId = candidateId;
          }
        }
      }
    }

    if (bestId !== null) {
      const mergeKey = `${Math.min(epId, bestId)},${Math.max(epId, bestId)}`;
      if (merged.has(mergeKey)) continue;
      merged.add(mergeKey);

      const snapEdge: GraphEdge = {
        from: epId,
        to: bestId,
        distanceKm: bestDist,
        waterwayType: 'connection',
        waterwayName: null,
        isUpstream: false,
        motorboatAllowed: false,
      };

      if (!adjacency.has(epId)) adjacency.set(epId, []);
      adjacency.get(epId)!.push(snapEdge);

      const reverseEdge: GraphEdge = { ...snapEdge, from: bestId, to: epId };
      if (!adjacency.has(bestId)) adjacency.set(bestId, []);
      adjacency.get(bestId)!.push(reverseEdge);
    }
  }

  return { nodes, adjacency, builtAt: Date.now() };
}

/**
 * Find the nearest graph node to a given coordinate.
 * Returns null if nothing is within maxDistKm.
 */
export function findNearestNode(
  graph: WaterwayGraph,
  lat: number,
  lon: number,
  maxDistKm: number = 0.5,
): { nodeId: number; distanceKm: number } | null {
  let bestId: number | null = null;
  let bestDist = maxDistKm;

  for (const [id, node] of graph.nodes) {
    // Only consider nodes that have edges (are part of the routing graph)
    if (!graph.adjacency.has(id)) continue;

    const d = haversineKm(lat, lon, node.lat, node.lon);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }

  if (bestId === null) return null;
  return { nodeId: bestId, distanceKm: bestDist };
}
