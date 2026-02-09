-- Add performance indexes for frequently queried fields

-- Explorer indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users"("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "users_stripe_account_id_idx" ON "users"("stripe_account_id");

-- Entry indexes for journal queries and listing
CREATE INDEX IF NOT EXISTS "posts_author_id_created_at_idx" ON "posts"("author_id", "created_at");
CREATE INDEX IF NOT EXISTS "posts_public_id_idx" ON "posts"("public_id");
CREATE INDEX IF NOT EXISTS "posts_public_deleted_at_idx" ON "posts"("public", "deleted_at");

-- Expedition indexes for listing and detail pages
CREATE INDEX IF NOT EXISTS "trips_public_id_idx" ON "trips"("public_id");
CREATE INDEX IF NOT EXISTS "trips_author_id_idx" ON "trips"("author_id");
CREATE INDEX IF NOT EXISTS "trips_status_deleted_at_idx" ON "trips"("status", "deleted_at");
CREATE INDEX IF NOT EXISTS "trips_public_deleted_at_idx" ON "trips"("public", "deleted_at");
