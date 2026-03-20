-- Add published_at field for early access feature
-- Distinct from created_at (which fires on draft creation)
-- Set when entry transitions from draft to published, or on direct publish
ALTER TABLE "posts" ADD COLUMN "published_at" TIMESTAMP(3);

-- Backfill: set published_at = created_at for all existing published entries
UPDATE "posts" SET "published_at" = "created_at" WHERE "is_draft" = false AND "published_at" IS NULL;
