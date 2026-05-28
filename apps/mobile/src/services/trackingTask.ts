import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { bufferInsert, getTrackingSession } from './trackingBuffer';

/**
 * Background tracking task. iOS keeps this registered with the system
 * task scheduler across app launches — even after the user kills the
 * app, the OS can wake us in headless mode to deliver location updates
 * when the user moves.
 *
 * The task is defined at module load time via `TaskManager.defineTask`.
 * For that to happen before iOS tries to dispatch any pending events,
 * THIS MODULE MUST BE IMPORTED FROM `app/_layout.tsx` (side-effect
 * import). Defining the task lazily on first tracking-start is too late
 * if the user reopens the app after a kill — iOS will look for the task
 * by name immediately on relaunch.
 */
export const TRACKING_TASK_NAME = 'heimursaga-tracking-task';

// Mirrors the server-side filter. Re-exported so the foreground UI
// listener in TrackingContext can apply the same cutoff defensively
// without drift if the server-side threshold ever changes.
export const MAX_ACCURACY_M = 200;

type TaskBody = {
  locations?: Location.LocationObject[];
};

function makeClientUuid(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Foreground UI listeners. When the app is in the foreground, the task
// callback runs in the same JS context as React, so we can fan out
// location events to React state via this list. When the app is killed,
// the callback runs in a fresh JS context and this list is empty —
// points still hit the SQLite buffer via bufferInsert, just without UI.
type LocationListener = (loc: Location.LocationObject) => void;
const locationListeners = new Set<LocationListener>();

export function addLocationListener(fn: LocationListener): () => void {
  locationListeners.add(fn);
  return () => {
    locationListeners.delete(fn);
  };
}

TaskManager.defineTask(TRACKING_TASK_NAME, async ({ data, error }) => {
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[trackingTask] error:', error);
    return;
  }
  const locations = (data as TaskBody | undefined)?.locations ?? [];
  if (locations.length === 0) return;

  // Read which expedition + track these points belong to. If the session
  // row is gone, tracking has been stopped — silently drop any in-flight
  // batch the OS hadn't yet flushed.
  const session = await getTrackingSession().catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[trackingTask] getTrackingSession failed:', e);
    return null;
  });
  if (!session) return;

  for (const loc of locations) {
    const accuracy = loc.coords.accuracy ?? undefined;
    if (accuracy != null && accuracy > MAX_ACCURACY_M) continue;

    const recordedAt = new Date(loc.timestamp).toISOString();
    const speed =
      loc.coords.speed != null && loc.coords.speed >= 0
        ? loc.coords.speed
        : undefined;

    try {
      await bufferInsert({
        expeditionId: session.expeditionId,
        trackId: session.trackId,
        recordedAt,
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        accuracyM: accuracy,
        speedMps: speed,
        altitudeM: loc.coords.altitude ?? undefined,
        clientUuid: makeClientUuid(),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[trackingTask] bufferInsert failed:', e);
    }

    // Notify foreground UI if any listeners exist. Errors per listener
    // are isolated so one bad consumer can't poison the others.
    for (const fn of locationListeners) {
      try {
        fn(loc);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[trackingTask] listener threw:', e);
      }
    }
  }
});

/**
 * True when the OS-level task is currently running. expo-location returns
 * false when there's no active updates request, even if the task itself
 * was previously registered.
 */
export async function isTrackingTaskActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
  } catch {
    return false;
  }
}
