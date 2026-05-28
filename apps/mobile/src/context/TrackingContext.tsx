import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Location from 'expo-location';

import {
  trackApi,
  expeditionApi,
  type TrackPointInput,
} from '@/services/api';

// Server-side rejects points with accuracy worse than this. Filter client-
// side too so we don't waste a network call on garbage.
const MAX_ACCURACY_M = 200;
// Batch upload cadence. Step 4 will add an SQLite buffer behind this for
// offline durability; for now the buffer lives in-memory.
const FLUSH_INTERVAL_MS = 60_000;
// Heartbeat keep-alive. Independent of position pings so the freshness
// badge stays accurate while the explorer is stationary.
const HEARTBEAT_INTERVAL_MS = 15 * 60_000;
// Defensive cap on the in-memory retry buffer. With healthy network this
// stays empty; with a long offline period at 1 point/min, 5000 ≈ 83 hours
// of pings. Beyond this, oldest points are dropped to keep memory bounded
// and avoid Hermes call-stack overflow from `unshift(...veryLargeArray)`.
// Step 4's SQLite buffer will replace this entirely.
const MAX_BUFFER_SIZE = 5000;

/**
 * Foreground tracking watcher options for the two cadence modes. Step 3 is
 * foreground-only (`watchPositionAsync`). Step 5 will add a parallel
 * configuration for `startLocationUpdatesAsync` (background task).
 */
const ACTIVE_WATCH_OPTS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60_000,
  distanceInterval: 50,
};
const CONSERVATIVE_WATCH_OPTS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5 * 60_000,
  distanceInterval: 500,
};

