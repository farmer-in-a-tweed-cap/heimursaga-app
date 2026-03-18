-- DropForeignKey
ALTER TABLE "flags" DROP CONSTRAINT "flags_flagged_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "flags" DROP CONSTRAINT "flags_flagged_post_id_fkey";

-- DropForeignKey
ALTER TABLE "sponsorship_tiers" DROP CONSTRAINT "sponsorship_tiers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "sponsorships" DROP CONSTRAINT "sponsorships_tier_id_fkey";

-- CreateIndex
CREATE INDEX "checkouts_user_id_idx" ON "checkouts"("user_id");

-- CreateIndex
CREATE INDEX "expedition_notes_expedition_id_idx" ON "expedition_notes"("expedition_id");

-- CreateIndex
CREATE INDEX "payouts_user_id_idx" ON "payouts"("user_id");

-- CreateIndex
CREATE INDEX "sponsorship_tiers_user_id_idx" ON "sponsorship_tiers"("user_id");

-- CreateIndex
CREATE INDEX "sponsorships_expedition_public_id_idx" ON "sponsorships"("expedition_public_id");

-- CreateIndex
CREATE UNIQUE INDEX "trips_public_id_key" ON "trips"("public_id");

-- CreateIndex
CREATE INDEX "uploads_user_id_idx" ON "uploads"("user_id");

-- CreateIndex
CREATE INDEX "user_notifications_user_id_idx" ON "user_notifications"("user_id");

-- CreateIndex
CREATE INDEX "waypoints_author_id_idx" ON "waypoints"("author_id");

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "sponsorship_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_tiers" ADD CONSTRAINT "sponsorship_tiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_flagged_post_id_fkey" FOREIGN KEY ("flagged_post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_flagged_comment_id_fkey" FOREIGN KEY ("flagged_comment_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
