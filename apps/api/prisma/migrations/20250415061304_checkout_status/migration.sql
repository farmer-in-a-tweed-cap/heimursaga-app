/*
  Warnings:

  - The `status` column on the `checkouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "checkouts" DROP COLUMN "status",
ADD COLUMN     "status" TEXT DEFAULT 'pending';
