import { Injectable } from '@nestjs/common';

import { idOrSlug } from '@/lib/slug';

import {
  ServiceException,
  ServiceExceptionStatus,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISession } from '@/common/interfaces';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { TrackPointInputDto, TrackStartDto } from './track.dto';

// GPS accuracy worse than this gets dropped on ingest. Trades a few honest
// points (e.g. fresh fix while phone is acquiring satellites) for a clean
// polyline free of urban-canyon spikes.
const MAX_ACCURACY_M = 200;

// Reject ingest points whose recorded_at is further than this from server
// time. Prevents (a) backdated points poisoning the non-owner date-window
// trim and (b) a misbehaving client filling disk with arbitrary historical
// rows. The mobile uploader's offline buffer is sized so a multi-day
// reconnect still falls inside this window.
const RECORDED_AT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Default point cap on the public live-track read. Phase 1.5 will replace
// the stride-simplifier with Douglas-Peucker.
const DEFAULT_MAX_POINTS = 500;

// Sponsorship statuses that grant a viewer access to 'sponsors'-gated
// content. Mirrors expedition.service.ts:resolveExpeditionLocations
// sponsor check so the two visibility surfaces agree.
const ACTIVE_SPONSORSHIP_STATUSES = [
  'active',
  'confirmed',
  'ACTIVE',
  'CONFIRMED',
];

@Injectable()
export class TrackService {
  constructor(
    private prisma: PrismaService,
    private logger: Logger,
  ) {}

