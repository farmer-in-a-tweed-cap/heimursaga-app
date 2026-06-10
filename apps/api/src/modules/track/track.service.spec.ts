import { MockLogger, createMockLogger } from '@/test/mocks/logger.mock';
import {
  MockPrismaService,
  createMockPrismaService,
} from '@/test/mocks/prisma.mock';

import { TrackService } from './track.service';

/**
 * Scenario tests for the live-tracking Phase 1 server contract. Each
 * describe block maps to a user-visible scenario from the Phase 1 spec
 * (decided 2026-05-26): start/stop semantics, single-active-track
 * enforcement, ingest filters, heartbeat freshness, visibility gating,
 * and the non-owner expedition-window trim.
 */
describe('TrackService', () => {
  let service: TrackService;
  let prisma: MockPrismaService;
  let logger: MockLogger;

  const ownerSession = { explorerId: 10 } as any;
  const viewerSession = { explorerId: 99 } as any;
  const anonSession = {} as any;

  beforeEach(() => {
    prisma = createMockPrismaService();
    logger = createMockLogger();
    service = new TrackService(prisma as any, logger as any);
  });

  afterEach(() => jest.clearAllMocks());

  // ───────────────────────── startTrack ─────────────────────────

  describe('startTrack — scenario: explorer begins live tracking', () => {
    const body = { source: 'mobile', sourceDeviceId: 'dev-1' } as any;

    function setupStart(overrides: { status?: string; orphan?: boolean } = {}) {
      prisma.expedition.findFirstOrThrow.mockResolvedValue({
        id: 1,
        status: overrides.status ?? 'active',
      });
      prisma.track.findFirst.mockResolvedValue(
        overrides.orphan ? { id: 7, expedition_id: 2 } : null,
      );
      prisma.track.create.mockResolvedValue({
        id: 42,
        started_at: new Date('2026-06-01T08:00:00Z'),
      });
    }

    it('creates a track and returns trackId + ISO startedAt', async () => {
      setupStart();
      const res = await service.startTrack({
        session: ownerSession,
        tripId: 'exp-1',
        body,
      });
      expect(res).toEqual({
        trackId: 42,
        startedAt: '2026-06-01T08:00:00.000Z',
      });
      expect(prisma.track.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expedition_id: 1,
            source: 'mobile',
            source_device_id: 'dev-1',
          }),
        }),
      );
    });

    it('rejects anonymous callers with 403', async () => {
      await expect(
        service.startTrack({ session: anonSession, tripId: 'exp-1', body }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('404s when the expedition does not exist or is not owned', async () => {
      prisma.expedition.findFirstOrThrow.mockRejectedValue(new Error('no row'));
      await expect(
        service.startTrack({ session: ownerSession, tripId: 'nope', body }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it.each(['completed', 'cancelled'])(
      'forbids starting on a %s expedition',
      async (status) => {
        setupStart({ status });
        await expect(
          service.startTrack({ session: ownerSession, tripId: 'exp-1', body }),
        ).rejects.toMatchObject({ status: 403 });
        expect(prisma.track.create).not.toHaveBeenCalled();
      },
    );

    it('409s when another track is already active for this user (any expedition)', async () => {
      setupStart({ orphan: true });
      await expect(
        service.startTrack({ session: ownerSession, tripId: 'exp-1', body }),
      ).rejects.toMatchObject({ status: 409 });
      expect(prisma.track.create).not.toHaveBeenCalled();
      // The guard must look across ALL the user's expeditions (that is
      // what makes it single-active-track-per-user) but skip orphans on
      // soft-deleted expeditions, which can never be stopped.
      expect(prisma.track.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ended_at: null,
            expedition: { author_id: 10, deleted_at: null },
          }),
        }),
      );
    });
  });

  // ───────────────────────── appendPoints ─────────────────────────

  describe('appendPoints — scenario: mobile uploader flushes a batch', () => {
    const NOW = new Date('2026-06-09T12:00:00Z').getTime();

    function point(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        recordedAt: new Date(NOW - 60_000).toISOString(),
        lat: 60.1,
        lon: 10.2,
        accuracyM: 12,
        speedMps: 1.2,
        altitudeM: 250,
        batteryPct: 80,
        clientUuid: 'uuid-1',
        ...overrides,
      } as any;
    }

    function setupAppend(
      overrides: { expeditionStatus?: string; insertedCount?: number } = {},
    ) {
      prisma.track.findFirstOrThrow.mockResolvedValue({
        id: 42,
        expedition_id: 1,
        expedition: { status: overrides.expeditionStatus ?? 'active' },
      });
      prisma.trackPoint.createMany.mockImplementation(({ data }: any) =>
        Promise.resolve({
          count: overrides.insertedCount ?? data.length,
        }),
      );
      prisma.trackPoint.findFirst.mockResolvedValue({ id: BigInt(9001) });
      prisma.expedition.update.mockResolvedValue({});
      prisma.track.update.mockResolvedValue({});
    }

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('accepts a clean batch and promotes the latest point to current_location', async () => {
      setupAppend();
      const res = await service.appendPoints({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
        points: [point(), point({ clientUuid: 'uuid-2' })],
      });
      expect(res).toEqual({ accepted: 2, rejected: 0, trackEnded: false });
      expect(prisma.expedition.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          current_location_type: 'live_track',
          current_location_id: '9001',
        },
      });
    });

    it('returns zeros without touching the DB for an empty batch', async () => {
      const res = await service.appendPoints({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
        points: [],
      });
      expect(res).toEqual({ accepted: 0, rejected: 0, trackEnded: false });
      expect(prisma.track.findFirstOrThrow).not.toHaveBeenCalled();
    });

    it('404s when no active track matches trip + owner', async () => {
      prisma.track.findFirstOrThrow.mockRejectedValue(new Error('no row'));
      await expect(
        service.appendPoints({
          session: ownerSession,
          tripId: 'exp-1',
          trackId: 42,
          points: [point()],
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it.each(['completed', 'cancelled'])(
      'auto-stops the track when the expedition turned %s mid-stream',
      async (expeditionStatus) => {
        setupAppend({ expeditionStatus });
        const res = await service.appendPoints({
          session: ownerSession,
          tripId: 'exp-1',
          trackId: 42,
          points: [point(), point()],
        });
        expect(res).toEqual({ accepted: 0, rejected: 2, trackEnded: true });
        expect(prisma.track.update).toHaveBeenCalledWith({
          where: { id: 42 },
          data: { ended_at: expect.any(Date) },
        });
        expect(prisma.trackPoint.createMany).not.toHaveBeenCalled();
      },
    );

    it('drops points with accuracy worse than 200 m', async () => {
      setupAppend();
      const res = await service.appendPoints({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
        points: [
          point(),
          point({ accuracyM: 201, clientUuid: 'uuid-bad' }),
          // accuracy exactly at the limit is kept
          point({ accuracyM: 200, clientUuid: 'uuid-edge' }),
          // missing accuracy is trusted
          point({ accuracyM: null, clientUuid: 'uuid-null' }),
        ],
      });
      expect(res).toEqual({ accepted: 3, rejected: 1, trackEnded: false });
      const inserted = prisma.trackPoint.createMany.mock.calls[0][0].data;
      expect(inserted.map((p: any) => p.client_uuid)).toEqual([
        'uuid-1',
        'uuid-edge',
        'uuid-null',
      ]);
    });

    it('drops backdated, future, and unparseable timestamps (24 h sanity window)', async () => {
      setupAppend();
      const res = await service.appendPoints({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
        points: [
          point(),
          point({
            recordedAt: new Date(NOW - 25 * 60 * 60 * 1000).toISOString(),
            clientUuid: 'uuid-old',
          }),
          point({
            recordedAt: new Date(NOW + 25 * 60 * 60 * 1000).toISOString(),
            clientUuid: 'uuid-future',
          }),
          point({ recordedAt: 'not-a-date', clientUuid: 'uuid-garbage' }),
        ],
      });
      expect(res).toEqual({ accepted: 1, rejected: 3, trackEnded: false });
    });

    it('skips the insert entirely when every point is filtered', async () => {
      setupAppend();
      const res = await service.appendPoints({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
        points: [point({ accuracyM: 999 })],
      });
      expect(res).toEqual({ accepted: 0, rejected: 1, trackEnded: false });
      expect(prisma.trackPoint.createMany).not.toHaveBeenCalled();
      expect(prisma.expedition.update).not.toHaveBeenCalled();
    });

    it('counts client_uuid duplicates (skipDuplicates) as rejected', async () => {
      // Offline-buffer retry resends a batch where 1 of 3 already landed.
      setupAppend({ insertedCount: 2 });
      const res = await service.appendPoints({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
        points: [
          point(),
          point({ clientUuid: 'uuid-2' }),
          point({ clientUuid: 'uuid-3' }),
        ],
      });
      expect(res).toEqual({ accepted: 2, rejected: 1, trackEnded: false });
    });
  });

  // ───────────────────────── heartbeat ─────────────────────────

  describe('heartbeat — scenario: stationary explorer keeps the badge fresh', () => {
    it('stamps last_heartbeat_at on the active track', async () => {
      prisma.track.updateMany.mockResolvedValue({ count: 1 });
      const res = await service.heartbeat({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
      });
      expect(res).toEqual({ ok: true });
      expect(prisma.track.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 42, ended_at: null }),
          data: { last_heartbeat_at: expect.any(Date) },
        }),
      );
    });

    it('404s when the track is already stopped or not owned', async () => {
      prisma.track.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.heartbeat({
          session: ownerSession,
          tripId: 'exp-1',
          trackId: 42,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejects anonymous callers with 403', async () => {
      await expect(
        service.heartbeat({
          session: anonSession,
          tripId: 'exp-1',
          trackId: 42,
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  // ───────────────────────── getMyActiveTrack ─────────────────────────

  describe('getMyActiveTrack — scenario: 409 recovery lookup', () => {
    it('returns null when the user has no active track', async () => {
      prisma.track.findFirst.mockResolvedValue(null);
      const res = await service.getMyActiveTrack({ session: ownerSession });
      expect(res).toEqual({ activeTrack: null });
    });

    it('returns the orphan with expedition references for the recovery dialog', async () => {
      prisma.track.findFirst.mockResolvedValue({
        id: 7,
        started_at: new Date('2026-06-08T09:30:00Z'),
        expedition: {
          public_id: 'pub_abc',
          slug: 'crossing-norway-x1',
          title: 'Crossing Norway',
        },
      });
      const res = await service.getMyActiveTrack({ session: ownerSession });
      expect(res).toEqual({
        activeTrack: {
          trackId: 7,
          expeditionPublicId: 'pub_abc',
          expeditionSlug: 'crossing-norway-x1',
          expeditionTitle: 'Crossing Norway',
          startedAt: '2026-06-08T09:30:00.000Z',
        },
      });
    });

    it('rejects anonymous callers with 403', async () => {
      await expect(
        service.getMyActiveTrack({ session: anonSession }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('looks up only live tracks on the user own non-deleted expeditions', async () => {
      // A track orphaned by a soft-deleted expedition must NOT surface:
      // the stop route filters deleted expeditions too, so the recovery
      // dialog could never actually stop it.
      prisma.track.findFirst.mockResolvedValue(null);
      await service.getMyActiveTrack({ session: ownerSession });
      expect(prisma.track.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ended_at: null,
            deleted_at: null,
            expedition: { author_id: 10, deleted_at: null },
          }),
          orderBy: { started_at: 'desc' },
        }),
      );
    });
  });

  // ───────────────────────── stopTrack ─────────────────────────

  describe('stopTrack — scenario: explorer ends the session (frozen-live)', () => {
    it('sets ended_at and leaves current_location untouched', async () => {
      prisma.track.updateMany.mockResolvedValue({ count: 1 });
      const res = await service.stopTrack({
        session: ownerSession,
        tripId: 'exp-1',
        trackId: 42,
      });
      expect(res).toEqual({ ok: true });
      // Frozen-live semantics: the pin stays on the final TrackPoint, so
      // stop must NOT rewrite expedition.current_location_*.
      expect(prisma.expedition.update).not.toHaveBeenCalled();
      expect(prisma.expedition.updateMany).not.toHaveBeenCalled();
    });

    it('404s when there is no active track to stop', async () => {
      prisma.track.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.stopTrack({
          session: ownerSession,
          tripId: 'exp-1',
          trackId: 42,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('rejects anonymous callers with 403', async () => {
      await expect(
        service.stopTrack({
          session: anonSession,
          tripId: 'exp-1',
          trackId: 42,
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  // ───────────────────────── getCurrentTrack ─────────────────────────

  describe('getCurrentTrack — scenario: viewers load the live polyline', () => {
    const EMPTY_RESPONSE = {
      trackId: null,
      polyline: null,
      isActive: false,
      lastPointAt: null,
      heartbeatAt: null,
      startedAt: null,
      endedAt: null,
    };

    function setupExpedition(
      overrides: Partial<{
        author_id: number;
        live_track_visibility: string | null;
        start_date: Date | null;
        end_date: Date | null;
      }> = {},
    ) {
      prisma.expedition.findFirstOrThrow.mockResolvedValue({
        id: 1,
        author_id: 10,
        start_date: new Date('2026-06-01T00:00:00Z'),
        end_date: new Date('2026-06-30T00:00:00Z'),
        live_track_visibility: 'private',
        ...overrides,
      });
    }

    function setupTrack(
      overrides: Partial<{
        ended_at: Date | null;
        last_heartbeat_at: Date | null;
      }> = {},
    ) {
      prisma.track.findFirst.mockResolvedValue({
        id: 42,
        started_at: new Date('2026-06-05T08:00:00Z'),
        ended_at: null,
        last_heartbeat_at: new Date('2026-06-09T11:45:00Z'),
        ...overrides,
      });
    }

    function trackPoints(count: number) {
      const base = new Date('2026-06-05T08:00:00Z').getTime();
      return Array.from({ length: count }, (_, i) => ({
        lat: 60 + i * 0.001,
        lon: 10 + i * 0.001,
        recorded_at: new Date(base + i * 60_000),
      }));
    }

    it('hides a private track from logged-in non-owners (no track query)', async () => {
      setupExpedition({ live_track_visibility: 'private' });
      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });
      expect(res).toEqual(EMPTY_RESPONSE);
      expect(prisma.track.findFirst).not.toHaveBeenCalled();
    });

    it('hides a private track from anonymous viewers', async () => {
      setupExpedition({ live_track_visibility: 'private' });
      const res = await service.getCurrentTrack({
        session: anonSession,
        tripId: 'exp-1',
      });
      expect(res).toEqual(EMPTY_RESPONSE);
    });

    it('treats a missing visibility value as private', async () => {
      setupExpedition({ live_track_visibility: null });
      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });
      expect(res).toEqual(EMPTY_RESPONSE);
    });

    it('shows the owner their own private track, untrimmed', async () => {
      setupExpedition({ live_track_visibility: 'private' });
      setupTrack();
      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(3));

      const res = await service.getCurrentTrack({
        session: ownerSession,
        tripId: 'exp-1',
      });

      expect(res.trackId).toBe(42);
      expect(res.isActive).toBe(true);
      expect(res.polyline?.coordinates).toHaveLength(3);
      // Owner reads the full track — no recorded_at window in the where.
      expect(prisma.trackPoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { track_id: 42 } }),
      );
    });

    it('shows a public track to anonymous viewers', async () => {
      setupExpedition({ live_track_visibility: 'public' });
      setupTrack();
      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(2));

      const res = await service.getCurrentTrack({
        session: anonSession,
        tripId: 'exp-1',
      });
      expect(res.trackId).toBe(42);
      expect(res.polyline?.coordinates).toHaveLength(2);
    });

    it('shows a sponsors-gated track to an active sponsor', async () => {
      setupExpedition({ live_track_visibility: 'sponsors' });
      setupTrack();
      prisma.sponsorship.count.mockResolvedValue(1);
      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(2));

      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });
      expect(res.trackId).toBe(42);
      expect(prisma.sponsorship.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sponsor_id: 99,
            sponsored_explorer_id: 10,
          }),
        }),
      );
    });

    it('hides a sponsors-gated track from non-sponsors', async () => {
      setupExpedition({ live_track_visibility: 'sponsors' });
      prisma.sponsorship.count.mockResolvedValue(0);
      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });
      expect(res).toEqual(EMPTY_RESPONSE);
    });

    it('hides a sponsors-gated track from anonymous viewers without a sponsor lookup', async () => {
      setupExpedition({ live_track_visibility: 'sponsors' });
      const res = await service.getCurrentTrack({
        session: anonSession,
        tripId: 'exp-1',
      });
      expect(res).toEqual(EMPTY_RESPONSE);
      expect(prisma.sponsorship.count).not.toHaveBeenCalled();
    });

    it('returns the empty shape when the expedition has no track yet', async () => {
      setupExpedition({ live_track_visibility: 'public' });
      prisma.track.findFirst.mockResolvedValue(null);
      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });
      expect(res).toEqual(EMPTY_RESPONSE);
    });

    it('trims non-owner reads to the expedition date window', async () => {
      setupExpedition({ live_track_visibility: 'public' });
      setupTrack();
      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(2));

      await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });

      expect(prisma.trackPoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            track_id: 42,
            recorded_at: {
              gte: new Date('2026-06-01T00:00:00Z'),
              lte: new Date('2026-06-30T00:00:00Z'),
            },
          },
        }),
      );
    });

    it('falls back to track start / now when expedition dates are missing', async () => {
      setupExpedition({
        live_track_visibility: 'public',
        start_date: null,
        end_date: null,
      });
      setupTrack({ ended_at: null });
      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(1));

      await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });

      const where = prisma.trackPoint.findMany.mock.calls[0][0].where;
      expect(where.recorded_at.gte).toEqual(new Date('2026-06-05T08:00:00Z'));
      expect(where.recorded_at.lte).toBeInstanceOf(Date);
    });

    it('caps the polyline at 500 points and keeps the final point', async () => {
      setupExpedition({ live_track_visibility: 'public' });
      setupTrack();
      const points = trackPoints(1200);
      prisma.trackPoint.findMany.mockResolvedValue(points);

      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });

      expect(res.polyline!.coordinates.length).toBeLessThanOrEqual(500);
      const lastIn = points[points.length - 1];
      const lastOut =
        res.polyline!.coordinates[res.polyline!.coordinates.length - 1];
      expect(lastOut).toEqual([lastIn.lon, lastIn.lat]);
      // lastPointAt reflects the true latest point, not the simplified set.
      expect(res.lastPointAt).toBe(lastIn.recorded_at.toISOString());
    });

    it('honors a sane maxPoints override and ignores an absurd one', async () => {
      setupExpedition({ live_track_visibility: 'public' });
      setupTrack();
      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(300));

      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
        maxPoints: 100,
      });
      expect(res.polyline!.coordinates.length).toBeLessThanOrEqual(100);

      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(1200));
      const res2 = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
        maxPoints: 999_999,
      });
      expect(res2.polyline!.coordinates.length).toBeLessThanOrEqual(500);
    });

    it('reports a stopped track as inactive with its endedAt', async () => {
      setupExpedition({ live_track_visibility: 'public' });
      setupTrack({
        ended_at: new Date('2026-06-08T19:00:00Z'),
        last_heartbeat_at: null,
      });
      prisma.trackPoint.findMany.mockResolvedValue(trackPoints(2));

      const res = await service.getCurrentTrack({
        session: viewerSession,
        tripId: 'exp-1',
      });
      expect(res.isActive).toBe(false);
      expect(res.endedAt).toBe('2026-06-08T19:00:00.000Z');
      expect(res.heartbeatAt).toBeNull();
    });

    it('404s when the expedition does not exist', async () => {
      prisma.expedition.findFirstOrThrow.mockRejectedValue(new Error('no row'));
      await expect(
        service.getCurrentTrack({ session: viewerSession, tripId: 'nope' }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
