/*
  Warnings:

  - You are about to alter the column `type` on the `sponsorships` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE "sponsorships" ADD COLUMN     "message" VARCHAR(500),
ALTER COLUMN "type" SET DATA TYPE VARCHAR(50);
