/*
  Warnings:

  - You are about to drop the column `is_creator` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_creator",
ADD COLUMN     "is_stripe_account_connected" BOOLEAN DEFAULT false,
ADD COLUMN     "stripe_account_id" VARCHAR(40);
