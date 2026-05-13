-- Add URL slug to posts (entries) and trips (expeditions). Slugs are
-- nullable initially so the column can ship before the backfill runs.
-- Backfill via tools/backfill-slugs.js, then new writes set slug at
-- create time. Lookups accept either slug or public_id.

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(120);
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_key" ON "posts"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "trips_slug_key" ON "trips"("slug");
