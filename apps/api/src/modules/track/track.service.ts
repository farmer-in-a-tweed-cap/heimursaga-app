import { Injectable } from '@nestjs/common';

import {
  ServiceException,
  ServiceExceptionStatus,
  ServiceForbiddenException,
  ServiceInternalException,
  ServiceNotFoundException,
} from '@/common/exceptions';
import { ISession } from '@/common/interfaces';
import { idOrSlug } from '@/lib/slug';
import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { TrackPointInputDto, TrackStartDto } from './track.dto';

// GPS accuracy worse than this gets dropped on ingest. Trades a few honest
// points (e.g. fresh fix while phone is acquiring satellites) for a clean
// polyline free of urban-canyon spikes.
const MAX_ACCURACY_M = 200;

// Default point cap on the public live-track read. Phase 1.5 will replace
// the stride-simplifier with Douglas-Peucker.
const DEFAULT_MAX_POINTS = 500;

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
          expedition: { author_id: explorerId },
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

      const filtered = points.filter(
        (p) => p.accuracyM == null || p.accuracyM <= MAX_ACCURACY_M,
      );
      const accuracyRejected = points.length - filtered.length;
      if (filtered.length === 0) {
        return {
          accepted: 0,
          rejected: accuracyRejected,
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
      // query because we need the new TrackPoint's id, which createMany
      // doesn't return.
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
        rejected: accuracyRejected + (filtered.length - insertResult.count),
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

      // Visibility gate. 'sponsors' is treated as 'public' until a
      // sponsor-aware viewer check is wired in (see Phase 1 follow-up).
      const polylineVisibility = expedition.live_track_visibility || 'private';
      if (!isOwner && polylineVisibility === 'private') {
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
        const windowEnd =
          expedition.end_date ?? (track.ended_at ?? new Date());
        pointsWhere.recorded_at = { gte: windowStart, lte: windowEnd };
      }

      const points = await this.prisma.trackPoint.findMany({
        where: pointsWhere,
        orderBy: { recorded_at: 'asc' },
        select: { lat: true, lon: true, recorded_at: true },
      });

      const simplified = simplifyByStride(points, cap);
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
