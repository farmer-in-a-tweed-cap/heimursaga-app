/*
  Warnings:

  - You are about to drop the column `trip_id` on the `posts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_trip_id_fkey";

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "trip_id";

-- CreateTable
CREATE TABLE "trip_posts" (
    "post_id" INTEGER NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_posts_pkey" PRIMARY KEY ("post_id","trip_id")
);

-- AddForeignKey
ALTER TABLE "trip_posts" ADD CONSTRAINT "trip_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_posts" ADD CONSTRAINT "trip_posts_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
