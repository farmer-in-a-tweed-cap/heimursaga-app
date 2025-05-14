/*
  Warnings:

  - You are about to drop the column `transactionType` on the `checkouts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "checkouts" DROP COLUMN "transactionType",
ADD COLUMN     "sponsorship_type" TEXT,
ADD COLUMN     "transaction_type" TEXT;
