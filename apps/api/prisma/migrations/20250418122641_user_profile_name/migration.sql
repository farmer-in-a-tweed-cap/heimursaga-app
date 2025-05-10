/*
  Warnings:

  - You are about to drop the column `first_name` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "first_name",
DROP COLUMN "last_name",
ADD COLUMN     "name" VARCHAR(50);
