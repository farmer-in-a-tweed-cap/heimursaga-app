/**
 * Waterway Routing Service
 *
 * A* pathfinding on an OSM waterway graph with in-memory tile caching.
 * Supports canoe (bidirectional) and motorboat (downstream + canals) profiles.
 */
import { Injectable } from '@nestjs/common';

import { Logger } from '@/modules/logger';

import type { RouteResult, RouteObstacle } from './routing.service';
import {
  type GraphEdge,
  type WaterwayGraph,
  type WaterwayObstacle,
  buildGraph,
  fetchOverpassTile,
  findNearestNode,
  haversineKm,
  tileKey,
  tilesForBbox,
} from './waterway-graph';

// Cache tiles for 6 hours — waterway data changes very rarely
const TILE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Max snap distance from input waypoint to nearest waterway node
const MAX_SNAP_KM = 0.2;

// A* cost multiplier for upstream paddling (canoe)
const UPSTREAM_PENALTY = 1.4;

interface CachedTile {
  canoe: WaterwayGraph;
  motorboat: WaterwayGraph;
  fetchedAt: number;
}

@Injectable()
export class WaterwayRoutingService {
  private tileCache = new Map<string, CachedTile>();
  private pendingFetches = new Map<string, Promise<CachedTile>>();

  constructor(private logger: Logger) {}

  async getWaterwayRoute(
    locations: Array<{ lat: number; lon: number }>,
    profile: 'canoe' | 'motorboat',
  ): Promise<RouteResult> {
    if (locations.length < 2) {
      throw new Error('At least 2 locations are required');
    }

    // Determine bounding box with padding
    const lats = locations.map((l) => l.lat);
    const lons = locations.map((l) => l.lon);
    const pad = 0.1; // ~11km padding
    const minLat = Math.min(...lats) - pad;
    const maxLat = Math.max(...lats) + pad;
    const minLon = Math.min(...lons) - pad;
    const maxLon = Math.max(...lons) + pad;

    // Fetch all needed tiles
    const tiles = tilesForBbox(minLat, minLon, maxLat, maxLon);

    // Limit tile count to prevent abuse
    if (tiles.length > 16) {
      throw new Error(
        'Route area is too large — waterway routing supports routes within approximately 400km',
      );
    }

    // Fetch tiles sequentially to avoid Overpass rate limits
    const tileData: CachedTile[] = [];
    for (const key of tiles) {
      tileData.push(await this.getTile(key));
    }

    // Merge all tile graphs into one
    const mergedGraph = this.mergeGraphs(
      tileData.map((t) => (profile === 'canoe' ? t.canoe : t.motorboat)),
    );

    if (mergedGraph.nodes.size === 0) {
      throw new Error(
        'No navigable waterways found in this area — the region may not have mapped waterway data',
      );
    }

    this.logger.log(
      `Waterway graph: ${mergedGraph.nodes.size} nodes, ${Array.from(mergedGraph.adjacency.values()).reduce((a, b) => a + b.length, 0)} edges`,
    );

    // Route between each consecutive pair of locations
    let allCoordinates: [number, number][] = [];
    const allNodeIds: number[] = [];
    const legDistances: number[] = [];
    const legDurations: number[] = [];
    const snapDistances: number[] = [];
    let totalUpstreamKm = 0;
    let totalDownstreamKm = 0;

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const nearest = findNearestNode(
        mergedGraph,
        loc.lat,
        loc.lon,
        MAX_SNAP_KM,
      );
      if (!nearest) {
        throw new Error(
          `No waterway found within ${MAX_SNAP_KM}km of waypoint ${i + 1} — it may be too far from any river or canal`,
        );
      }
      snapDistances.push(nearest.distanceKm * 1000); // convert to meters
    }

