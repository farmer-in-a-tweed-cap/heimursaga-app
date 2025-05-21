-- AlterTable
ALTER TABLE "payout_methods" ADD COLUMN     "currency" TEXT;

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "currency" TEXT;

-- AlterTable
ALTER TABLE "sponsorships" ADD COLUMN     "stripe_subscription_id" VARCHAR(30);
