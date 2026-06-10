import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState } from 'react-native';
import * as Location from 'expo-location';

import { useAuth } from '@/context/AuthContext';
import { ApiError, trackApi, expeditionApi } from '@/services/api';
import { registerPreLogoutHandler } from '@/services/preLogout';
import type { ActiveTrackInfo } from '@/services/api';
import {
  bufferDelete,
  bufferListPendingTracks,
  bufferPruneStale,
  bufferReadBatch,
  clearTrackingSession,
  getTrackingSession,
  setTrackingSession,
  setTrackingSessionPaused,
} from '@/services/trackingBuffer';
import {
  addLocationListener,
  MAX_ACCURACY_M,
  TRACKING_TASK_NAME,
} from '@/services/trackingTask';

// MAX_ACCURACY_M is imported from `@/services/trackingTask` to keep a
// single source of truth shared with the background-task filter.
// Batch upload cadence.
const FLUSH_INTERVAL_MS = 60_000;
// Heartbeat keep-alive. Independent of position pings so the freshness
// badge stays accurate while the explorer is stationary.
const HEARTBEAT_INTERVAL_MS = 15 * 60_000;
// Per-flush batch size. The server's @ArrayMaxSize on the DTO is 200 —
// stay under that ceiling with margin.
const FLUSH_BATCH_SIZE = 100;

/**
 * Background-capable tracking options for the two cadence modes. Same
 * shape as the step-3 watcher options plus the iOS-specific flags that
 * make the OS treat this as a long-running, user-aware activity:
 *
 * - showsBackgroundLocationIndicator: shows the blue "live tracking"
 *   pill in iOS's status bar. Required by Apple for transparency.
 * - pausesUpdatesAutomatically: iOS pauses location when it detects the
 *   user is stationary (e.g. phone parked at a hotel) and resumes when
 *   they move. Saves significant battery on multi-day expeditions.
 * - activityType: hint to iOS that this is travel/navigation, not a
 *   workout — improves cadence under battery-saver heuristics.
 * - foregroundService is Android-only; no Android target on Phase 1b.
 */
const ACTIVE_TRACKING_OPTS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 60_000,
  distanceInterval: 50,
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: true,
  activityType: Location.ActivityType.OtherNavigation,
};
const CONSERVATIVE_TRACKING_OPTS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 5 * 60_000,
  distanceInterval: 500,
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: true,
  activityType: Location.ActivityType.OtherNavigation,
};

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

/**
 * Thrown by startTracking when the server's single-active-track guard
 * rejects with 409 AND we successfully looked up which orphan is in the
 * way. The caller (typically the expedition screen) catches this and
 * surfaces a recovery dialog — "Stop session on [Title]?" — that calls
 * stopForeignTrack on the orphan and retries the start.
 *
 * If the lookup itself fails (e.g., the 409 was a false positive and the
 * orphan disappeared between the start and the lookup), startTracking
 * falls through to the generic error path instead.
 */
