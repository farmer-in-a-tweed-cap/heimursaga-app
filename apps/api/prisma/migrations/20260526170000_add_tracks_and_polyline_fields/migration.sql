-- Phase 1 live-tracking foundation.
-- 1) Extend Expedition with separate polyline visibility, the (Phase-2-populated)
--    planned polyline, the auto-snap radius (Phase-2-used), and widen the
--    current_location reference columns to fit the new 'live_track' source
--    type and BigInt TrackPoint ids.
-- 2) Add Track and TrackPoint tables.

ALTER TABLE "expeditions"
  ALTER COLUMN "current_location_type" TYPE VARCHAR(15),
  ALTER COLUMN "current_location_id" TYPE VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "live_track_visibility" VARCHAR(10) DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS "planned_polyline" JSONB,
  ADD COLUMN IF NOT EXISTS "snap_radius_m" INT DEFAULT 300;

-- Live tracking sessions. One row per start-to-stop interval.
CREATE TABLE "tracks" (
  "id"                SERIAL PRIMARY KEY,
  "expedition_id"     INT NOT NULL,
  "source"            VARCHAR(20) NOT NULL,
  "source_device_id"  VARCHAR(60),
  "started_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "ended_at"          TIMESTAMP,
  "last_heartbeat_at" TIMESTAMP,
  "created_at"        TIMESTAMP DEFAULT NOW(),
  "updated_at"        TIMESTAMP,
  "deleted_at"        TIMESTAMP,
  CONSTRAINT "tracks_expedition_id_fkey"
    FOREIGN KEY ("expedition_id") REFERENCES "expeditions"("id") ON DELETE CASCADE
);
CREATE INDEX "tracks_expedition_id_ended_at_idx" ON "tracks" ("expedition_id", "ended_at");
CREATE INDEX "tracks_source_device_id_ended_at_idx" ON "tracks" ("source_device_id", "ended_at");

-- Individual GPS pings. BigInt because volume scales with active users * duration.
CREATE TABLE "track_points" (
  "id"          BIGSERIAL PRIMARY KEY,
  "track_id"    INT NOT NULL,
  "recorded_at" TIMESTAMP NOT NULL,
  "received_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lat"         DOUBLE PRECISION NOT NULL,
  "lon"         DOUBLE PRECISION NOT NULL,
  "accuracy_m"  DOUBLE PRECISION,
  "speed_mps"   DOUBLE PRECISION,
  "altitude_m"  DOUBLE PRECISION,
  "battery_pct" INT,
  "client_uuid" VARCHAR(40),
  CONSTRAINT "track_points_track_id_fkey"
    FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE
);
CREATE INDEX "track_points_track_id_recorded_at_idx" ON "track_points" ("track_id", "recorded_at");

-- Idempotency for offline-buffer batch retries. Partial because client_uuid
-- is optional (server-inserted points won't have one). Prisma's @@unique
-- can't express the WHERE clause, so it lives here.
CREATE UNIQUE INDEX "track_points_track_id_client_uuid_unique"
  ON "track_points" ("track_id", "client_uuid")
  WHERE "client_uuid" IS NOT NULL;
