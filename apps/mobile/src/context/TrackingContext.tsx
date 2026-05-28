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
import {
  bufferDelete,
  bufferInsert,
  bufferListPendingTracks,
  bufferPruneStale,
  bufferReadBatch,
} from '@/services/trackingBuffer';

// Server-side rejects points with accuracy worse than this. Filter client-
// side too so we don't waste a network call on garbage.
const MAX_ACCURACY_M = 200;
// Batch upload cadence.
const FLUSH_INTERVAL_MS = 60_000;
// Heartbeat keep-alive. Independent of position pings so the freshness
// badge stays accurate while the explorer is stationary.
const HEARTBEAT_INTERVAL_MS = 15 * 60_000;
// Per-flush batch size. The server's @ArrayMaxSize on the DTO is 200 —
// stay under that ceiling with margin.
const FLUSH_BATCH_SIZE = 100;

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
  // whenever status is 'active' and a track exists. Each callback persists
  // to the SQLite buffer + sets latestPosition; a 60s interval drains the
  // buffer to the server; a 15-min interval sends a heartbeat.
  //
  // The SQLite buffer (step 4) replaces the in-memory array from step 3
  // so points survive app restart / crash / kill-and-relaunch. Background
  // tracking comes in step 5.
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
    let flushInFlight = false;
    let cancelled = false;

    const handleTrackEnded = () => {
      // Server auto-stopped the track (expedition status changed mid-
      // session). Align client state by resetting to idle — also triggers
      // cleanup of this effect via the status-dep change.
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
      // Re-entrancy guard — a slow network on one flush can otherwise
      // overlap with the next 60s tick. SQLite handles concurrent writes
      // fine but we only need one upload in flight.
      if (cancelled || flushInFlight) return;
      flushInFlight = true;
      try {
        const batch = await bufferReadBatch(tid, FLUSH_BATCH_SIZE);
        // Early return — finally still runs and resets flushInFlight.
        if (batch.length === 0) return;
        try {
          const res = await trackApi.appendPoints(eid, tid, batch);
          // Delete on any non-throw outcome — the server accepted (or
          // explicitly rejected) the batch, so the rows have completed
          // their journey. Keeping them around would force the same
          // batch to retry on every subsequent flush. Same behavior as
          // the cross-restart drain below — keep the two paths
          // consistent so step 5 (background task) can share logic.
          const allUuids = batch.map((p) => p.clientUuid);
          const uuids = allUuids.filter(
            (u): u is string => typeof u === 'string',
          );
          if (uuids.length < allUuids.length) {
            // eslint-disable-next-line no-console
            console.warn(
              `[TrackingContext] ${allUuids.length - uuids.length} buffered points had no clientUuid — leaving in table for 25h prune`,
            );
          }
          await bufferDelete(uuids);
          if (res.rejected > 0) {
            // Server-side filter (accuracy / recorded_at window) dropped
            // some points. Most commonly a clock-skewed device. Surface
            // for diagnostics. Rejected points are deleted with the
            // accepted ones above — they won't be re-accepted on retry.
            // eslint-disable-next-line no-console
            console.warn(
              `[TrackingContext] server rejected ${res.rejected}/${batch.length} points (clock skew or accuracy filter)`,
            );
          }
          if (res.trackEnded) {
            handleTrackEnded();
            return;
          }
        } catch (e) {
          // Network or transient server error — leave the rows. Next
          // flush will pick them up again. With the SQLite buffer the
          // points survive app restart, so even if the user closes the
          // app mid-failure they'll re-attempt on the next launch via
          // the drain below.
          // eslint-disable-next-line no-console
          console.warn('[TrackingContext] appendPoints failed, will retry:', e);
        }
      } finally {
        // Reached via successful flush, batch.length===0 early return,
        // or appendPoints throw — flushInFlight must always reset.
        flushInFlight = false;
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

          // Persist to SQLite asynchronously. We don't await — the
          // watcher callback is synchronous-by-convention and a slow
          // SQLite write shouldn't drop the next callback. Errors are
          // logged but don't surface to the user (the next flush pulls
          // whatever did persist).
          void bufferInsert({
            expeditionId: eid,
            trackId: tid,
            recordedAt: recordedAt.toISOString(),
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            accuracyM: accuracy,
            speedMps: speed,
            altitudeM: loc.coords.altitude ?? undefined,
            clientUuid: makeClientUuid(),
          }).catch((e) => {
            // eslint-disable-next-line no-console
            console.warn('[TrackingContext] bufferInsert failed:', e);
          });
          setLatestPosition({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
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
        // And do an opportunistic flush in case the SQLite buffer holds
        // leftover points from a previous session on the same track
        // (e.g., crash-then-resume in the same app launch).
        void flushBuffer();
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
      // No explicit final flush — `cancelled = true` would short-circuit
      // it anyway, and any unflushed points are durable in SQLite. They
      // get picked up by the cross-restart drain on next mount, or by
      // the next flush cycle if the same track resumes.
    };
  }, [status, expeditionId, trackId, mode]);

  // On Provider mount, drain any pending points left over from a previous
  // session (crashed mid-tracking, app killed before flush, network was
  // down during stop). For each pending track, loops batches until empty
  // or a transport error. Orphaned tracks the user no longer owns will
  // fail and rows are left for the next launch or the 25h prune.
  const drainRanRef = useRef(false);
  useEffect(() => {
    // Provider remounts (Fast Refresh in dev, or unexpected unmount)
    // shouldn't re-fire the drain — client_uuid dedup on the server
    // makes it safe, but the duplicate round-trip is wasted bandwidth.
    if (drainRanRef.current) return;
    drainRanRef.current = true;

    let cancelled = false;
    // Safety bound on loop iterations per track. At 100 points per batch
    // this drains up to 100k rows per track per launch — more than the
    // 25h prune threshold can ever accumulate at conservative cadence
    // (~12 points/h × 25h = 300 points).
    const MAX_BATCHES_PER_TRACK = 1000;

    void (async () => {
      try {
        const pruned = await bufferPruneStale();
        if (pruned > 0) {
          // eslint-disable-next-line no-console
          console.info(`[TrackingContext] pruned ${pruned} stale buffered points`);
        }
        const groups = await bufferListPendingTracks();
        for (const g of groups) {
          if (cancelled) return;
          let batches = 0;
          let stopGroup = false;
          while (!cancelled && !stopGroup && batches < MAX_BATCHES_PER_TRACK) {
            batches++;
            try {
              const batch = await bufferReadBatch(g.trackId, FLUSH_BATCH_SIZE);
              if (batch.length === 0) break;
              const res = await trackApi.appendPoints(
                g.expeditionId,
                g.trackId,
                batch,
              );
              const allUuids = batch.map((p) => p.clientUuid);
              const uuids = allUuids.filter(
                (u): u is string => typeof u === 'string',
              );
              await bufferDelete(uuids);
              if (res.trackEnded) {
                // eslint-disable-next-line no-console
                console.info(
                  `[TrackingContext] drain: track ${g.trackId} ended on server — moving to next group`,
                );
                // Don't `break` the OUTER loop — other groups may still
                // be drainable. Just stop iterating THIS group.
                stopGroup = true;
              }
              // If batch was smaller than the limit, this track is drained.
              if (batch.length < FLUSH_BATCH_SIZE) {
                stopGroup = true;
              }
            } catch (e) {
              // Drain failure (network down, auth expired, server 404 for
              // an orphaned track) — leave rows for next launch. Don't
              // block the user-facing app on this background work.
              // eslint-disable-next-line no-console
              console.warn(
                `[TrackingContext] drain failed for track ${g.trackId}, will retry next launch:`,
                e,
              );
              stopGroup = true;
            }
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[TrackingContext] drain init failed:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