export class TrackingConflictError extends Error {
  constructor(public readonly activeTrack: ActiveTrackInfo) {
    super(`Tracking session already active on: ${activeTrack.expeditionTitle}`);
    this.name = 'TrackingConflictError';
  }
}

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
   * Quick-drop a waypoint via POST /trips/:id/waypoints. Defaults to the
   * latest GPS fix; the quick-drop modal can pass an optional title and
   * a re-assigned location (map pick). Returns true if created.
   */
  dropWaypointAtCurrentPosition(
    title?: string,
    overrideLocation?: { lat: number; lon: number },
  ): Promise<boolean>;

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

  /**
   * Stop a track that this client isn't tracking locally — used by the
   * recovery dialog when start hits a 409. Doesn't touch context state
   * (which is idle by definition when the recovery fires); just calls
   * the server stop endpoint. Throws on failure.
   */
  stopForeignTrack(args: { expeditionId: string; trackId: number }): Promise<void>;
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

  // Re-check permission whenever the app returns to the foreground. If
  // the user revoked Always while we were running, iOS silently stops
  // delivering background events — the banner would otherwise read
  // "LIVE" indefinitely with no points coming in. We surface the
  // degradation via the error state so the UI can warn; we don't
  // auto-pause because the user can still get foreground pings via
  // When-in-Use.
  const trackingActiveRef = useRef(false);
  trackingActiveRef.current = status === 'active';
  // Fresh snapshot for callbacks that fire outside the render cycle
  // (pre-logout handler, user-switch watcher) — they must read the
  // CURRENT session, not the values captured when they were registered.
  const sessionRef = useRef({ status, expeditionId, trackId });
  sessionRef.current = { status, expeditionId, trackId };
  // Read by the tracking effect WITHOUT being a dependency — the title is
  // display metadata for the session row; a title change must not restart
  // the OS location task.
  const expeditionTitleRef = useRef(expeditionTitle);
  expeditionTitleRef.current = expeditionTitle;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void (async () => {
        const before = permissionLevel;
        const after = await refreshPermissionLevel();
        if (
          trackingActiveRef.current &&
          before === 'always' &&
          after !== 'always'
        ) {
          setError(
            'Background location permission was revoked. Tracking will only record while the app is open. Re-enable Always in iOS Settings → Privacy → Location Services → Heimursaga to resume background tracking.',
          );
        }
      })();
    });
    return () => sub.remove();
  }, [permissionLevel, refreshPermissionLevel]);

  // Tracking pipeline. While status is 'active', registers an OS-level
  // location task via `startLocationUpdatesAsync(TRACKING_TASK_NAME, opts)`.
  // The TaskManager callback (defined once in trackingTask.ts) runs in
  // both foreground and background contexts, writing each point to the
  // SQLite buffer. A separate foreground listener updates React state
  // (latestPosition) for the UI; that listener is silent in the killed-
  // and-relaunched-headless case. The 60s flush timer drains the buffer
  // to the server; the 15-min heartbeat keeps the freshness badge live.
  useEffect(() => {
    if (status !== 'active' || !expeditionId || !trackId) return;
    // Narrow the closure to non-null locals so we don't carry `null | T`
    // through every helper. The guard above ensures both are real here.
    const eid = expeditionId;
    const tid = trackId;

    const opts =
      mode === 'conservative' ? CONSERVATIVE_TRACKING_OPTS : ACTIVE_TRACKING_OPTS;
    let flushTimer: ReturnType<typeof setInterval> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let removeLocationListener: (() => void) | null = null;
    let flushInFlight = false;
    let cancelled = false;

    const handleTrackEnded = (reason: string) => {
      // The track ended server-side without a local stop (expedition
      // status changed mid-session, stop pressed on the web, or a manual
      // location update implicit-stopped it). Align client state by
      // resetting to idle — also triggers cleanup of this effect via the
      // status-dep change, which stops the OS task and clears the
      // session row.
      // eslint-disable-next-line no-console
      console.info(`[TrackingContext] track ended server-side: ${reason}`);
      // End-of-life for the persisted session row (the effect cleanup
      // intentionally doesn't clear it — see the cleanup comment).
      void clearTrackingSession().catch(() => {});
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
            handleTrackEnded('expedition status changed (auto-stop on append)');
            return;
          }
        } catch (e) {
          // 404 means the active track no longer exists server-side —
          // stopped from the web, or implicit-stopped by a manual
          // location update (spec decision #4: symmetric controls).
          // Retrying forever would keep GPS running and the banner
          // saying LIVE against a dead track. Wind the session down and
          // tell the user; leftover buffered rows age out via the 25h
          // prune.
          if (e instanceof ApiError && e.status === 404) {
            handleTrackEnded('appendPoints returned 404 (stopped elsewhere)');
            Alert.alert(
              'Tracking stopped',
              'This tracking session was ended from another device or by a manual location update. Your phone has stopped recording.',
            );
            return;
          }
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

    const startTask = async () => {
      try {
        // Persist the session config first — the TaskManager callback
        // reads it on every delivery to know which expedition + track
        // to attribute points to, and the mount-restore effect uses it
        // to resurrect the session (title included) after a reload.
        await setTrackingSession({
          expeditionId: eid,
          trackId: tid,
          mode,
          expeditionTitle: expeditionTitleRef.current ?? null,
        });

        // Stop-then-start unconditionally. The OS may still have the
        // task registered from a previous session (force-quit, crash,
        // or mode change re-running this effect before the previous
        // cleanup's stopLocationUpdatesAsync resolved). A bare start
        // call would no-op or apply opts in-place inconsistently — and
        // worse, in the mode-change case the OS would keep the OLD
        // cadence options. Always stop first, always start with the
        // current mode's opts.
        await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME).catch(() => {});
        await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, opts);

        // Foreground-only listener for UI updates. The TaskManager task
        // does the SQLite write regardless; this just keeps the
        // latestPosition state fresh while React is alive. When the
        // app is backgrounded or killed, this listener never fires
        // (different JS context or no React tree), but the buffer still
        // accumulates via the task and the next flush picks it up.
        removeLocationListener = addLocationListener((loc) => {
          if (cancelled) return;
          const accuracy = loc.coords.accuracy ?? undefined;
          if (accuracy != null && accuracy > MAX_ACCURACY_M) return;
          setLatestPosition({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            recordedAt: new Date(loc.timestamp),
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
        // expo-location threw at startLocationUpdates time. Most likely
        // permission revoked at the OS level, the iOS UIBackgroundModes
        // entitlement missing from the dev build, or the TaskManager
        // task name not registered. Surface the actual error so the
        // user knows their tracking is stuck in 'paused' instead of
        // silently failing — this was the dev-loop trap on the stop
        // path and we're closing the same hole here.
        const msg = e instanceof Error ? e.message : 'Location updates failed';
        // eslint-disable-next-line no-console
        console.warn('[TrackingContext] startLocationUpdatesAsync failed:', e);
        setError(msg);
        setStatus('paused');
        await clearTrackingSession().catch(() => {});
        Alert.alert(
          'Tracking could not start',
          `${msg}\n\nYour expedition is paused. Check that "Always" location permission is granted in iOS Settings → Privacy → Location Services → Heimursaga, then tap Resume on the tracking banner.`,
        );
      }
    };

    void startTask();

    return () => {
      cancelled = true;
      removeLocationListener?.();
      if (flushTimer) clearInterval(flushTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      // Stop the OS-level updates (best-effort — can throw if the task
      // isn't running). The session ROW is deliberately NOT cleared here:
      // cleanup also runs on pause and on dev remounts, and the row is
      // what lets the mount-restore effect resurrect the session after a
      // reload. The row is cleared only at true end-of-life points —
      // stopTracking, handleTrackEnded, logout teardown, restore-
      // validation mismatch.
      void Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME).catch(() => {});
      // No explicit final flush — `cancelled = true` would short-circuit
      // it anyway, and any unflushed points are durable in SQLite. They
      // get picked up by the cross-restart drain on next mount, or by
      // the next flush cycle if the same track resumes.
    };
  }, [status, expeditionId, trackId, mode]);

  // On Provider mount, restore a persisted session. The row survives app
  // kills and reloads; React state doesn't — without this, a reload made
  // the banner vanish while the OS task and server track stayed live, and
  // the next start hit the 409 "never stopped" dialog.
  const restoreRanRef = useRef(false);
  useEffect(() => {
    if (restoreRanRef.current) return;
    restoreRanRef.current = true;
    void (async () => {
      try {
        const row = await getTrackingSession();
        if (!row) return;

        // Validate against server truth BEFORE promoting to 'active' —
        // promoting first would start the OS task and flash the banner
        // for a session that may have been stopped from the web while
        // the app was dead. On a network/auth failure adopt anyway:
        // points buffer locally, and the 404 wind-down at first flush
        // covers a stale track.
        try {
          const { activeTrack } = await trackApi.getMyActiveTrack();
          if (!activeTrack || activeTrack.trackId !== row.trackId) {
            // eslint-disable-next-line no-console
            console.info(
              '[TrackingContext] persisted session is stale server-side — clearing',
            );
            await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME).catch(() => {});
            await clearTrackingSession().catch(() => {});
            return;
          }
        } catch {
          // offline / auth not ready — adopt the persisted session
        }

        // eslint-disable-next-line no-console
        console.info(
          `[TrackingContext] restoring ${row.paused ? 'paused' : 'active'} session for track ${row.trackId}`,
        );
        setExpeditionId(row.expeditionId);
        setExpeditionTitle(row.expeditionTitle ?? 'Expedition');
        setTrackId(row.trackId);
        setMode(row.mode);
        setStartedAt(new Date(row.startedAt));
        setStatus(row.paused ? 'paused' : 'active');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[TrackingContext] session restore failed:', e);
      }
    })();
  }, []);

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
        // 409 from the server's single-active-track guard. Look up the
        // orphan so the caller can surface a meaningful recovery dialog.
        // If the lookup itself fails (auth flap, the orphan disappeared
        // mid-flight, network blip), fall through to the generic path.
        if (e instanceof ApiError && e.status === 409) {
          try {
            const { activeTrack } = await trackApi.getMyActiveTrack();
            if (activeTrack) {
              setStatus('idle');
              throw new TrackingConflictError(activeTrack);
            }
          } catch (lookupErr) {
            if (lookupErr instanceof TrackingConflictError) throw lookupErr;
            // eslint-disable-next-line no-console
            console.warn(
              '[TrackingContext] active-track lookup failed during 409 recovery:',
              lookupErr,
            );
          }
        }
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

  const stopForeignTrack = useCallback<TrackingActions['stopForeignTrack']>(
    async ({ expeditionId: foreignExpId, trackId: foreignTrackId }) => {
      // Bypass the local state machine — by contract this is called when
      // the local context is idle and the orphan lives only on the server.
      await trackApi.stop(foreignExpId, foreignTrackId);
    },
    [],
  );

  const stopTracking = useCallback<TrackingActions['stopTracking']>(async () => {
    if (status === 'idle' || !expeditionId || !trackId) return;
    // Capture the prior status so a failure can revert cleanly. The banner
    // gates visibility on this status, so a failed stop reappears the
    // banner with the same Pause/Stop controls instead of trapping the
    // user with an active server-side track and no UI to recover.
    const priorStatus = status;
    setStatus('stopping');
    try {
      await trackApi.stop(expeditionId, trackId);
    } catch (e) {
      // Server-side track is still active. Keep all client state intact
      // (trackId, expeditionId, mode, latestPosition) and revert status
      // so the banner returns. Throw so the caller can surface an Alert
      // with a Retry — silent failure here is what created the dev-loop
      // orphan-track trap in the first place.
      setStatus(priorStatus);
      throw e;
    }
    await clearTrackingSession().catch(() => {});
    setTrackId(null);
    setExpeditionId(null);
    setExpeditionTitle(null);
    setStartedAt(null);
    setLatestPosition(null);
    setError(null);
    setStatus('idle');
  }, [status, expeditionId, trackId]);

  /**
   * Session teardown for credential-boundary events (logout, account
   * switch, token loss). Unlike stopTracking, this NEVER blocks or
   * reverts: whatever happens server-side, the local session must die —
   * the next account's credentials must not be used to flush another
   * user's track, and the banner must not survive into their session.
   */
  const teardownForCredentialChange = useCallback(
    async ({ serverStop }: { serverStop: boolean }) => {
      const s = sessionRef.current;
      if (s.status === 'idle') return;
      if (serverStop && s.expeditionId && s.trackId != null) {
        try {
          await trackApi.stop(s.expeditionId, s.trackId);
        } catch (e) {
          // Best-effort — the orphan stays active server-side and gets
          // resolved by the 409 recovery dialog on this user's next start.
          // eslint-disable-next-line no-console
          console.warn('[TrackingContext] logout stop failed (orphan remains):', e);
        }
      }
      // Explicit OS/session cleanup: when status is 'paused' the tracking
      // effect isn't mounted, so its cleanup won't run on the status flip
      // below. Idempotent with that cleanup when it does run.
      await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME).catch(() => {});
      await clearTrackingSession().catch(() => {});
      setTrackId(null);
      setExpeditionId(null);
      setExpeditionTitle(null);
      setStartedAt(null);
      setLatestPosition(null);
      setError(null);
      setStatus('idle');
    },
    [],
  );

  // Finalize the track with the OLD credentials before AuthContext clears
  // them — runs inside logout(), ahead of clearTokens().
  useEffect(
    () =>
      registerPreLogoutHandler(() =>
        teardownForCredentialChange({ serverStop: true }),
      ),
    [teardownForCredentialChange],
  );

  // Backstop for credential loss that bypasses logout() (refresh-token
  // expiry, forced sign-out). By the time `user` flips, the old tokens
  // are gone — server stop would 401, so local-only teardown. On a
  // proper logout the pre-logout handler already ran and this no-ops.
  const { user } = useAuth();
  const prevUserIdRef = useRef(user?.id);
  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = user?.id;
    if (prev != null && user?.id !== prev) {
      void teardownForCredentialChange({ serverStop: false });
    }
  }, [user?.id, teardownForCredentialChange]);

  const pauseTracking = useCallback<TrackingActions['pauseTracking']>(async () => {
    if (status !== 'active') return;
    // Status transition triggers the tracking effect's cleanup, which
    // stops the OS-level location updates. The session row stays (with
    // paused=1) so a reload restores the session as paused instead of
    // losing it or resurrecting it as actively-recording.
    setStatus('paused');
    void setTrackingSessionPaused(true).catch(() => {});
  }, [status]);

  const resumeTracking = useCallback<TrackingActions['resumeTracking']>(async () => {
    if (status !== 'paused') return;
    // Status transition triggers the tracking effect to re-fire, which
    // re-registers the OS-level location updates with the current mode.
    setStatus('active');
    void setTrackingSessionPaused(false).catch(() => {});
  }, [status]);

  const dropWaypointAtCurrentPosition = useCallback<
    TrackingActions['dropWaypointAtCurrentPosition']
  >(
    async (title, overrideLocation) => {
      if (!expeditionId || (!latestPosition && !overrideLocation)) {
        // No active expedition or no GPS yet — refuse silently. The UI
        // gates the button on `latestPosition`, so this is a safety net.
        return false;
      }
      // The quick-drop modal lets the user re-assign the location (map
      // pick) — an override drops at the picked point with the pick time;
      // the default drops at the GPS fix with the fix's timestamp.
      const lat = overrideLocation?.lat ?? latestPosition!.lat;
      const lon = overrideLocation?.lon ?? latestPosition!.lon;
      const date = overrideLocation
        ? new Date().toISOString()
        : new Date(latestPosition!.recordedAt).toISOString();
      try {
        await expeditionApi.createWaypoint(expeditionId, {
          title: title?.trim() || 'Quick waypoint',
          lat,
          lon,
          date,
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
      stopForeignTrack,
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
      stopForeignTrack,
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