function makeClientUuid(): string {
  // Prefer Hermes' global crypto.randomUUID (available in RN 0.71+ /
  // Hermes 0.11.1+) for full 122-bit UUID4 randomness. Fall back to the
  // timestamp + base36 form if not exposed.
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Live tracking client-side state machine.
 *
 * status transitions:
 *   idle → starting → active → paused → active → stopping → idle
 *
 * The actual tracking task (expo-task-manager + expo-location background
 * updates) is wired in step 3 of the Phase 1b plan. This context owns the
 * client-side state, permission flow, and stubs the network calls so the
 * UI (step 2) can be built and tested in isolation.
 */
export type TrackingStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'paused'
  | 'stopping';

export type TrackingMode = 'active' | 'conservative';

export type LocationPermissionLevel = 'undetermined' | 'denied' | 'when-in-use' | 'always';

export interface TrackingPosition {
  lat: number;
  lon: number;
  recordedAt: Date;
  accuracyM?: number;
}

interface TrackingState {
  status: TrackingStatus;
  expeditionId: string | null;
  expeditionTitle: string | null;
  trackId: number | null;
  mode: TrackingMode;
  startedAt: Date | null;
  latestPosition: TrackingPosition | null;
  permissionLevel: LocationPermissionLevel;
  error: string | null;
}

interface TrackingActions {
  /**
   * Begin a tracking session on the given expedition. The mode controls
   * the cadence picked by the underlying task (step 3 wiring); for now
   * it's just persisted on context state.
   */
  startTracking(args: {
    expeditionId: string;
    expeditionTitle: string;
    mode: TrackingMode;
  }): Promise<void>;

  /** Finalize the active track. Pin remains frozen at the last point. */
  stopTracking(): Promise<void>;

  /** Pause sends no pings but doesn't finalize. Resume via resumeTracking. */
  pauseTracking(): Promise<void>;
  resumeTracking(): Promise<void>;

  /**
   * Quick-drop a waypoint at the latest known position. Returns true if
   * the waypoint was created. Step 2 stub — UI surface; the real
   * implementation in step 4.5 will POST /trips/:id/waypoints.
   */
  dropWaypointAtCurrentPosition(title?: string): Promise<boolean>;

  /**
   * Request the When-in-Use permission. Returns the resolved level.
   * Used for the first tier of the two-tier permission flow.
   */
  requestWhenInUsePermission(): Promise<LocationPermissionLevel>;

  /**
   * Upgrade to Always (background) permission. Must be called AFTER the
   * user has seen the in-app explainer screen. Returns the resolved level.
   */
  requestAlwaysPermission(): Promise<LocationPermissionLevel>;

  /** Re-read the OS permission state. */
  refreshPermissionLevel(): Promise<LocationPermissionLevel>;
}

type TrackingContextValue = TrackingState & TrackingActions;

const TrackingContext = createContext<TrackingContextValue | null>(null);

function mapPermissionToLevel(
  fg: Location.LocationPermissionResponse | null,
  bg: Location.LocationPermissionResponse | null,
): LocationPermissionLevel {
  if (bg?.status === 'granted') return 'always';
  if (fg?.status === 'granted') return 'when-in-use';
  if (fg?.status === 'denied' || bg?.status === 'denied') return 'denied';
  return 'undetermined';
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<TrackingStatus>('idle');
  // Synchronous guard against concurrent startTracking() calls. React
  // state setters are async — `status` doesn't flip from 'idle' until
  // the next render, so a double-tap could fire two starts in the same
  // microtask and create a zombie server track.
  const isStartingRef = useRef(false);
  const [expeditionId, setExpeditionId] = useState<string | null>(null);
  const [expeditionTitle, setExpeditionTitle] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<number | null>(null);
  const [mode, setMode] = useState<TrackingMode>('active');
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [latestPosition, setLatestPosition] = useState<TrackingPosition | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<LocationPermissionLevel>('undetermined');
  const [error, setError] = useState<string | null>(null);

  const refreshPermissionLevel = useCallback(async (): Promise<LocationPermissionLevel> => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      const level = mapPermissionToLevel(fg, bg);
      setPermissionLevel(level);
      return level;
    } catch (e) {
      // Fall through to undetermined if the OS layer errors.
      setPermissionLevel('undetermined');
      return 'undetermined';
    }
  }, []);

  // Read the OS permission state on mount so the UI can branch immediately.
  useEffect(() => {
    void refreshPermissionLevel();
  }, [refreshPermissionLevel]);

  // Foreground tracking pipeline. Subscribes to `Location.watchPositionAsync`
  // whenever status is 'active' and a track exists. Each callback appends
  // to an in-memory buffer + sets latestPosition; a 60s interval flushes
  // the buffer to the server; a 15-min interval sends a heartbeat.
  //
  // Background tracking + persistent buffer come in steps 4 and 5.
  useEffect(() => {
    if (status !== 'active' || !expeditionId || !trackId) return;
    // Narrow the closure to non-null locals so we don't carry `null | T`
    // through every helper. The guard above ensures both are real here.
    const eid = expeditionId;
    const tid = trackId;

    const opts = mode === 'conservative' ? CONSERVATIVE_WATCH_OPTS : ACTIVE_WATCH_OPTS;
    let sub: Location.LocationSubscription | null = null;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    const buffer: TrackPointInput[] = [];
    let cancelled = false;

    const handleTrackEnded = () => {
      // Server auto-stopped the track (expedition status changed mid-
      // session, or upstream auto-stop fired). Align client state by
      // resetting to idle — this also triggers cleanup of this effect
      // via the status-dep change. Without this, the watcher would keep
      // collecting points and every flush would 404 until the user
      // notices and taps Stop manually.
      // eslint-disable-next-line no-console
      console.info('[TrackingContext] server auto-stopped track on append');
      setTrackId(null);
      setExpeditionId(null);
      setExpeditionTitle(null);
      setStartedAt(null);
      setLatestPosition(null);
      setStatus('idle');
    };

    const flushBuffer = async () => {
      if (cancelled || buffer.length === 0) return;
      const batch = buffer.splice(0, buffer.length);
      try {
        const res = await trackApi.appendPoints(eid, tid, batch);
        if (res.trackEnded) {
          handleTrackEnded();
          return;
        }
        if (res.rejected > 0) {
          // Server-side filter (accuracy or recorded_at window) dropped
          // points the client thought were valid. Most commonly a clock-
          // skewed device — surface for diagnostics.
          // eslint-disable-next-line no-console
          console.warn(
            `[TrackingContext] server rejected ${res.rejected}/${batch.length} points (clock skew or accuracy filter)`,
          );
        }
      } catch (e) {
        // Network failure or transient server error — keep points so the
        // next cycle retries. client_uuid deduplicates on the server, so
        // re-uploading the same batch is safe.
        //
        // Re-check `cancelled` because await may have yielded long enough
        // for the cleanup to run. If we're orphaned, the unshift goes to
        // a dead buffer — surface that explicitly rather than silently
        // dropping the points.
        if (cancelled) {
          // eslint-disable-next-line no-console
          console.warn(
            `[TrackingContext] appendPoints failed after teardown — ${batch.length} points lost (will be reclaimed by SQLite buffer in step 4)`,
          );
        } else {
          // Defensive bound: cap the buffer so a long offline period plus
          // a worst-case retry storm can't blow the call stack.
          buffer.unshift(...batch);
          if (buffer.length > MAX_BUFFER_SIZE) {
            const dropped = buffer.length - MAX_BUFFER_SIZE;
            buffer.length = MAX_BUFFER_SIZE;
            // eslint-disable-next-line no-console
            console.warn(
              `[TrackingContext] buffer at cap — dropped ${dropped} oldest unsent points`,
            );
          }
          // eslint-disable-next-line no-console
          console.warn('[TrackingContext] appendPoints failed, will retry:', e);
        }
      }
    };

    const sendHeartbeat = async () => {
      if (cancelled) return;
      try {
        await trackApi.heartbeat(eid, tid);
      } catch (e) {
        // Best-effort — a missed heartbeat just makes the freshness badge
        // show a slightly older "Live as of" until the next position ping.
        // eslint-disable-next-line no-console
        console.warn('[TrackingContext] heartbeat failed:', e);
      }
    };

    const startWatcher = async () => {
      try {
        sub = await Location.watchPositionAsync(opts, (loc) => {
          if (cancelled) return;
          const accuracy = loc.coords.accuracy ?? undefined;
          if (accuracy != null && accuracy > MAX_ACCURACY_M) return;

          // Hoist the Date construction — used in both the ISO string for
          // the upload payload and the latestPosition state.
          const recordedAt = new Date(loc.timestamp);
          // CLLocation returns -1 when speed is unknown; expo-location
          // passes that through unchanged.
          const speed =
            loc.coords.speed != null && loc.coords.speed >= 0
              ? loc.coords.speed
              : undefined;

          const point: TrackPointInput = {
            recordedAt: recordedAt.toISOString(),
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            accuracyM: accuracy,
            speedMps: speed,
            altitudeM: loc.coords.altitude ?? undefined,
            clientUuid: makeClientUuid(),
          };
          buffer.push(point);
          setLatestPosition({
            lat: point.lat,
            lon: point.lon,
            recordedAt,
            accuracyM: accuracy,
          });
        });

        flushTimer = setInterval(() => {
          void flushBuffer();
        }, FLUSH_INTERVAL_MS);
        heartbeatTimer = setInterval(() => {
          void sendHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);

        // Fire one heartbeat immediately so the badge flips to "Live" the
        // moment tracking starts, not 15 minutes later.
        void sendHeartbeat();
      } catch (e) {
        // expo-location threw at subscribe time. Most likely permission
        // revoked at the OS level mid-session. Surface to the user via
        // status + error rather than leaving the banner saying "LIVE"
        // with no points coming in.
        const msg = e instanceof Error ? e.message : 'Location watch failed';
        setError(msg);
        setStatus('paused');
      }
    };

    void startWatcher();

    return () => {
      cancelled = true;
      sub?.remove();
      if (flushTimer) clearInterval(flushTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      // Best-effort flush of any unsent points on teardown. Buffer is
      // captured in this closure; the parent effect is gone but the
      // promise still resolves.
      // TODO(step-4): if this final flush fails, points are lost. SQLite
      // will make the buffer durable across pause/stop boundaries.
      if (buffer.length > 0) {
        void trackApi.appendPoints(eid, tid, buffer).catch(() => {
          // Swallow — there's no client UI left to surface the error to.
        });
      }
    };
  }, [status, expeditionId, trackId, mode]);

  const requestWhenInUsePermission = useCallback(async (): Promise<LocationPermissionLevel> => {
    const fg = await Location.requestForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    const level = mapPermissionToLevel(fg, bg);
    setPermissionLevel(level);
    return level;
  }, []);

  const requestAlwaysPermission = useCallback(async (): Promise<LocationPermissionLevel> => {
    // Apple's progressive-permission pattern requires When-in-Use first.
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      const fgReq = await Location.requestForegroundPermissionsAsync();
      if (fgReq.status !== 'granted') {
        const level = mapPermissionToLevel(fgReq, null);
        setPermissionLevel(level);
        return level;
      }
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    const fgFinal = await Location.getForegroundPermissionsAsync();
    const level = mapPermissionToLevel(fgFinal, bg);
    setPermissionLevel(level);
    return level;
  }, []);

  const startTracking = useCallback<TrackingActions['startTracking']>(
    async ({ expeditionId: id, expeditionTitle: title, mode: pickedMode }) => {
      if (status !== 'idle' || isStartingRef.current) {
        throw new Error('Another tracking session is already active.');
      }
      isStartingRef.current = true;
      setError(null);
      setStatus('starting');
      try {
        const { trackId: newTrackId, startedAt: ts } = await trackApi.start(id);
        setTrackId(newTrackId);
        setExpeditionId(id);
        setExpeditionTitle(title);
        setMode(pickedMode);
        setStartedAt(new Date(ts));
        setStatus('active');
        // The actual background-task start + GPS subscription lands in
        // step 3 of the Phase 1b plan. State is captured here so the
        // banner UI renders correctly in the meantime.
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to start tracking';
        setError(msg);
        setStatus('idle');
        throw e;
      } finally {
        isStartingRef.current = false;
      }
    },
    [status],
  );

  const stopTracking = useCallback<TrackingActions['stopTracking']>(async () => {
    if (status === 'idle' || !expeditionId || !trackId) return;
    setStatus('stopping');
    let stopError: unknown = null;
    try {
      await trackApi.stop(expeditionId, trackId);
    } catch (e) {
      // Don't block the client-side release — the banner needs to dismiss
      // so the user feels the action. We surface the failure via the
      // error state so the next startTracking attempt can offer better
      // diagnostics (the server's single-active-track guard would
      // otherwise 409 with a generic "already active" message).
      stopError = e;
      // eslint-disable-next-line no-console
      console.warn('[TrackingContext] trackApi.stop failed:', e);
    } finally {
      setTrackId(null);
      setExpeditionId(null);
      setExpeditionTitle(null);
      setStartedAt(null);
      setLatestPosition(null);
      setError(
        stopError instanceof Error
          ? `Could not finalize tracking on the server — it will auto-stop when the expedition completes. (${stopError.message})`
          : null,
      );
      setStatus('idle');
    }
  }, [status, expeditionId, trackId]);

  const pauseTracking = useCallback<TrackingActions['pauseTracking']>(async () => {
    if (status !== 'active') return;
    // Step 3: also stop the foreground/background location task.
    setStatus('paused');
  }, [status]);

  const resumeTracking = useCallback<TrackingActions['resumeTracking']>(async () => {
    if (status !== 'paused') return;
    // Step 3: also re-subscribe the foreground/background location task.
    setStatus('active');
  }, [status]);

  const dropWaypointAtCurrentPosition = useCallback<
    TrackingActions['dropWaypointAtCurrentPosition']
  >(
    async (title) => {
      if (!expeditionId || !latestPosition) {
        // No active expedition or no GPS yet — refuse silently. The UI
        // gates the button on `latestPosition`, so this is a safety net.
        return false;
      }
      try {
        await expeditionApi.createWaypoint(expeditionId, {
          title: title?.trim() || 'Quick waypoint',
          lat: latestPosition.lat,
          lon: latestPosition.lon,
          date: new Date(latestPosition.recordedAt).toISOString(),
        });
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to drop waypoint';
        setError(msg);
        return false;
      }
    },
    [expeditionId, latestPosition],
  );

  const value = useMemo<TrackingContextValue>(
    () => ({
      status,
      expeditionId,
      expeditionTitle,
      trackId,
      mode,
      startedAt,
      latestPosition,
      permissionLevel,
      error,
      startTracking,
      stopTracking,
      pauseTracking,
      resumeTracking,
      dropWaypointAtCurrentPosition,
      requestWhenInUsePermission,
      requestAlwaysPermission,
      refreshPermissionLevel,
    }),
    [
      status,
      expeditionId,
      expeditionTitle,
      trackId,
      mode,
      startedAt,
      latestPosition,
      permissionLevel,
      error,
      startTracking,
      stopTracking,
      pauseTracking,
      resumeTracking,
      dropWaypointAtCurrentPosition,
      requestWhenInUsePermission,
      requestAlwaysPermission,
      refreshPermissionLevel,
    ],
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) {
    throw new Error('useTracking must be used inside a <TrackingProvider>');
  }
  return ctx;
}
