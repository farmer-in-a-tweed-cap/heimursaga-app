import mapboxgl from 'mapbox-gl';

// --- Types ---

export interface ClusterableEntry {
  id: string;
  title: string;
  date: string;
  coords: { lat: number; lng: number };
  timelinePosition?: number;
}

export interface EntryCluster<T> {
  id: string;
  center: { lat: number; lng: number };
  entries: T[];
}

export type PopupPosition = 'bottom-left' | 'bottom-right';

export interface MarkerElements {
  container: HTMLElement;
  pin: HTMLElement;
  applyHighlight: () => void;
  removeHighlight: () => void;
}

// --- Haversine distance (meters) ---

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// --- Zoom-adaptive threshold ---

export function thresholdForZoom(zoom: number): number {
  if (zoom >= 16) return 0;
  if (zoom >= 14) return 100;
  if (zoom >= 12) return 500;
  if (zoom >= 10) return 2_000;
  if (zoom >= 8) return 10_000;
  if (zoom >= 6) return 50_000;
  if (zoom >= 4) return 200_000;
  return 500_000;
}

// --- Clustering ---

export function clusterEntriesByProximity<T extends ClusterableEntry>(
  entries: T[],
  thresholdMeters = 50,
): EntryCluster<T>[] {
  if (thresholdMeters === 0) {
    return entries.map((entry) => ({
      id: entry.id,
      center: entry.coords,
      entries: [entry],
    }));
  }

  const assigned = new Set<number>();
  const clusters: EntryCluster<T>[] = [];

  for (let i = 0; i < entries.length; i++) {
    if (assigned.has(i)) continue;
    assigned.add(i);
    const group: T[] = [entries[i]];

    for (let j = i + 1; j < entries.length; j++) {
      if (assigned.has(j)) continue;
      if (haversineMeters(entries[i].coords, entries[j].coords) <= thresholdMeters) {
        assigned.add(j);
        group.push(entries[j]);
      }
    }

    // Sort by date descending (newest first)
    group.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const center = {
      lat: group.reduce((sum, e) => sum + e.coords.lat, 0) / group.length,
      lng: group.reduce((sum, e) => sum + e.coords.lng, 0) / group.length,
    };

    const id = group
      .map((e) => e.id)
      .sort()
      .join('-');

    clusters.push({ id, center, entries: group });
  }

  return clusters;
}

// --- Popup position ---

export function computePopupPosition(
  markerEl: HTMLElement,
  mapContainer: HTMLElement,
): PopupPosition {
  const mapRect = mapContainer.getBoundingClientRect();
  const markerRect = markerEl.getBoundingClientRect();
  const markerCenterX = markerRect.left + markerRect.width / 2 - mapRect.left;
  return markerCenterX > mapRect.width / 2 ? 'bottom-left' : 'bottom-right';
}

// --- Marker factories ---

export function createSingleEntryMarker(
  color = '#ac6d46',
  position?: number,
): MarkerElements {
  const container = document.createElement('div');
  container.className = 'entry-marker';
  container.style.cursor = 'pointer';
  container.style.borderRadius = '50%';
  container.style.backgroundColor = color;
  container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
  container.style.transition = 'box-shadow 0.2s ease, border 0.2s ease';

  if (position != null) {
    container.style.width = '22px';
    container.style.height = '22px';
    container.style.border = '2px solid white';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.color = 'white';
    container.style.fontWeight = 'bold';
    container.style.fontSize = '10px';
    container.style.lineHeight = '1';
    container.textContent = String(position);
  } else {
    container.style.width = '20px';
    container.style.height = '20px';
    container.style.border = '2px solid white';
  }

  const applyHighlight = () => {
    container.style.boxShadow =
      `0 0 0 6px ${color}80, 0 0 0 12px ${color}4d, 0 0 20px ${color}cc, 0 4px 12px rgba(0,0,0,0.5)`;
    container.style.border = '3px solid white';
    container.style.zIndex = '1000';
  };
  const removeHighlight = () => {
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    container.style.border = '2px solid white';
    container.style.zIndex = 'auto';
  };
  (container as any).removeHighlight = removeHighlight;

  return { container, pin: container, applyHighlight, removeHighlight };
}

export function createClusterMarker(
  count: number,
  color = '#8a5738',
  rangeLabel?: string,
): MarkerElements {
  const label = rangeLabel || String(count);
  const container = document.createElement('div');
  container.className = 'entry-marker cluster-marker';
  container.style.cursor = 'pointer';
  container.style.width = '30px';
  container.style.height = '30px';
  container.style.borderRadius = '50%';
  container.style.backgroundColor = color;
  container.style.border = '3px solid white';
  container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'center';
  container.style.color = 'white';
  container.style.fontWeight = 'bold';
  container.style.fontSize = rangeLabel ? '10px' : '12px';
  container.style.lineHeight = '1';
  container.style.transition = 'box-shadow 0.2s ease, border 0.2s ease';
  container.textContent = label;

  const applyHighlight = () => {
    container.style.boxShadow =
      `0 0 0 6px ${color}80, 0 0 0 12px ${color}4d, 0 0 20px ${color}cc, 0 4px 12px rgba(0,0,0,0.5)`;
    container.style.border = '4px solid white';
    container.style.zIndex = '1000';
  };
  const removeHighlight = () => {
    container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    container.style.border = '3px solid white';
    container.style.zIndex = 'auto';
  };
  (container as any).removeHighlight = removeHighlight;

  return { container, pin: container, applyHighlight, removeHighlight };
}

