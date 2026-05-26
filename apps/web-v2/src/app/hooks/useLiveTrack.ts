'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { trackApi, type CurrentTrackResponse } from '@/app/services/api';

const POLL_INTERVAL_MS = 30_000;

interface UseLiveTrackOptions {
  /**
   * Set to false to skip polling entirely. Callers should pass:
   *   enabled = expedition.currentLocationType === 'live_track'
   *           || expedition.status === 'active'
   * so we don't hammer the endpoint for blueprints, completed expeditions,
   * or expeditions that have never been tracked.
   */
  enabled: boolean;
}

/**
 * Polls `/trips/:id/tracks/current` at 30s when the tab is visible. Pauses
 * automatically when the tab is hidden; catches up immediately on refocus.
 * Returns the latest track state plus a manual `refetch` for one-off
 * updates after owner actions.
 *
 * See project_tracking_phase1_spec.md for the design constraints this
 * consumes (visibility gating, non-owner trim, freshness model).
 */
export function useLiveTrack(
  expeditionId: string | null | undefined,
  { enabled }: UseLiveTrackOptions,
) {
  const [data, setData] = useState<CurrentTrackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (!expeditionId || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await trackApi.getCurrent(expeditionId);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [expeditionId]);

  useEffect(() => {
    if (!expeditionId || !enabled) {
      setData(null);
      return;
    }

    let cancelled = false;
    let timer: number | null = null;

    const tick = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void fetchOnce();
      }
    };

    setLoading(true);
    void fetchOnce(); // initial fetch
    timer = window.setInterval(tick, POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        // Catch up immediately on tab refocus rather than waiting up to 30s.
        void fetchOnce();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [expeditionId, enabled, fetchOnce]);

  return { data, loading, error, refetch: fetchOnce };
}
