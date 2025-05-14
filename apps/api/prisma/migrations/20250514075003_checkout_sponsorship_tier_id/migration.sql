/*
  Warnings:

  - You are about to drop the column `userId` on the `checkouts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "checkouts" DROP CONSTRAINT "checkouts_userId_fkey";

-- AlterTable
ALTER TABLE "checkouts" DROP COLUMN "userId",
ADD COLUMN     "sponsorship_tier_id" INTEGER;
