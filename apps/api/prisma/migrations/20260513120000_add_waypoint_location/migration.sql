-- Optional, user-entered place label for a waypoint (e.g., "Near Almaty,
-- Kazakhstan"). Distinct from the entry's place field — waypoints without
-- a linked entry need their own surface for this.

ALTER TABLE "waypoints" ADD COLUMN IF NOT EXISTS "location" VARCHAR(150);