  async startTrack({
    session,
    tripId,
    body,
  }: {
    session: ISession;
    tripId: string;
    body: TrackStartDto;
  }) {
    try {
      const explorerId = session?.explorerId;
      if (!explorerId) throw new ServiceForbiddenException();

      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: {
            ...idOrSlug(tripId),
            author_id: explorerId,
            deleted_at: null,
          },
          select: { id: true, status: true },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      if (
        expedition.status === 'completed' ||
        expedition.status === 'cancelled'
      ) {
        throw new ServiceForbiddenException(
          'Tracking cannot be started on completed or cancelled expeditions',
        );
      }

      // Single-active-track-per-user enforcement, across all expeditions
      // and devices. Reaching this state from the mobile app means the
      // app didn't properly stop a prior track — surface a 409 so the
      // client can choose to stop the old one.
      const existingActive = await this.prisma.track.findFirst({
        where: {
          ended_at: null,
          deleted_at: null,
          expedition: { author_id: explorerId, deleted_at: null },
        },
        select: { id: true, expedition_id: true },
      });
      if (existingActive) {
        throw new ServiceException(
          'Another tracking session is already active. Stop it before starting a new one.',
          ServiceExceptionStatus.CONFLICT,
        );
      }

      const track = await this.prisma.track.create({
        data: {
          expedition_id: expedition.id,
          source: body.source,
          source_device_id: body.sourceDeviceId,
        },
        select: { id: true, started_at: true },
      });

      return { trackId: track.id, startedAt: track.started_at.toISOString() };
    } catch (e: any) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async appendPoints({
    session,
    tripId,
    trackId,
    points,
  }: {
    session: ISession;
    tripId: string;
    trackId: number;
    points: TrackPointInputDto[];
  }) {
    try {
      const explorerId = session?.explorerId;
      if (!explorerId) throw new ServiceForbiddenException();
      if (!points || points.length === 0) {
        return { accepted: 0, rejected: 0, trackEnded: false };
      }

      const track = await this.prisma.track
        .findFirstOrThrow({
          where: {
            id: trackId,
            ended_at: null,
            deleted_at: null,
            expedition: { ...idOrSlug(tripId), author_id: explorerId },
          },
          select: {
            id: true,
            expedition_id: true,
            expedition: { select: { status: true } },
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException(
            'active track not found for this expedition',
          );
        });

      // Mid-stream expedition state change — auto-stop and drop the batch.
      if (
        track.expedition.status === 'completed' ||
        track.expedition.status === 'cancelled'
      ) {
        await this.prisma.track.update({
          where: { id: track.id },
          data: { ended_at: new Date() },
        });
        return {
          accepted: 0,
          rejected: points.length,
          trackEnded: true,
        };
      }

      // Drop low-accuracy spikes AND timestamps outside the sanity window.
      // Both filters happen pre-insert so bad data never hits the DB.
      const now = Date.now();
      const filtered = points.filter((p) => {
        const t = new Date(p.recordedAt).getTime();
        if (isNaN(t) || Math.abs(t - now) > RECORDED_AT_WINDOW_MS) return false;
        if (p.accuracyM != null && p.accuracyM > MAX_ACCURACY_M) return false;
        return true;
      });
      const preInsertRejected = points.length - filtered.length;
      if (filtered.length === 0) {
        return {
          accepted: 0,
          rejected: preInsertRejected,
          trackEnded: false,
        };
      }

      // skipDuplicates relies on the partial unique index on
      // (track_id, client_uuid). Points without a client_uuid are always
      // inserted (no dedup possible).
      const insertResult = await this.prisma.trackPoint.createMany({
        data: filtered.map((p) => ({
          track_id: track.id,
          recorded_at: new Date(p.recordedAt),
          lat: p.lat,
          lon: p.lon,
          accuracy_m: p.accuracyM,
          speed_mps: p.speedMps,
          altitude_m: p.altitudeM,
          battery_pct: p.batteryPct,
          client_uuid: p.clientUuid,
        })),
        skipDuplicates: true,
      });

      // Promote the latest point to current_location. Done as a second
      // query because createMany doesn't return inserted ids.
      //
      // Race note: if a concurrent appendBatch on the same track inserts
      // a newer point between our createMany and this findFirst, we'll
      // pick up that newer point and set current_location_id to it. That's
      // a last-writer-wins outcome but the value is always a valid recent
      // TrackPoint of this track — never corrupt. The mobile uploader
      // serializes per-track requests so concurrent appendBatch is rare
      // in practice; revisit if multi-device concurrent ingest ships.
      const latest = await this.prisma.trackPoint.findFirst({
        where: { track_id: track.id },
        orderBy: { recorded_at: 'desc' },
        select: { id: true },
      });

      if (latest) {
        await this.prisma.expedition.update({
          where: { id: track.expedition_id },
          data: {
            current_location_type: 'live_track',
            current_location_id: latest.id.toString(),
          },
        });
      }

      return {
        accepted: insertResult.count,
        rejected: preInsertRejected + (filtered.length - insertResult.count),
        trackEnded: false,
      };
    } catch (e: any) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async heartbeat({
    session,
    tripId,
    trackId,
  }: {
    session: ISession;
    tripId: string;
    trackId: number;
  }) {
    try {
      const explorerId = session?.explorerId;
      if (!explorerId) throw new ServiceForbiddenException();

      const updated = await this.prisma.track.updateMany({
        where: {
          id: trackId,
          ended_at: null,
          deleted_at: null,
          expedition: { ...idOrSlug(tripId), author_id: explorerId },
        },
        data: { last_heartbeat_at: new Date() },
      });

      if (updated.count === 0) {
        throw new ServiceNotFoundException('active track not found');
      }

      return { ok: true };
    } catch (e: any) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  /**
   * Lookup the user's currently-active track (across all expeditions),
   * or null. Used by the mobile client's recovery flow when startTrack
   * returns 409 — the client needs to know which expedition the orphan
   * belongs to so it can surface a meaningful "Stop session on [Title]?"
   * dialog and call stopTrack with the right tripId.
   *
   * Returns the expedition's public_id (preferred mobile reference form)
   * AND slug — caller can use either with idOrSlug-backed endpoints.
   */
  async getMyActiveTrack({ session }: { session: ISession }) {
    try {
      const explorerId = session?.explorerId;
      if (!explorerId) throw new ServiceForbiddenException();

      // expedition.deleted_at filter matters here: a track orphaned by a
      // soft-deleted expedition can't be stopped via the stop route (which
      // also filters deleted expeditions) — surfacing it would trap the
      // recovery dialog in a stop-that-always-404s loop.
      const active = await this.prisma.track.findFirst({
        where: {
          ended_at: null,
          deleted_at: null,
          expedition: { author_id: explorerId, deleted_at: null },
        },
        select: {
          id: true,
          started_at: true,
          expedition: {
            select: {
              public_id: true,
              slug: true,
              title: true,
            },
          },
        },
        orderBy: { started_at: 'desc' },
      });

      if (!active) return { activeTrack: null };

      return {
        activeTrack: {
          trackId: active.id,
          expeditionPublicId: active.expedition.public_id,
          expeditionSlug: active.expedition.slug,
          expeditionTitle: active.expedition.title,
          startedAt: active.started_at.toISOString(),
        },
      };
    } catch (e: any) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async stopTrack({
    session,
    tripId,
    trackId,
  }: {
    session: ISession;
    tripId: string;
    trackId: number;
  }) {
    try {
      const explorerId = session?.explorerId;
      if (!explorerId) throw new ServiceForbiddenException();

      const updated = await this.prisma.track.updateMany({
        where: {
          id: trackId,
          ended_at: null,
          deleted_at: null,
          expedition: { ...idOrSlug(tripId), author_id: explorerId },
        },
        data: { ended_at: new Date() },
      });

      if (updated.count === 0) {
        throw new ServiceNotFoundException('active track not found');
      }

      // Stop semantics are frozen-live: current_location stays pointed at
      // the final TrackPoint. The user can manually re-pin via the
      // existing PATCH /trips/:id/location endpoint when they want to
      // move on.
      return { ok: true };
    } catch (e: any) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }

  async getCurrentTrack({
    session,
    tripId,
    maxPoints,
  }: {
    session: ISession;
    tripId: string;
    maxPoints?: number;
  }) {
    try {
      const viewerId = session?.explorerId;
      const cap =
        maxPoints && maxPoints > 0 && maxPoints <= 5000
          ? maxPoints
          : DEFAULT_MAX_POINTS;

      const expedition = await this.prisma.expedition
        .findFirstOrThrow({
          where: { ...idOrSlug(tripId), deleted_at: null },
          select: {
            id: true,
            author_id: true,
            start_date: true,
            end_date: true,
            live_track_visibility: true,
          },
        })
        .catch(() => {
          throw new ServiceNotFoundException('expedition not found');
        });

      const isOwner = viewerId === expedition.author_id;

      // Visibility gate. Three states, evaluated in priority order:
      //   - 'public': anyone (including logged-out viewers) can see
      //   - 'sponsors': owner or an active/confirmed sponsor of the explorer
      //   - 'private': owner only (the default)
      const polylineVisibility = expedition.live_track_visibility || 'private';
      let canSee = isOwner;
      if (!canSee && polylineVisibility === 'public') {
        canSee = true;
      } else if (!canSee && polylineVisibility === 'sponsors' && viewerId) {
        const sponsorshipCount = await this.prisma.sponsorship.count({
          where: {
            sponsor_id: viewerId,
            sponsored_explorer_id: expedition.author_id,
            deleted_at: null,
            status: { in: ACTIVE_SPONSORSHIP_STATUSES },
          },
        });
        canSee = sponsorshipCount > 0;
      }
      if (!canSee) {
        return {
          trackId: null,
          polyline: null,
          isActive: false,
          lastPointAt: null,
          heartbeatAt: null,
          startedAt: null,
          endedAt: null,
        };
      }

      const track = await this.prisma.track.findFirst({
        where: { expedition_id: expedition.id, deleted_at: null },
        orderBy: { started_at: 'desc' },
        select: {
          id: true,
          started_at: true,
          ended_at: true,
          last_heartbeat_at: true,
        },
      });

      if (!track) {
        return {
          trackId: null,
          polyline: null,
          isActive: false,
          lastPointAt: null,
          heartbeatAt: null,
          startedAt: null,
          endedAt: null,
        };
      }

      // Non-owner trim: only points inside the expedition's active window.
      // Owner gets the full track.
      const pointsWhere: { track_id: number; recorded_at?: object } = {
        track_id: track.id,
      };
      if (!isOwner) {
        const windowStart = expedition.start_date ?? track.started_at;
        const windowEnd = expedition.end_date ?? track.ended_at ?? new Date();
        pointsWhere.recorded_at = { gte: windowStart, lte: windowEnd };
      }

      const points = await this.prisma.trackPoint.findMany({
        where: pointsWhere,
        orderBy: { recorded_at: 'asc' },
        select: { lat: true, lon: true, recorded_at: true },
      });

      // Hard cap at `cap` — simplifyByStride may otherwise return cap+1
      // when total points isn't evenly divisible by the stride.
      const simplified = simplifyByStride(points, cap).slice(0, cap);
      const coordinates: [number, number][] = simplified.map((p) => [
        p.lon,
        p.lat,
      ]);

      const polyline =
        coordinates.length > 0
          ? { type: 'LineString' as const, coordinates }
          : null;

      const lastPointAt =
        points.length > 0
          ? points[points.length - 1].recorded_at.toISOString()
          : null;

      return {
        trackId: track.id,
        polyline,
        isActive: track.ended_at == null,
        lastPointAt,
        heartbeatAt: track.last_heartbeat_at?.toISOString() ?? null,
        startedAt: track.started_at.toISOString(),
        endedAt: track.ended_at?.toISOString() ?? null,
      };
    } catch (e: any) {
      this.logger.error(e);
      if (e.status) throw e;
      throw new ServiceInternalException();
    }
  }
}

// Coarse first-pass simplifier. Picks every Nth point so the response
// stays within the cap. Replace with Douglas-Peucker in Phase 1.5 when
// the visual coarseness becomes obvious at zoom.
function simplifyByStride<T>(points: T[], targetCount: number): T[] {
  if (points.length <= targetCount) return points;
  const stride = Math.ceil(points.length / targetCount);
  const out: T[] = [];
  for (let i = 0; i < points.length; i += stride) {
    out.push(points[i]);
  }
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}
