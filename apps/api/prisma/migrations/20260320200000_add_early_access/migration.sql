-- Add early access toggle to expeditions
ALTER TABLE "trips" ADD COLUMN "early_access_enabled" BOOLEAN DEFAULT false;

-- Add published_at to entries (if not already added by previous migration)
-- This is idempotent - will only add if column doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'published_at') THEN
    ALTER TABLE "posts" ADD COLUMN "published_at" TIMESTAMP(3);
    UPDATE "posts" SET "published_at" = "created_at" WHERE "is_draft" = false AND "published_at" IS NULL;
  END IF;
END $$;