// --- Darken a hex color ---

export function darkenColor(hex: string, amount = 0.15): string {
  const c = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// --- Higher-level clustered marker renderer ---

export interface RenderClusteredMarkersOptions<T extends ClusterableEntry> {
  entries: T[];
  map: mapboxgl.Map;
  mapContainerRef: { current: HTMLDivElement | null };
  color?: string;
  onSingleEntryClick: (entry: T, position: PopupPosition) => void;
  onClusterClick: (cluster: EntryCluster<T>, position: PopupPosition) => void;
  onMarkerClicked?: () => void;
  highlightEntryId?: string;
}

export interface ClusteredMarkersResult {
  markers: mapboxgl.Marker[];
  cleanup: () => void;
  recalculate: () => void;
  removeAllHighlights: () => void;
}

export function renderClusteredMarkers<T extends ClusterableEntry>(
  options: RenderClusteredMarkersOptions<T>,
): ClusteredMarkersResult {
  // Mutable arrays — recalculate mutates these in-place so external refs stay valid
  const markers: mapboxgl.Marker[] = [];
  const listeners: Array<{ element: HTMLElement; handler: (e: MouseEvent) => void }> = [];

  function removeAllHighlights() {
    markers.forEach((m) => {
      const el = m.getElement();
      if (el && (el as any).removeHighlight) (el as any).removeHighlight();
    });
  }

  function teardown() {
    listeners.forEach(({ element, handler }) => element.removeEventListener('click', handler));
    listeners.length = 0;
    markers.forEach((m) => m.remove());
    markers.length = 0;
  }

  function build(thresholdMeters: number) {
    teardown();

    const validEntries = options.entries.filter(
      (e) => e.coords.lat !== 0 || e.coords.lng !== 0,
    );

    const clusters = clusterEntriesByProximity(validEntries, thresholdMeters);

    clusters.forEach((cluster) => {
      if (cluster.entries.length === 1) {
        const entry = cluster.entries[0];
        const { container, pin, applyHighlight } = createSingleEntryMarker(
          options.color,
          entry.timelinePosition,
        );

        if (options.highlightEntryId === entry.id) {
          pin.style.animation = 'wp-pulse 2s ease-out infinite';
        }

        const marker = new mapboxgl.Marker(container)
          .setLngLat([entry.coords.lng, entry.coords.lat])
          .addTo(options.map);

        const handler = (e: MouseEvent) => {
          e.stopPropagation();
          options.onMarkerClicked?.();
          removeAllHighlights();
          const position = options.mapContainerRef.current
            ? computePopupPosition(container, options.mapContainerRef.current)
            : ('bottom-right' as PopupPosition);
          applyHighlight();
          options.onSingleEntryClick(entry, position);
        };

        container.addEventListener('click', handler);
        listeners.push({ element: container, handler });
        markers.push(marker);
      } else {
        const clusterColor = options.color ? darkenColor(options.color) : '#8a5738';
        // Compute range label from timeline positions (e.g., "4–6")
        const positions = cluster.entries
          .map(e => e.timelinePosition)
          .filter((p): p is number => p != null)
          .sort((a, b) => a - b);
        const rangeLabel = positions.length >= 2
          ? `${positions[0]}\u2013${positions[positions.length - 1]}`
          : positions.length === 1 ? String(positions[0]) : undefined;
        const { container, applyHighlight } = createClusterMarker(
          cluster.entries.length,
          clusterColor,
          rangeLabel,
        );

        const marker = new mapboxgl.Marker(container)
          .setLngLat([cluster.center.lng, cluster.center.lat])
          .addTo(options.map);

        const handler = (e: MouseEvent) => {
          e.stopPropagation();
          options.onMarkerClicked?.();
          removeAllHighlights();
          const position = options.mapContainerRef.current
            ? computePopupPosition(container, options.mapContainerRef.current)
            : ('bottom-right' as PopupPosition);
          applyHighlight();
          options.onClusterClick(cluster, position);
        };

        container.addEventListener('click', handler);
        listeners.push({ element: container, handler });
        markers.push(marker);
      }
    });
  }

  build(thresholdForZoom(options.map.getZoom()));

  return {
    markers,
    cleanup: teardown,
    recalculate: () => {
      build(thresholdForZoom(options.map.getZoom()));
    },
    removeAllHighlights,
  };
}
