/*
  Warnings:

  - You are about to drop the column `membersCount` on the `sponsorship_tiers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sponsorship_tiers" DROP COLUMN "membersCount",
ADD COLUMN     "members_count" INTEGER DEFAULT 0;