    for (let i = 0; i < locations.length - 1; i++) {
      const startSnap = findNearestNode(
        mergedGraph,
        locations[i].lat,
        locations[i].lon,
        MAX_SNAP_KM,
      )!;
      const endSnap = findNearestNode(
        mergedGraph,
        locations[i + 1].lat,
        locations[i + 1].lon,
        MAX_SNAP_KM,
      )!;

      const path = this.astar(
        mergedGraph,
        startSnap.nodeId,
        endSnap.nodeId,
        profile,
      );

      if (!path) {
        throw new Error(
          `No waterway route found between waypoints ${i + 1} and ${i + 2} — they may be on disconnected waterways`,
        );
      }

      // Convert path node IDs to coordinates
      const coords: [number, number][] = path.nodeIds.map((nid) => {
        const node = mergedGraph.nodes.get(nid)!;
        return [node.lon, node.lat]; // GeoJSON [lng, lat]
      });

      // Track upstream/downstream distances per edge
      for (let j = 0; j < path.edgeIsUpstream.length; j++) {
        const fromNode = mergedGraph.nodes.get(path.nodeIds[j])!;
        const toNode = mergedGraph.nodes.get(path.nodeIds[j + 1])!;
        const segKm = haversineKm(
          fromNode.lat,
          fromNode.lon,
          toNode.lat,
          toNode.lon,
        );
        if (path.edgeIsUpstream[j]) {
          totalUpstreamKm += segKm;
        } else {
          totalDownstreamKm += segKm;
        }
      }

      if (allCoordinates.length > 0) {
        allCoordinates = allCoordinates.concat(coords.slice(1));
        allNodeIds.push(...path.nodeIds.slice(1));
      } else {
        allCoordinates = coords;
        allNodeIds.push(...path.nodeIds);
      }

      legDistances.push(path.distanceKm);
      // Estimate duration: ~5 km/h canoe downstream, ~3.5 km/h upstream, ~15 km/h motorboat
      if (profile === 'canoe') {
        const legUpstream = path.edgeIsUpstream.filter(Boolean).length;
        const legTotal = path.edgeIsUpstream.length || 1;
        const upFrac = legUpstream / legTotal;
        const avgSpeed = 5 * (1 - upFrac) + 3.5 * upFrac;
        legDurations.push((path.distanceKm / avgSpeed) * 3600);
      } else {
        legDurations.push((path.distanceKm / 15) * 3600);
      }
    }

    const totalDistance = legDistances.reduce((a, b) => a + b, 0);
    const totalDuration = legDurations.reduce((a, b) => a + b, 0);
    const upstreamFraction =
      totalDistance > 0 ? totalUpstreamKm / totalDistance : 0;

    // Detect obstacles along the computed route
    const routeObstacles: RouteObstacle[] = [];
    if (mergedGraph.obstacles.size > 0) {
      const routeNodeSet = new Set(allNodeIds);
      for (const [nodeId, obs] of mergedGraph.obstacles) {
        if (routeNodeSet.has(nodeId)) {
          routeObstacles.push({
            lat: obs.lat,
            lon: obs.lon,
            type: obs.type,
            name: obs.name,
          });
        }
      }

      if (routeObstacles.length > 0) {
        this.logger.log(
          `Waterway route: ${routeObstacles.length} obstacle(s) detected — ${routeObstacles.map(o => o.type).join(', ')}`,
        );
      }
    }

