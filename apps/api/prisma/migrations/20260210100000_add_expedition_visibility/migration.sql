-- AlterTable
ALTER TABLE "trips" ADD COLUMN "visibility" VARCHAR(10) DEFAULT 'public';

-- Backfill from existing public column
UPDATE "trips" SET "visibility" = CASE WHEN "public" = false THEN 'private' ELSE 'public' END;

-- CreateIndex
CREATE INDEX "trips_visibility_deleted_at_idx" ON "trips"("visibility", "deleted_at");
