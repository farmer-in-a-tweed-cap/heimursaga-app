-- Add views_count to posts table
ALTER TABLE "posts" ADD COLUMN "views_count" INTEGER DEFAULT 0;

-- Create entry_views table for tracking unique viewers
CREATE TABLE "entry_views" (
    "id" SERIAL NOT NULL,
    "entry_id" INTEGER NOT NULL,
    "viewer_id" INTEGER,
    "viewer_ip" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_views_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "entry_views_entry_id_idx" ON "entry_views"("entry_id");
CREATE INDEX "entry_views_viewer_id_idx" ON "entry_views"("viewer_id");
CREATE INDEX "entry_views_created_at_idx" ON "entry_views"("created_at");

-- Create unique constraints for deduplication
CREATE UNIQUE INDEX "unique_user_view" ON "entry_views"("entry_id", "viewer_id") WHERE "viewer_id" IS NOT NULL;
CREATE UNIQUE INDEX "unique_ip_view" ON "entry_views"("entry_id", "viewer_ip") WHERE "viewer_ip" IS NOT NULL;

-- Add foreign keys
ALTER TABLE "entry_views" ADD CONSTRAINT "entry_views_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entry_views" ADD CONSTRAINT "entry_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
