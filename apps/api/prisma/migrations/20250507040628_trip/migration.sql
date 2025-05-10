-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "trip_id" INTEGER;

-- CreateTable
CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "public" BOOLEAN DEFAULT false,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
