-- Add quick sponsor fields to entries (posts table)
ALTER TABLE "posts" ADD COLUMN "quick_sponsors_count" INTEGER DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN "quick_sponsors_total" INTEGER DEFAULT 0;

-- Make public_id unique on posts (was only indexed before)
CREATE UNIQUE INDEX "posts_public_id_key" ON "posts"("public_id");
-- Drop the old non-unique index if it exists
DROP INDEX IF EXISTS "posts_public_id_idx";

-- Add entry_public_id to sponsorships for quick sponsor tracking
ALTER TABLE "sponsorships" ADD COLUMN "entry_public_id" VARCHAR(14);
CREATE INDEX "sponsorships_entry_public_id_idx" ON "sponsorships"("entry_public_id");
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_entry_public_id_fkey" FOREIGN KEY ("entry_public_id") REFERENCES "posts"("public_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add entry_public_id to checkouts for quick sponsor tracking
ALTER TABLE "checkouts" ADD COLUMN "entry_public_id" VARCHAR(14);
