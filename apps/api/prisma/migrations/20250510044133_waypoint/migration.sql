/*
  Warnings:

  - You are about to drop the `trip_posts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "trip_posts" DROP CONSTRAINT "trip_posts_post_id_fkey";

-- DropForeignKey
ALTER TABLE "trip_posts" DROP CONSTRAINT "trip_posts_trip_id_fkey";

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "waypoint_id" INTEGER;

-- DropTable
DROP TABLE "trip_posts";

-- CreateTable
CREATE TABLE "waypoints" (
    "id" SERIAL NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "public" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_waypoints" (
    "waypoint_id" INTEGER NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_waypoints_pkey" PRIMARY KEY ("trip_id","waypoint_id")
);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_waypoint_id_fkey" FOREIGN KEY ("waypoint_id") REFERENCES "waypoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_waypoint_id_fkey" FOREIGN KEY ("waypoint_id") REFERENCES "waypoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_waypoints" ADD CONSTRAINT "trip_waypoints_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
