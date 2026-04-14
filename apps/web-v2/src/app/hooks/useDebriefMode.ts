import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { haversineKm } from '@/app/utils/haversine';
import type { WaypointType, JournalEntryType, DebriefStop } from '@/app/components/expedition-detail/types';
import type { Expedition } from '@/app/services/api';
import type { ClusteredMarkersResult } from '@/app/utils/mapClustering';

interface UseDebriefModeParams {
  waypoints: WaypointType[];
  journalEntries: JournalEntryType[];
  apiExpedition: Expedition | null;
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
  handleFitBounds: () => void;
  formatDistance: (km: number, decimals?: number) => string;
}

export function useDebriefMode({
  waypoints,
  journalEntries,
  apiExpedition,
  mapRef,
  handleFitBounds,
}: UseDebriefModeParams) {
  const [isDebriefMode, setIsDebriefMode] = useState(false);
  const [debriefIndex, setDebriefIndex] = useState(0);
  const [debriefDistance, setDebriefDistance] = useState(0);

  const debriefCumulativeDistRef = useRef<number[]>([]);
  const prevDebriefIndexRef = useRef<number>(0);
  const debriefRouteIndicesRef = useRef<number[]>([]);
  const routeCoordsRef = useRef<number[][]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const waypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const clusteredRef = useRef<ClusteredMarkersResult | null>(null);

  // Build debrief route — waypoint-first: iterate waypoints in sequence,
  // converted waypoints show entry content, unconverted show waypoint info.
  // Legacy entries (not linked to any waypoint) appended at end.
  const debriefRoute: DebriefStop[] = useMemo(() => {
    const stops: DebriefStop[] = [];

    // Collect all entry IDs linked to waypoints
    const linkedEntryIds = new Set<string>();
    waypoints.forEach(wp => {
      (wp.entryIds || []).forEach(id => linkedEntryIds.add(id));
    });

    // Iterate waypoints in sequence order
    waypoints.forEach((wp, idx) => {
      if (wp.coords.lat === 0 && wp.coords.lng === 0) return;

      const wpEntryIds = wp.entryIds || [];

      if (wpEntryIds.length > 0) {
        // Converted waypoint — create entry stops from linked entries
        const matchedEntries = wpEntryIds
          .map(eid => journalEntries.find(e => e.id === eid))
          .filter(Boolean)
          .sort((a, b) => (a!.date || '').localeCompare(b!.date || ''));

        if (matchedEntries.length > 0) {
          matchedEntries.forEach(entry => {
            stops.push({
              type: 'entry',
              id: entry!.id,
              title: entry!.title,
              location: entry!.location,
              date: entry!.date,
              coords: wp.coords,
              excerpt: entry!.excerpt,
              mediaCount: entry!.mediaCount,
            });
          });
        } else {
          // Entry data not found in journalEntries, fall back to waypoint stop
          stops.push({
            type: 'waypoint',
            id: wp.id,
            title: wp.title,
            location: wp.location,
            date: wp.date,
            coords: wp.coords,
            description: wp.description,
            status: wp.status,
            notes: wp.notes,
            waypointIndex: idx,
          });
        }
      } else {
        // Unconverted waypoint
        stops.push({
          type: 'waypoint',
          id: wp.id,
          title: wp.title,
          location: wp.location,
          date: wp.date,
          coords: wp.coords,
          description: wp.description,
          status: wp.status,
          notes: wp.notes,
          waypointIndex: idx,
        });
      }
    });

    // Legacy fallback: entries not linked to any waypoint
    journalEntries.forEach(entry => {
      if (entry.coords.lat === 0 && entry.coords.lng === 0) return;
      if (linkedEntryIds.has(entry.id)) return;
      stops.push({
        type: 'entry',
        id: entry.id,
        title: entry.title,
        location: entry.location,
        date: entry.date,
        coords: entry.coords,
        excerpt: entry.excerpt,
        mediaCount: entry.mediaCount,
      });
    });

    if (apiExpedition?.isRoundTrip && stops.length >= 2) {
      const first = stops[0];
      stops.push({
        ...first,
        id: `${first.id}-return`,
        title: `Return: ${first.title}`,
      });
    }

    return stops;
  }, [waypoints, journalEntries, apiExpedition?.isRoundTrip]);

  const canDebrief = debriefRoute.length >= 2;

  // Map entry IDs to their 1-based timeline position
  const entryTimelinePositions = useMemo(() => {
    const posMap = new Map<string, number>();
    debriefRoute.forEach((stop, idx) => {
      posMap.set(stop.id, idx + 1);
    });
    return posMap;
  }, [debriefRoute]);

  // Debrief mode helpers
  const removeAllHighlights = useCallback(() => {
    markersRef.current.forEach(m => {
      const el = m.getElement();
      if (el && (el as any).removeHighlight) {
        (el as any).removeHighlight();
      }
    });
    waypointMarkersRef.current.forEach(m => {
      const el = m.getElement();
      if (el) {
        el.style.outline = 'none';
        el.style.boxShadow = el.style.boxShadow?.includes('wp-pulse')
          ? el.style.boxShadow
          : (el.dataset.originalBoxShadow || '');
      }
    });
  }, []);

  const highlightDebriefStop = useCallback((stop: DebriefStop) => {
    removeAllHighlights();
    const COORD_THRESHOLD = 0.0001;

    if (stop.type === 'entry') {
      markersRef.current.forEach(m => {
        const lngLat = m.getLngLat();
        if (
          Math.abs(lngLat.lat - stop.coords.lat) < COORD_THRESHOLD &&
          Math.abs(lngLat.lng - stop.coords.lng) < COORD_THRESHOLD
        ) {
          const el = m.getElement();
          if (el) {
            el.style.boxShadow = '0 0 0 6px rgba(172, 109, 70, 0.5), 0 0 0 12px rgba(172, 109, 70, 0.3), 0 0 20px rgba(172, 109, 70, 0.8)';
            el.style.border = '3px solid white';
            el.style.zIndex = '1000';
          }
        }
      });
    } else {
      waypointMarkersRef.current.forEach(m => {
        const lngLat = m.getLngLat();
        if (
          Math.abs(lngLat.lat - stop.coords.lat) < COORD_THRESHOLD &&
          Math.abs(lngLat.lng - stop.coords.lng) < COORD_THRESHOLD
        ) {
          const el = m.getElement();
          if (el) {
            el.style.outline = '3px solid #ac6d46';
            el.style.outlineOffset = '3px';
            el.style.boxShadow = '0 0 20px rgba(172, 109, 70, 0.8), 0 4px 12px rgba(0,0,0,0.4)';
          }
        }
      });
    }
  }, [removeAllHighlights]);

  const findClosestRouteIndex = (
    coords: { lat: number; lng: number },
    route: number[][],
    searchFrom = 0,
  ): number => {
    let closest = searchFrom;
    let closestDist = Infinity;
    for (let i = searchFrom; i < route.length; i++) {
      const [lng, lat] = route[i];
      const d = (lng - coords.lng) ** 2 + (lat - coords.lat) ** 2;
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    }
    return closest;
  };

  const computeDebriefRouteIndices = useCallback(() => {
    const route = routeCoordsRef.current;
    if (route.length < 2 || debriefRoute.length === 0) {
      debriefRouteIndicesRef.current = [];
      return;
    }
    const indices: number[] = [];
    let searchFrom = 0;
    for (const stop of debriefRoute) {
      const idx = findClosestRouteIndex(stop.coords, route, searchFrom);
      indices.push(idx);
      searchFrom = idx;
    }
    debriefRouteIndicesRef.current = indices;
  }, [debriefRoute]);

  const buildCumulativeHaversineDist = (route: number[][]): number[] => {
    const d = [0];
    for (let i = 1; i < route.length; i++) {
      d.push(d[i - 1] + haversineKm(route[i - 1], route[i]));
    }
    return d;
  };

  const buildCumulativeDistances = (segment: number[][]): number[] => {
    const distances = [0];
    for (let i = 1; i < segment.length; i++) {
      const dx = segment[i][0] - segment[i - 1][0];
      const dy = segment[i][1] - segment[i - 1][1];
      distances.push(distances[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return distances;
  };

  const interpolateAlongRoute = (
    segment: number[][],
    cumDist: number[],
    t: number,
  ): [number, number] => {
    const totalLen = cumDist[cumDist.length - 1];
    if (totalLen === 0) return segment[0] as [number, number];

    const targetDist = t * totalLen;

    let lo = 0;
    let hi = cumDist.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cumDist[mid] <= targetDist) lo = mid;
      else hi = mid;
    }

    const segStart = cumDist[lo];
    const segEnd = cumDist[hi];
    const segLen = segEnd - segStart;
    const frac = segLen > 0 ? (targetDist - segStart) / segLen : 0;

    return [
      segment[lo][0] + frac * (segment[hi][0] - segment[lo][0]),
      segment[lo][1] + frac * (segment[hi][1] - segment[lo][1]),
    ];
  };

  const cancelDebriefAnimation = useCallback(() => {
    if ((mapRef.current as any)?._debriefCleanup) {
      (mapRef.current as any)._debriefCleanup();
      (mapRef.current as any)._debriefCleanup = null;
    }
  }, [mapRef]);

  const flyToDebriefStop = useCallback((index: number) => {
    if (!mapRef.current || index < 0 || index >= debriefRoute.length) return;

    cancelDebriefAnimation();

    const stop = debriefRoute[index];
    setDebriefIndex(index);
    highlightDebriefStop(stop);

    const route = routeCoordsRef.current;
    const fromStop = debriefRoute[prevDebriefIndexRef.current];

    const hasFrom = fromStop && prevDebriefIndexRef.current !== index && route.length >= 2;

    if (!hasFrom) {
      mapRef.current.flyTo({
        center: [stop.coords.lng, stop.coords.lat],
        zoom: 13,
        duration: 1500,
      });
      const targetIdx = debriefRouteIndicesRef.current[index] ?? 0;
      setDebriefDistance(debriefCumulativeDistRef.current[targetIdx] ?? 0);
      prevDebriefIndexRef.current = index;
      return;
    }

    const indices = debriefRouteIndicesRef.current;
    const fromIdx = indices[prevDebriefIndexRef.current] ?? 0;
    const toIdx = indices[index] ?? 0;

    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    let segment = route.slice(lo, hi + 1);
    if (fromIdx > toIdx) {
      segment = [...segment].reverse();
    }

    if (segment.length < 2) {
      mapRef.current.flyTo({
        center: [stop.coords.lng, stop.coords.lat],
        zoom: 13,
        duration: 1500,
      });
      const targetIdx = debriefRouteIndicesRef.current[index] ?? 0;
      setDebriefDistance(debriefCumulativeDistRef.current[targetIdx] ?? 0);
      prevDebriefIndexRef.current = index;
      return;
    }

    const cumHav = debriefCumulativeDistRef.current;
    const isBackward = fromIdx > toIdx;
    const distStart = cumHav[isBackward ? hi : lo] ?? 0;
    const distEnd = cumHav[isBackward ? lo : hi] ?? 0;

    // Compute real-world distance (km) for this segment
    const segDistKm = Math.abs(distEnd - distStart);
    const map = mapRef.current;
    const endZoom = 13;

    // For long distances (>200km), use Mapbox's built-in flyTo arc.
    // The `curve` parameter controls how much it zooms out mid-flight —
    // higher values = more zoom-out = better country context.
    if (segDistKm > 200) {
      setDebriefDistance(distEnd);

      const toCoords = stop.coords;
      const curve = segDistKm > 2000 ? 2.0 : segDistKm > 1000 ? 1.8 : 1.5;
      const duration = segDistKm > 2000 ? 12000 : segDistKm > 1000 ? 9000 : 7000;
      const minZoom = segDistKm > 2000 ? 3 : segDistKm > 1000 ? 4 : 5;

      map.flyTo({
        center: [toCoords.lng, toCoords.lat],
        zoom: endZoom,
        curve,
        minZoom,
        duration,
        essential: true,
      });

      (mapRef.current as any)._debriefCleanup = () => {
        map.stop();
      };

      prevDebriefIndexRef.current = index;
      return;
    }

    // Short-to-medium distances (<200km): step-based animation along route
    const cumDist = buildCumulativeDistances(segment);
    const totalSegLen = cumDist[cumDist.length - 1];
    const startZoom = map.getZoom();

    // Scale zoom-out by distance: gentle dip for short hops, more for medium
    const zoomOutAmount = segDistKm < 20 ? 0.5
      : segDistKm < 50 ? 1.0
      : segDistKm < 100 ? 1.5
      : 2.0;

    const numSteps = Math.min(12, Math.max(4, Math.round(segDistKm / 15)));
    const totalDuration = Math.min(8000, Math.max(3000, segDistKm * 40));
    const stepDuration = totalDuration / numSteps;

    const routeWaypoints: { center: [number, number]; zoom: number; t: number }[] = [];
    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const center = interpolateAlongRoute(segment, cumDist, t);
      const zoomDip = Math.sin(t * Math.PI);
      const linearZoom = startZoom + t * (endZoom - startZoom);
      const zoom = linearZoom - zoomDip * zoomOutAmount;
      routeWaypoints.push({ center, zoom, t });
    }

    let currentStep = 0;
    let cancelled = false;
    let distRaf: number | null = null;

    const tickDistance = (stepIdx: number) => {
      const tFrom = stepIdx > 0 ? routeWaypoints[stepIdx - 1].t : 0;
      const tTo = routeWaypoints[stepIdx].t;
      const startMs = performance.now();

      const tick = () => {
        if (cancelled) return;
        const progress = Math.min(1, (performance.now() - startMs) / stepDuration);
        const t = tFrom + progress * (tTo - tFrom);
        setDebriefDistance(distStart + t * (distEnd - distStart));
        if (progress < 1) distRaf = requestAnimationFrame(tick);
      };
      distRaf = requestAnimationFrame(tick);
    };

    const advanceStep = () => {
      if (cancelled || !mapRef.current) return;
      if (currentStep >= routeWaypoints.length) {
        mapRef.current.easeTo({
          center: [stop.coords.lng, stop.coords.lat],
          zoom: endZoom,
          duration: 400,
        });
        setDebriefDistance(distEnd);
        return;
      }
      const wp = routeWaypoints[currentStep];
      mapRef.current.easeTo({
        center: wp.center,
        zoom: wp.zoom,
        duration: stepDuration,
        easing: (t) => t,
      });
      tickDistance(currentStep);
      currentStep++;
    };

    const onMoveEnd = () => {
      if (!cancelled) advanceStep();
    };

    map.on('moveend', onMoveEnd);
    (mapRef.current as any)._debriefCleanup = () => {
      cancelled = true;
      if (distRaf) cancelAnimationFrame(distRaf);
      map.off('moveend', onMoveEnd);
      map.stop();
    };

    advanceStep();
    prevDebriefIndexRef.current = index;
  }, [debriefRoute, highlightDebriefStop, cancelDebriefAnimation, mapRef]);

  const enterDebriefMode = useCallback((setClickedEntry: (val: null) => void) => {
    setIsDebriefMode(true);
    setClickedEntry(null);
    prevDebriefIndexRef.current = 0;
    computeDebriefRouteIndices();
    debriefCumulativeDistRef.current = buildCumulativeHaversineDist(routeCoordsRef.current);
    setDebriefDistance(0);
    setTimeout(() => {
      mapRef.current?.resize();
      setTimeout(() => {
        flyToDebriefStop(0);
      }, 100);
    }, 150);
  }, [flyToDebriefStop, computeDebriefRouteIndices, mapRef]);

  const exitDebriefMode = useCallback(() => {
    cancelDebriefAnimation();
    setIsDebriefMode(false);
    setDebriefIndex(0);
    debriefCumulativeDistRef.current = [];
    setDebriefDistance(0);
    removeAllHighlights();
    setTimeout(() => {
      mapRef.current?.resize();
      setTimeout(() => {
        handleFitBounds();
      }, 100);
    }, 150);
  }, [removeAllHighlights, handleFitBounds, cancelDebriefAnimation, mapRef]);

  // Keyboard navigation
  useEffect(() => {
    if (!isDebriefMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitDebriefMode();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setDebriefIndex(prev => {
          const next = Math.min(prev + 1, debriefRoute.length - 1);
          if (next !== prev) {
            setTimeout(() => flyToDebriefStop(next), 0);
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setDebriefIndex(prev => {
          const next = Math.max(prev - 1, 0);
          if (next !== prev) {
            setTimeout(() => flyToDebriefStop(next), 0);
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebriefMode, debriefRoute.length, exitDebriefMode, flyToDebriefStop]);

  // Resize map when debrief mode changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.resize();
      }, 200);
    }
  }, [isDebriefMode, mapRef]);

  return {
    isDebriefMode,
    debriefIndex,
    debriefDistance,
    debriefRoute,
    canDebrief,
    entryTimelinePositions,
    routeCoordsRef,
    markersRef,
    waypointMarkersRef,
    clusteredRef,
    enterDebriefMode,
    exitDebriefMode,
    flyToDebriefStop,
    cancelDebriefAnimation,
  };
}
