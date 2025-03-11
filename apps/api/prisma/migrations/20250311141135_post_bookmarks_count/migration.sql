/*
  Warnings:

  - You are about to drop the column `bookmarkCount` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "bookmarkCount",
ADD COLUMN     "bookmarksCount" INTEGER NOT NULL DEFAULT 0;
