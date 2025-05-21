-- AlterTable
ALTER TABLE "sponsorship_tiers" ADD COLUMN     "membersCount" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "sponsorships" ADD COLUMN     "expiry" TIMESTAMP(3),
ADD COLUMN     "next_charge" TIMESTAMP(3),
ADD COLUMN     "tier_id" INTEGER;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "sponsorship_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
