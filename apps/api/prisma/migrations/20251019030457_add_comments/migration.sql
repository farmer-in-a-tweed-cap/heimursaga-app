-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "comments_count" INTEGER DEFAULT 0,
ADD COLUMN     "comments_enabled" BOOLEAN DEFAULT true;

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "content" VARCHAR(5000) NOT NULL,
    "author_id" INTEGER NOT NULL,
    "post_id" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comments_public_id_key" ON "comments"("public_id");

-- CreateIndex
CREATE INDEX "comments_post_id_created_at_idx" ON "comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
