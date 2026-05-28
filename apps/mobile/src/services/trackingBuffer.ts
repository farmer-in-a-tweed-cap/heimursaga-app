import * as SQLite from 'expo-sqlite';

import type { TrackPointInput } from './api';

/**
 * Local durable buffer for pending track points. Survives app restart,
 * crash, kill-and-relaunch. Replaces the in-memory ring buffer used in
 * Phase 1b step 3.
 *
 * Schema is intentionally simple — one row per pending point with
 * client_uuid as the primary key (also the server-side dedup key, so a
 * retry that the server already accepted is a no-op).
 *
 * On every flush cycle the context reads a batch from this table,
 * uploads via trackApi.appendPoints, and deletes successfully-uploaded
 * rows by client_uuid. Failed batches stay in the table.
 *
 * Step 5 (background task) will write through this same module from the
 * TaskManager callback, so the buffer is shared between foreground and
 * background producers.
 */

export interface PendingPointInsert extends TrackPointInput {
  expeditionId: string;
  trackId: number;
}

export interface PendingTrackGroup {
  expeditionId: string;
  trackId: number;
  count: number;
}

// 25h — slightly past the server's 24h `recorded_at` sanity window so we
// don't keep dragging points the server will reject anyway.
export const STALE_POINT_MAX_AGE_MS = 25 * 60 * 60 * 1000;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('heimursaga-tracking.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS pending_track_points (
          client_uuid   TEXT PRIMARY KEY,
          expedition_id TEXT NOT NULL,
          track_id      INTEGER NOT NULL,
          recorded_at   TEXT NOT NULL,
          lat           REAL NOT NULL,
          lon           REAL NOT NULL,
          accuracy_m    REAL,
          speed_mps     REAL,
          altitude_m    REAL,
          battery_pct   INTEGER,
          created_at    INTEGER NOT NULL
        );
        -- recorded_at is stored as ISO8601 strings (e.g.
        -- '2026-05-28T19:00:00.000Z'). The format is fixed-width and
        -- UTC-normalized by Date.prototype.toISOString, so lexicographic
        -- TEXT sort matches chronological order. Don't "fix" this to an
        -- INTEGER epoch — the existing index relies on the textual
        -- ordering and the column is read directly into recordedAt on
        -- the upload DTO without parsing.
        CREATE INDEX IF NOT EXISTS pending_track_points_track_recorded_idx
          ON pending_track_points(track_id, recorded_at);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function bufferInsert(point: PendingPointInsert): Promise<void> {
  if (!point.clientUuid) {
    throw new Error('clientUuid is required for buffered points');
  }
  const db = await getDb();
  // Single-row INSERT — no transaction needed. The step-5 background
  // task will call this from inside a TaskManager callback; same shape,
  // same atomic write semantics.
  //
  // INSERT OR IGNORE — the watcher callback might fire twice for the
  // same recorded_at if the OS pushes a duplicate; client_uuid is the
  // PK so the second write is a no-op.
  await db.runAsync(
    `INSERT OR IGNORE INTO pending_track_points
       (client_uuid, expedition_id, track_id, recorded_at,
        lat, lon, accuracy_m, speed_mps, altitude_m, battery_pct, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      point.clientUuid,
      point.expeditionId,
      point.trackId,
      point.recordedAt,
      point.lat,
      point.lon,
      point.accuracyM ?? null,
      point.speedMps ?? null,
      point.altitudeM ?? null,
      point.batteryPct ?? null,
      Date.now(),
    ],
  );
}

interface PendingRow {
  client_uuid: string;
  recorded_at: string;
  lat: number;
  lon: number;
  accuracy_m: number | null;
  speed_mps: number | null;
  altitude_m: number | null;
  battery_pct: number | null;
}

export async function bufferReadBatch(
  trackId: number,
  limit: number = 100,
): Promise<TrackPointInput[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PendingRow>(
    `SELECT client_uuid, recorded_at, lat, lon, accuracy_m,
            speed_mps, altitude_m, battery_pct
       FROM pending_track_points
       WHERE track_id = ?
       ORDER BY recorded_at ASC
       LIMIT ?`,
    [trackId, limit],
  );
  return rows.map((r) => ({
    clientUuid: r.client_uuid,
    recordedAt: r.recorded_at,
    lat: r.lat,
    lon: r.lon,
    accuracyM: r.accuracy_m ?? undefined,
    speedMps: r.speed_mps ?? undefined,
    altitudeM: r.altitude_m ?? undefined,
    batteryPct: r.battery_pct ?? undefined,
  }));
}

export async function bufferDelete(clientUuids: string[]): Promise<void> {
  if (clientUuids.length === 0) return;
  const db = await getDb();
  // SQLite has a limit of ~999 parameters per query. Chunk if needed —
  // the flush batch size is well below this, but the cross-restart drain
  // could theoretically hit it.
  const CHUNK = 500;
  for (let i = 0; i < clientUuids.length; i += CHUNK) {
    const slice = clientUuids.slice(i, i + CHUNK);
    const placeholders = slice.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM pending_track_points WHERE client_uuid IN (${placeholders})`,
      slice,
    );
  }
}

// Reserved for the step-5 background task to surface pending counts in
// debug/diagnostics output. Not currently consumed by the foreground
// pipeline (the flush loop polls via bufferReadBatch directly).
export async function bufferCount(trackId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM pending_track_points WHERE track_id = ?`,
    [trackId],
  );
  return row?.c ?? 0;
}

export async function bufferListPendingTracks(): Promise<PendingTrackGroup[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    expeditionId: string;
    trackId: number;
    count: number;
  }>(`
    SELECT expedition_id as expeditionId,
           track_id as trackId,
           COUNT(*) as count
      FROM pending_track_points
      GROUP BY expedition_id, track_id
      ORDER BY MIN(recorded_at) ASC
  `);
  return rows;
}

/**
 * Drops rows older than the server's `recorded_at` sanity window. Run
 * periodically (e.g., on app launch) to keep the table from growing
 * indefinitely if a track was abandoned with the user logged out.
 */
export async function bufferPruneStale(): Promise<number> {
  const db = await getDb();
  const cutoff = Date.now() - STALE_POINT_MAX_AGE_MS;
  const result = await db.runAsync(
    `DELETE FROM pending_track_points WHERE created_at < ?`,
    [cutoff],
  );
  return result.changes ?? 0;
}

/** Test/dev helper — wipes the table. __DEV__-only at runtime. */
export async function bufferClearAll(): Promise<void> {
  if (!__DEV__) {
    throw new Error('bufferClearAll is a development-only helper');
  }
  const db = await getDb();
  await db.execAsync(`DELETE FROM pending_track_points`);
}
