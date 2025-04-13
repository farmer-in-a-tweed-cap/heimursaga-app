/*
  Warnings:

  - You are about to drop the column `bookmarksCount` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `likesCount` on the `posts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "posts" DROP COLUMN "bookmarksCount",
DROP COLUMN "likesCount",
ADD COLUMN     "bookmarks_count" INTEGER DEFAULT 0,
ADD COLUMN     "likes_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bookmarks_count" INTEGER DEFAULT 0,
ADD COLUMN     "followers_count" INTEGER DEFAULT 0,
ADD COLUMN     "following_count" INTEGER DEFAULT 0,
ADD COLUMN     "posts_count" INTEGER DEFAULT 0;
