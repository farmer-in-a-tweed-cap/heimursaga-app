-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "draft" BOOLEAN DEFAULT false,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lon" DOUBLE PRECISION,
ADD COLUMN     "place" CHAR(250),
ADD COLUMN     "public" BOOLEAN DEFAULT false,
ADD COLUMN     "public_id" CHAR(14);

-- AlterTable
ALTER TABLE "uploads" ADD COLUMN     "post_id" INTEGER;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
