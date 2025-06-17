-- AlterTable
ALTER TABLE "waypoints" ADD COLUMN     "author_id" INTEGER;

-- AddForeignKey
ALTER TABLE "waypoints" ADD CONSTRAINT "waypoints_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
