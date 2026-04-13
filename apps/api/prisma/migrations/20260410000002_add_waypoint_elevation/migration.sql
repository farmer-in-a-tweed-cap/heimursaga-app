-- Per-waypoint elevation in metres above sea level.
-- Populated automatically from Open Meteo when waypoints are synced in the
-- Expedition Builder, or from the <ele> tag of an imported GPX/GeoJSON file.
-- Nullable because legacy waypoints predate this column and will be backfilled
-- lazily on their next sync.
ALTER TABLE "waypoints" ADD COLUMN "elevation_m" DOUBLE PRECISION;
