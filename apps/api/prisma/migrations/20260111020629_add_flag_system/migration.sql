-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "flags_count" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "flags_count" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "flags" (
    "id" SERIAL NOT NULL,
    "public_id" VARCHAR(14) NOT NULL,
    "flagged_post_id" INTEGER,
    "flagged_comment_id" INTEGER,
    "category" VARCHAR(50) NOT NULL,
    "description" VARCHAR(1000),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reporter_id" INTEGER NOT NULL,
    "reviewed_by_id" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "admin_notes" VARCHAR(1000),
    "action_taken" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flags_public_id_key" ON "flags"("public_id");

-- CreateIndex
CREATE INDEX "flags_status_created_at_idx" ON "flags"("status", "created_at");

-- CreateIndex
CREATE INDEX "flags_reporter_id_idx" ON "flags"("reporter_id");

-- CreateIndex
CREATE INDEX "flags_flagged_post_id_idx" ON "flags"("flagged_post_id");

-- CreateIndex
CREATE INDEX "flags_flagged_comment_id_idx" ON "flags"("flagged_comment_id");

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_flagged_post_id_fkey" FOREIGN KEY ("flagged_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_flagged_comment_id_fkey" FOREIGN KEY ("flagged_comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
