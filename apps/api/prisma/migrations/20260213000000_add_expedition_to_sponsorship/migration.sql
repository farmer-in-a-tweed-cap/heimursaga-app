-- AlterTable
ALTER TABLE "sponsorships" ADD COLUMN "expedition_public_id" VARCHAR(14);

-- AlterTable
ALTER TABLE "checkouts" ADD COLUMN "expedition_public_id" VARCHAR(14);
