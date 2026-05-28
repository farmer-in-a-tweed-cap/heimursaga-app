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

import { trackApi, expeditionApi } from '@/services/api';

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