    return {
      coordinates: allCoordinates,
      legDistances,
      legDurations,
      totalDistance,
      totalDuration,
      snapDistances,
      flowDirection:
        upstreamFraction < 0.1
          ? ('downstream' as const)
          : upstreamFraction > 0.9
            ? ('upstream' as const)
            : ('mixed' as const),
      upstreamFraction,
      ...(routeObstacles.length > 0 ? { obstacles: routeObstacles } : {}),
    };
  }

  /**
   * A* pathfinding on the waterway graph using a binary min-heap.
   */
  private astar(
    graph: WaterwayGraph,
    startId: number,
    goalId: number,
    profile: 'canoe' | 'motorboat',
  ): {
    nodeIds: number[];
    distanceKm: number;
    edgeIsUpstream: boolean[];
  } | null {
    const goalNode = graph.nodes.get(goalId);
    if (!goalNode) return null;

    const gScore = new Map<number, number>(); // cost-adjusted distance (for A* priority)
    const realDist = new Map<number, number>(); // actual distance in km (for reporting)
    const cameFrom = new Map<number, number>();
    const edgeUpstream = new Map<number, boolean>(); // tracks if edge leading to this node is upstream
    const closed = new Set<number>();

    // Binary min-heap: [fScore, nodeId]
    const heap: [number, number][] = [];
    const push = (f: number, id: number) => {
      heap.push([f, id]);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent][0] <= heap[i][0]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
      }
    };
    const pop = (): [number, number] | undefined => {
      if (heap.length === 0) return undefined;
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        while (true) {
          let smallest = i;
          const l = 2 * i + 1;
          const r = 2 * i + 2;
          if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
          if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
          if (smallest === i) break;
          [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
          i = smallest;
        }
      }
      return top;
    };

    const startNode = graph.nodes.get(startId)!;
    const h0 = haversineKm(
      startNode.lat,
      startNode.lon,
      goalNode.lat,
      goalNode.lon,
    );
    gScore.set(startId, 0);
    realDist.set(startId, 0);
    push(h0, startId);

    let iterations = 0;
    const MAX_ITERATIONS = 100000;

    while (heap.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const entry = pop()!;
      const current = entry[1];

      if (current === goalId) {
        const path: number[] = [current];
        const pathUpstream: boolean[] = [];
        let c = current;
        while (cameFrom.has(c)) {
          pathUpstream.unshift(edgeUpstream.get(c) ?? false);
          c = cameFrom.get(c)!;
          path.unshift(c);
        }
        return {
          nodeIds: path,
          distanceKm: realDist.get(goalId)!,
          edgeIsUpstream: pathUpstream,
        };
      }

      if (closed.has(current)) continue;
      closed.add(current);

      const edges = graph.adjacency.get(current) || [];

      for (const edge of edges) {
        if (closed.has(edge.to)) continue;
        if (profile === 'motorboat' && !edge.motorboatAllowed) continue;

        let edgeCost = edge.distanceKm;
        if (profile === 'canoe' && edge.isUpstream) {
          edgeCost *= UPSTREAM_PENALTY;
        }

        const tentativeG = (gScore.get(current) ?? Infinity) + edgeCost;
        if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
          cameFrom.set(edge.to, current);
          gScore.set(edge.to, tentativeG);
          realDist.set(edge.to, (realDist.get(current) ?? 0) + edge.distanceKm);
          edgeUpstream.set(edge.to, edge.isUpstream);

          const toNode = graph.nodes.get(edge.to);
          const h = toNode
            ? haversineKm(toNode.lat, toNode.lon, goalNode.lat, goalNode.lon)
            : 0;
          push(tentativeG + h, edge.to);
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Get or fetch a cached tile.
   */
  private async getTile(key: string): Promise<CachedTile> {
    const cached = this.tileCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < TILE_CACHE_TTL_MS) {
      return cached;
    }

    // Prevent duplicate fetches for the same tile
    const pending = this.pendingFetches.get(key);
    if (pending) return pending;

    const fetchPromise = this.fetchAndBuildTile(key);
    this.pendingFetches.set(key, fetchPromise);

    try {
      const result = await fetchPromise;
      this.tileCache.set(key, result);
      return result;
    } finally {
      this.pendingFetches.delete(key);
    }
  }

  private async fetchAndBuildTile(key: string): Promise<CachedTile> {
    const [latStr, lonStr] = key.split(',');
    const latFloor = parseInt(latStr, 10);
    const lonFloor = parseInt(lonStr, 10);

    this.logger.log(
      `Fetching waterway tile [${latFloor}, ${lonFloor}] from Overpass`,
    );

    try {
      const elements = await fetchOverpassTile(latFloor, lonFloor);

      this.logger.log(
        `Waterway tile [${latFloor}, ${lonFloor}]: ${elements.length} OSM elements`,
      );

      const canoeGraph = buildGraph(elements, 'canoe');
      const motorboatGraph = buildGraph(elements, 'motorboat');

      return {
        canoe: canoeGraph,
        motorboat: motorboatGraph,
        fetchedAt: Date.now(),
      };
    } catch (err: any) {
      this.logger.error(
        `Failed to fetch waterway tile [${key}]: ${err.message}`,
      );
      // Return empty graphs so the route fails gracefully at the pathfinding stage
      return {
        canoe: { nodes: new Map(), adjacency: new Map(), obstacles: new Map(), builtAt: Date.now() },
        motorboat: {
          nodes: new Map(),
          adjacency: new Map(),
          obstacles: new Map(),
          builtAt: Date.now(),
        },
        fetchedAt: Date.now(),
      };
    }
  }

  /**
   * Merge multiple tile graphs into one.
   */
  private mergeGraphs(graphs: WaterwayGraph[]): WaterwayGraph {
    const merged: WaterwayGraph = {
      nodes: new Map(),
      adjacency: new Map(),
      obstacles: new Map(),
      builtAt: Date.now(),
    };

    for (const graph of graphs) {
      for (const [id, node] of graph.nodes) {
        merged.nodes.set(id, node);
      }
      for (const [id, edges] of graph.adjacency) {
        const existing = merged.adjacency.get(id) || [];
        merged.adjacency.set(id, existing.concat(edges));
      }
      for (const [id, obstacle] of graph.obstacles) {
        merged.obstacles.set(id, obstacle);
      }
    }

    return merged;
  }
}
