/*
  Warnings:

  - You are about to drop the column `post_id` on the `uploads` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "uploads" DROP CONSTRAINT "uploads_post_id_fkey";

-- AlterTable
ALTER TABLE "uploads" DROP COLUMN "post_id";

-- CreateTable
CREATE TABLE "post_media" (
    "post_id" INTEGER NOT NULL,
    "upload_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("post_id","upload_id")
);

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
